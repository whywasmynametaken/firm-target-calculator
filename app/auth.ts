import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { appUsers } from "../db/schema";

export type AppRole = "owner" | "editor" | "viewer";

export type AppUser = {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
};

const OWNER_EMAIL = "drewbo17@gmail.com";
const SESSION_COOKIE = "firm_target_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const PASSWORD_ITERATIONS = 210000;

type RuntimeEnv = {
  AUTH_SECRET?: string;
  OWNER_SETUP_CODE?: string;
};

function runtimeEnv() {
  return env as RuntimeEnv;
}

export function ownerEmail() {
  return OWNER_EMAIL;
}

export function canEdit(user: AppUser | null) {
  return user?.role === "owner" || user?.role === "editor";
}

export async function ownerExists() {
  const db = getDb();
  const [owner] = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.role, "owner"))
    .limit(1);
  return Boolean(owner);
}

export async function createOwner({
  email,
  name,
  password,
  setupCode,
}: {
  email: string;
  name: string;
  password: string;
  setupCode: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail !== OWNER_EMAIL) {
    throw new AuthError("Use the configured owner email for setup.", 403);
  }
  if (!setupCode || setupCode !== runtimeEnv().OWNER_SETUP_CODE) {
    throw new AuthError("Setup code is incorrect.", 403);
  }
  if (await ownerExists()) {
    throw new AuthError("Owner account is already set up.", 409);
  }

  const passwordRecord = await hashPassword(password);
  const user = {
    id: id("user"),
    email: normalizedEmail,
    name: name.trim() || null,
    role: "owner" as AppRole,
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
    passwordIterations: passwordRecord.iterations,
    updatedAt: new Date().toISOString(),
  };

  const db = getDb();
  await db.insert(appUsers).values(user);
  return toAppUser(user);
}

export async function authenticate(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const db = getDb();
  const [user] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, normalizedEmail))
    .limit(1);

  if (!user) throw new AuthError("Invalid email or password.", 401);
  const ok = await verifyPassword({
    password,
    salt: user.passwordSalt,
    hash: user.passwordHash,
    iterations: user.passwordIterations,
  });
  if (!ok) throw new AuthError("Invalid email or password.", 401);
  return toAppUser(user);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const db = getDb();
  const [user] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.id, session.userId))
    .limit(1);

  return user ? toAppUser(user) : null;
}

export async function setSessionCookie(user: AppUser) {
  const cookieStore = await cookies();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await signSessionToken(user.id, expiresAt);
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
}

export function authResponse(user: AppUser | null, setupRequired: boolean) {
  return {
    user,
    isEditor: canEdit(user),
    setupRequired,
  };
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toAppUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: string;
}): AppUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role === "owner" || user.role === "editor" ? user.role : "viewer",
  };
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function hashPassword(password: string) {
  if (password.length < 10) {
    throw new AuthError("Use a password with at least 10 characters.", 400);
  }
  const salt = randomBase64Url(16);
  const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
  return { hash, salt, iterations: PASSWORD_ITERATIONS };
}

async function verifyPassword({
  password,
  salt,
  hash,
  iterations,
}: {
  password: string;
  salt: string;
  hash: string;
  iterations: number;
}) {
  const candidate = await derivePasswordHash(password, salt, iterations);
  return timingSafeEqual(candidate, hash);
}

async function derivePasswordHash(
  password: string,
  salt: string,
  iterations: number,
) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64UrlToBytes(salt),
      iterations,
    },
    keyMaterial,
    256,
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

async function signSessionToken(userId: string, expiresAt: number) {
  const payload = `${userId}.${expiresAt}.${randomBase64Url(12)}`;
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

async function verifySessionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const payload = parts.slice(0, 3).join(".");
  const signature = parts[3];
  const expected = await hmac(payload);
  if (!timingSafeEqual(signature, expected)) return null;

  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return { userId: parts[0] };
}

async function hmac(payload: string) {
  const secret = runtimeEnv().AUTH_SECRET;
  if (!secret) throw new AuthError("Authentication is not configured.", 500);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
  }
  return diff === 0;
}

function randomBase64Url(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
