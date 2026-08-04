import { authResponse, getCurrentUser, ownerExists } from "../../../auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [user, hasOwner] = await Promise.all([getCurrentUser(), ownerExists()]);
    return Response.json(authResponse(user, !hasOwner));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load account";
    return Response.json({ error: message }, { status: 500 });
  }
}
