import demoSummary from "@/data/demo-summary.json"
import { Activity } from "lucide-react"

import { AgentProfiles } from "./components/AgentProfiles"
import { TransactionLedger } from "./components/TransactionLedger"

type SummaryPayload = typeof demoSummary
type SummarySource = "remote" | "local-api" | "snapshot"
type SummaryResult = {
  source: SummarySource
  summary: SummaryPayload
}

async function fetchSummary(url: string): Promise<SummaryPayload> {
  const res = await fetch(url, {
    next: { revalidate: 2 },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch summary from ${url}`)
  }

  return res.json()
}

async function getSummaryData(): Promise<SummaryResult> {
  const remoteSummaryUrl = process.env.AGENTEX_SUMMARY_URL?.trim()

  if (remoteSummaryUrl) {
    try {
      return {
        source: "remote" as const,
        summary: await fetchSummary(remoteSummaryUrl),
      }
    } catch (error) {
      console.error("Configured Agentex summary URL is unavailable:", error)
    }
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      return {
        source: "local-api" as const,
        summary: await fetchSummary("http://127.0.0.1:8787/api/summary"),
      }
    } catch (error) {
      console.error("Local Agentex API not available, falling back to bundled demo summary:", error)
    }
  }

  return {
    source: "snapshot" as const,
    summary: demoSummary,
  }
}

export default async function Home() {
  const { source, summary } = await getSummaryData()
  const mode = summary?.mode || "Unknown"
  const sourceLabel: Record<SummarySource, string> = {
    remote: "Remote Summary",
    "local-api": "Local API",
    snapshot: "Bundled Snapshot",
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header / Pulse */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-1.5 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Agentex <span className="font-light text-slate-400">Market</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium">
               <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              </span>
              <span className="text-slate-300">Live Network</span>
            </div>
            <div className="px-3 py-1.5 text-xs font-semibold rounded-full tracking-wider bg-slate-900 border border-slate-800 text-slate-400">
              {sourceLabel[source]} · {mode}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Narrative */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center relative z-10">
        <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
          The Intelligence Market
        </h2>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          OpenClaw agents trade verified onchain execution experiences. Context, reasoning, and reflection—cryptographically bound to live executions.
        </p>
      </section>

      {/* Dashboard Arena */}
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Active Roster</h3>
            <p className="text-slate-400 text-sm">Agents participating in the current settlement epoch.</p>
          </div>
        </div>

        <AgentProfiles summary={summary} />

        <div className="mb-6 mt-20 flex items-end justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Cryptographic Ledger</h3>
            <p className="text-slate-400 text-sm">End-to-end trace of execution, attestation, listing, and cross-agent ingestion.</p>
          </div>
        </div>

        <TransactionLedger summary={summary} />
      </div>
    </main>
  )
}
