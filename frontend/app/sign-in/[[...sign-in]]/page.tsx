import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { KeyRound, ArrowRight } from "lucide-react";

export default function SignInPage() {
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {hasClerkKey ? (
        <div className="w-full max-w-md border border-black dark:border-zinc-800 p-6 sm:p-8 bg-white dark:bg-black font-mono">
          <div className="mb-6 text-center space-y-1">
            <h1 className="text-xl font-bold uppercase tracking-tight">Sign In to WTFup</h1>
            <p className="text-xs text-zinc-500">Sign in using the methods enabled for this application.</p>
          </div>
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 p-0 bg-transparent text-black dark:text-white",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "rounded-none border border-black dark:border-zinc-700 bg-transparent text-black dark:text-white font-mono text-xs hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors py-2.5",
                socialButtonsBlockButtonText: "font-mono text-xs text-black dark:text-white font-medium",
                socialButtonsProviderIcon: "w-4 h-4",
                dividerLine: "bg-black dark:bg-zinc-800",
                dividerText: "font-mono text-[10px] text-zinc-500 uppercase bg-white dark:bg-black px-2",
                formButtonPrimary:
                  "bg-black dark:bg-white text-white dark:text-black font-mono text-xs uppercase rounded-none hover:opacity-90 py-2.5",
                formFieldInput:
                  "rounded-none border border-black dark:border-zinc-700 bg-transparent text-black dark:text-white font-mono text-xs focus:ring-0 focus:border-black dark:focus:border-white py-2",
                formFieldLabel: "font-mono text-xs uppercase text-zinc-600 dark:text-zinc-400 font-bold",
                footerActionLink: "font-mono text-xs text-black dark:text-white underline hover:opacity-80",
                identityPreviewText: "font-mono text-xs text-black dark:text-white",
                identityPreviewEditButton: "font-mono text-xs text-black dark:text-white underline",
              },
            }}
          />
        </div>
      ) : (
        <div className="w-full max-w-md border border-black dark:border-zinc-800 p-8 space-y-6 font-mono bg-white dark:bg-black">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-black dark:text-white" />
            <h1 className="text-base font-bold uppercase">Clerk Setup Required</h1>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Authentication is ready to go via Clerk. To activate it, simply paste your Clerk publishable key into <code className="bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 border border-zinc-300 dark:border-zinc-700">frontend/.env.local</code>:
          </p>

          <pre className="p-3 text-[11px] bg-zinc-100 dark:bg-zinc-900 border border-black dark:border-zinc-800 overflow-x-auto">
{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...`}
          </pre>

          <div className="pt-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold uppercase bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-85 transition-opacity"
            >
              <span>Back to home</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
