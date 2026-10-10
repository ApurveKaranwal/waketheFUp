import { createClerkClient, verifyToken } from "@clerk/backend";
import { createMiddleware } from "hono/factory";
import { prisma } from "./config/db";
import type { AuthEnv } from "./types";
import { logError } from "./logger";

export const requireUser = createMiddleware<AuthEnv>(
  async (c, next) => {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return c.json({ success: false, message: "Authentication is not configured." }, 503);
    }

    const authorization = c.req.header("Authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return c.json({ success: false, message: "Authentication required." }, 401);
    }

    let clerkId: string;
    try {
      const authorizedParties = (process.env.CORS_ORIGINS || "http://localhost:3000")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const claims = await verifyToken(token, { secretKey, authorizedParties });
      if (typeof claims.sub !== "string" || claims.sub.length === 0) {
        return c.json({ success: false, message: "Invalid authentication token." }, 401);
      }
      clerkId = claims.sub;
    } catch {
      return c.json({ success: false, message: "Invalid or expired authentication token." }, 401);
    }

    let userId: string;
    try {
      const deletion = await prisma.accountDeletion.findUnique({
        where: { clerkId },
        select: { clerkId: true },
      });
      if (deletion) {
        return c.json({ success: false, message: "This account has been deleted." }, 410);
      }

      let user = await prisma.user.findUnique({ where: { clerkId } });
      if (!user) {
        const clerk = createClerkClient({ secretKey });
        const profile = await clerk.users.getUser(clerkId);
        const primaryEmail = profile.primaryEmailAddress ?? profile.emailAddresses.find(
          (e) => e.id === profile.primaryEmailAddressId
        );
        const email = primaryEmail?.verification?.status === "verified"
          ? primaryEmail.emailAddress
          : (primaryEmail?.emailAddress ?? profile.emailAddresses[0]?.emailAddress);
        if (!email) {
          return c.json({ success: false, message: "Your account needs an email address." }, 403);
        }
        const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || email;
        user = await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(0, hashtext(${clerkId}))`;
          const deletionRequested = await tx.accountDeletion.findUnique({
            where: { clerkId },
            select: { clerkId: true },
          });
          if (deletionRequested) return null;
          return tx.user.upsert({
            where: { clerkId },
            create: { clerkId, email, name },
            update: { email, name },
          });
        });
        if (!user) {
          return c.json({ success: false, message: "This account has been deleted." }, 410);
        }
      }

      userId = user.id;
    } catch (error) {
      logError("auth.user_resolution_failed", error);
      return c.json({ success: false, message: "Unable to load your account." }, 500);
    }

    c.set("userId", userId);
    await next();
  },
);
