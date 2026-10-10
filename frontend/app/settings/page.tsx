"use client";

import { useState, type FormEvent } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { AlertCircle, Loader2, ShieldAlert } from "lucide-react";
import { deleteAccount } from "@/lib/api";

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmation !== "DELETE") return;
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in again before deleting your account.");
      await deleteAccount(token);
      await signOut().catch(() => undefined);
      window.location.replace("/");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to delete your account.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 font-mono">
      <header className="border-b border-black dark:border-zinc-800 pb-5">
        <h1 className="text-xl font-bold uppercase tracking-tight">Account settings</h1>
        <p className="mt-1 text-xs text-zinc-500">Manage your WTFup account and data.</p>
      </header>

      <section className="space-y-4 border border-red-600 p-5" aria-labelledby="delete-account-heading">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <ShieldAlert className="h-5 w-5" />
          <h2 id="delete-account-heading" className="font-bold uppercase">Delete account and monitoring data</h2>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          This permanently deletes your monitors, check history, and alert records. Your Clerk sign-in identity is also queued for deletion. This action cannot be undone.
        </p>

        {error && (
          <div role="alert" className="flex items-start gap-2 border border-red-500 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleDelete} className="space-y-3">
          <label htmlFor="delete-confirmation" className="block text-xs font-bold uppercase">Type DELETE to confirm</label>
          <input
            id="delete-confirmation"
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            className="w-full border border-black bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
          <button
            type="submit"
            disabled={loading || confirmation !== "DELETE"}
            className="inline-flex items-center gap-2 border border-red-600 bg-red-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Permanently delete my account
          </button>
        </form>
      </section>
    </div>
  );
}
