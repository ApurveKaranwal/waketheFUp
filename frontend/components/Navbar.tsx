"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { UserButton, Show, SignInButton } from "@clerk/nextjs";

export default function Navbar() {
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <header className="border-b border-black dark:border-zinc-800 bg-white dark:bg-black sticky top-0 z-50 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-mono font-bold tracking-tight text-lg text-black dark:text-white group"
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center group-hover:scale-125 transition-transform">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </span>
            <span>WTFup</span>
            <span className="text-[10px] font-normal uppercase tracking-widest text-zinc-500 border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.2">
              v0.1
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-4 text-xs font-mono">
            <Link
              href="/dashboard"
              className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
            >
              /dashboard
            </Link>
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {hasClerkKey ? (
            <div className="flex items-center gap-2">
              <Show when="signed-in">
                <div className="flex items-center gap-2.5">
                  <Link
                    href="/settings"
                    className="text-xs font-mono text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                  >
                    Settings
                  </Link>
                  <div className="flex items-center justify-center">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "w-6 h-6 rounded-full border border-black dark:border-zinc-600",
                        },
                      }}
                    />
                  </div>
                </div>
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="px-3 py-1.5 text-xs font-mono font-medium bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-85 transition-opacity">
                    Sign In
                  </button>
                </SignInButton>
              </Show>
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="px-3 py-1.5 text-xs font-mono font-medium bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-85 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
