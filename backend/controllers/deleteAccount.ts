import type { AuthContext } from "../types";
import { prisma } from "../config/db";
import { requestAccountDeletion } from "../services/accountDeletion";
import { logError } from "../logger";

export default async function deleteAccount(c: AuthContext) {
  const userId = c.get("userId");
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { clerkId: true },
    });
    if (!user) {
      return c.json({ success: false, message: "Account not found." }, 404);
    }

    await requestAccountDeletion(userId, user.clerkId);
    return c.json({
      success: true,
      message: "Your account data has been deleted. Identity cleanup is processing and will retry if needed.",
    }, 202);
  } catch (error) {
    logError("account.deletion_request_failed", error);
    return c.json({ success: false, message: "Unable to delete this account right now." }, 500);
  }
}
