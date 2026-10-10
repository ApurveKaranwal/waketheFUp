import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WTFup - Wake The F*** Up | Relentless Uptime Monitoring",
  description: "Monitor public HTTP and HTTPS endpoints with scheduled checks, incident history, and email outage and recovery alerts.",
};

const themeScript = `
  (function() {
    try {
      var saved = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (!saved && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-white text-black dark:bg-black dark:text-white flex flex-col font-sans transition-colors">
        <ToastProvider>
          <Navbar />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>
          <footer className="border-t border-black dark:border-zinc-800 py-6 text-center text-xs font-mono text-zinc-500">
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>WTFup Monitoring</span>
              <span>Scheduled HTTP(S) checks with incident email alerts.</span>
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );

  if (publishableKey) {
    return <ClerkProvider publishableKey={publishableKey}>{content}</ClerkProvider>;
  }

  return content;
}
