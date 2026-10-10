import Link from "next/link";
import { ArrowRight, Check, ShieldAlert, Zap, Clock, Bell } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-16 py-6 sm:py-12">
      {/* Hero Section */}
      <section className="space-y-6 max-w-3xl">
        <div className="inline-flex items-center gap-2 border border-black dark:border-white px-2.5 py-1 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>OPEN SOURCE UPTIME MONITORING</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-mono uppercase text-black dark:text-white leading-[1.08]">
          Wake The F*** Up.
        </h1>

        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-mono leading-relaxed max-w-2xl">
          Monitor public HTTP and HTTPS endpoints on 30, 60, or 300 second intervals. Get email alerts after an outage is confirmed and when service recovers.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 text-sm font-mono font-bold bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-90 transition-opacity"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/sign-up"
            className="px-6 py-3 text-sm font-mono border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            Get started
          </Link>
        </div>
      </section>

      {/* Availability summary */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            [ Monitoring at a glance ]
          </h2>
        </div>

        <div className="border border-black dark:border-zinc-800 divide-y divide-black dark:divide-zinc-800 font-mono text-xs">
          <div className="grid grid-cols-12 bg-zinc-100 dark:bg-zinc-950 p-3 font-bold">
            <div className="col-span-5 sm:col-span-4 uppercase">Capability</div>
            <div className="col-span-3 sm:col-span-3 uppercase text-black dark:text-white">WTFup</div>
            <div className="col-span-4 sm:col-span-5 uppercase text-zinc-500">Behavior</div>
          </div>

          <div className="grid grid-cols-12 p-3 items-center">
            <div className="col-span-5 sm:col-span-4 font-medium">Check intervals</div>
            <div className="col-span-3 sm:col-span-3 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /><span>30, 60, 300 sec</span></div>
            <div className="col-span-4 sm:col-span-5 text-zinc-500">Choose an interval for each monitor.</div>
          </div>

          <div className="grid grid-cols-12 p-3 items-center">
            <div className="col-span-5 sm:col-span-4 font-medium">Outage alerts</div>
            <div className="col-span-3 sm:col-span-3 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /><span>Email</span></div>
            <div className="col-span-4 sm:col-span-5 text-zinc-500">Sent after three failed checks; recovery is reported.</div>
          </div>

          <div className="grid grid-cols-12 p-3 items-center">
            <div className="col-span-5 sm:col-span-4 font-medium">Recent check history</div>
            <div className="col-span-3 sm:col-span-3 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /><span>Available</span></div>
            <div className="col-span-4 sm:col-span-5 text-zinc-500">Review recent HTTP status and response times.</div>
          </div>
        </div>
      </section>

      {/* Feature Blocks */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
          [ Core Capabilities ]
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono">
          <div className="border border-black dark:border-zinc-800 p-5 space-y-2">
            <Zap className="w-5 h-5 text-black dark:text-white" />
            <h3 className="font-bold text-sm">Scheduled Checks</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Check public endpoints on your selected 30, 60, or 300 second interval.
            </p>
          </div>

          <div className="border border-black dark:border-zinc-800 p-5 space-y-2">
            <Clock className="w-5 h-5 text-black dark:text-white" />
            <h3 className="font-bold text-sm">Response Latency</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              See total check time, including DNS resolution and connection setup.
            </p>
          </div>

          <div className="border border-black dark:border-zinc-800 p-5 space-y-2">
            <Bell className="w-5 h-5 text-black dark:text-white" />
            <h3 className="font-bold text-sm">Failure Detection</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Confirms an outage after three consecutive failed checks and records incident history.
            </p>
          </div>

          <div className="border border-black dark:border-zinc-800 p-5 space-y-2">
            <ShieldAlert className="w-5 h-5 text-black dark:text-white" />
            <h3 className="font-bold text-sm">Pause Anytime</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              One-click toggle removes or upserts the Redis scheduler on demand.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border border-black dark:border-zinc-800 p-8 text-center space-y-4 font-mono">
        <h2 className="text-2xl font-bold tracking-tight">Ready to monitor your services?</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
          Add any HTTP/HTTPS endpoint. Choose 30, 60, or 300 seconds. We will take care of the rest.
        </p>
        <div className="pt-2">
          <Link
            href="/sign-up"
            className="inline-block px-8 py-3 text-sm font-bold bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-85 transition-opacity"
          >
            Start Monitoring Now
          </Link>
        </div>
      </section>
    </div>
  );
}
