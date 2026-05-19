import { AgentProfiles } from "./components/AgentProfiles"
import { TransactionLedger } from "./components/TransactionLedger"
import { Activity } from "lucide-react"

async function getSummaryData() {
  // Try to fetch from the local Agentex CLI serve endpoint
  try {
    const res = await fetch("http://127.0.0.1:8787/api/summary", { 
      next: { revalidate: 2 } // revalidate frequently for demo updates 
    })
    if (!res.ok) throw new Error("Failed to fetch summary")
    return res.json()
  } catch (error) {
    console.error("Agentex API not available:", error)
    return null
  }
}

export default async function Home() {
  const summary = await getSummaryData()
  const mode = summary?.mode || "Unknown"

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
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${summary ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${summary ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              {summary ? "API Connected" : "API Offline"}
            </span>
            <div className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${mode === 'live' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
              {mode} Mode
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        {!summary ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-lg flex flex-col items-center justify-center text-center">
            <Activity className="w-10 h-10 mb-3 text-rose-400" />
            <h2 className="text-lg font-semibold mb-1">Cannot reach Agentex API</h2>
            <p className="text-sm opacity-80 mb-4 max-w-md">Ensure you are running <code className="bg-white px-1.5 py-0.5 rounded border">npm run demo:local</code> and <code className="bg-white px-1.5 py-0.5 rounded border">agentex serve</code> on port 8787.</p>
          </div>
        ) : (
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
        )}
      </div>
    </main>
  )
}
