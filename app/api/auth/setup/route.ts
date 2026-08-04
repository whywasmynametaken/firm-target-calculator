import {
  AuthError,
  authResponse,
  createOwner,
  ownerExists,
  setSessionCookie,
} from "../../../auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (await ownerExists()) {
      throw new AuthError("Owner account is already set up.", 409);
    }

    const payload = (await request.json()) as {
      email?: string;
      name?: string;
      password?: string;
      setupCode?: string;
    };
    const user = await createOwner({
      email: payload.email ?? "",
      name: payload.name ?? "",
      password: payload.password ?? "",
      setupCode: payload.setupCode ?? "",
    });
    await setSessionCookie(user);
    return Response.json(authResponse(user, false), { status: 201 });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to set up owner";
    return Response.json({ error: message }, { status });
  }
}
