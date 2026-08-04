import {
  AuthError,
  authResponse,
  authenticate,
  ownerExists,
  setSessionCookie,
} from "../../../auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string; password?: string };
    const user = await authenticate(payload.email ?? "", payload.password ?? "");
    await setSessionCookie(user);
    return Response.json(authResponse(user, !(await ownerExists())));
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to sign in";
    return Response.json({ error: message }, { status });
  }
}
