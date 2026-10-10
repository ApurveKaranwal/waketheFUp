import type { Context } from "hono";

export type AuthEnv = { Variables: { userId: string } };
export type AuthContext = Context<AuthEnv>;
