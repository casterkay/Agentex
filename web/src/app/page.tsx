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
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Agentex <span className="font-light text-slate-500">Market</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Market Summary
            </span>
            <div className="px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              {sourceLabel[source]} · {mode} Mode
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1">Agent Activity</h2>
            <p className="text-slate-500 text-sm">Real-time status of trading agents participating in the market.</p>
          </div>

          <AgentProfiles summary={summary} />

          <div className="mb-6 mt-12 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Transaction Ledger</h2>
              <p className="text-slate-500 text-sm">End-to-end trace of experience assets: execution, attestation, listing, purchase, and cryptographic verification.</p>
            </div>
          </div>

          <TransactionLedger summary={summary} />
        </>
      </div>
    </main>
  )
}
