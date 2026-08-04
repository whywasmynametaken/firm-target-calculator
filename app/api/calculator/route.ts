import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { calculatorStates } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

const STATE_ID = "main";
const EDITOR_EMAIL = "drewbo17@gmail.com";

type CalculatorState = {
  expenses: unknown[];
  employees: unknown[];
  profitMargin: number;
  scenarios: unknown[];
};

const starterState: CalculatorState = {
  expenses: [],
  employees: [],
  profitMargin: 20,
  scenarios: [],
};

function isEditorEmail(email: string | null | undefined) {
  return email?.toLowerCase() === EDITOR_EMAIL;
}

function fallbackState(value: unknown): CalculatorState {
  const state = value as Partial<CalculatorState> | null;
  return {
    expenses: Array.isArray(state?.expenses) ? state.expenses : [],
    employees: Array.isArray(state?.employees) ? state.employees : [],
    profitMargin:
      typeof state?.profitMargin === "number" && Number.isFinite(state.profitMargin)
        ? state.profitMargin
        : 20,
    scenarios: Array.isArray(state?.scenarios) ? state.scenarios : [],
  };
}

async function readStoredState() {
  const db = getDb();
  const [row] = await db
    .select()
    .from(calculatorStates)
    .where(eq(calculatorStates.id, STATE_ID))
    .limit(1);

  if (!row) {
    return {
      initialized: false,
      state: starterState,
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    initialized: true,
    state: fallbackState(JSON.parse(row.data)),
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export async function GET() {
  try {
    const user = await getChatGPTUser();
    const stored = await readStoredState();

    return Response.json({
      ...stored,
      isEditor: isEditorEmail(user?.email),
      user: user ? { email: user.email, displayName: user.displayName } : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load calculator";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!isEditorEmail(user?.email)) {
      return Response.json({ error: "Only the owner can edit this calculator." }, { status: 403 });
    }

    const payload = fallbackState(await request.json());
    const db = getDb();
    const data = JSON.stringify(payload);
    const now = new Date().toISOString();

    await db
      .insert(calculatorStates)
      .values({
        id: STATE_ID,
        data,
        updatedAt: now,
        updatedBy: user.email,
      })
      .onConflictDoUpdate({
        target: calculatorStates.id,
        set: {
          data,
          updatedAt: now,
          updatedBy: user.email,
        },
      });

    return Response.json({
      initialized: true,
      state: payload,
      updatedAt: now,
      updatedBy: user.email,
      isEditor: true,
      user: { email: user.email, displayName: user.displayName },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save calculator";
    return Response.json({ error: message }, { status: 500 });
  }
}
