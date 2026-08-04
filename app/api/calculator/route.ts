import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { calculatorStates } from "../../../db/schema";
import { authResponse, canEdit, getCurrentUser, ownerExists } from "../../auth";

export const dynamic = "force-dynamic";

const STATE_ID = "main";

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
    const [user, hasOwner, stored] = await Promise.all([
      getCurrentUser(),
      ownerExists(),
      readStoredState(),
    ]);

    return Response.json({
      ...stored,
      ...authResponse(user, !hasOwner),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load calculator";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!canEdit(user)) {
      return Response.json({ error: "Only editors can edit this calculator." }, { status: 403 });
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
      ...authResponse(user, !(await ownerExists())),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save calculator";
    return Response.json({ error: message }, { status: 500 });
  }
}
