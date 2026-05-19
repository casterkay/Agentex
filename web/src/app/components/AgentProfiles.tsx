import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Cpu, ShieldCheck } from "lucide-react"

export function AgentProfiles({ summary }: { summary: any }) {
  if (!summary || !summary.agents) return null

  // Map agents to simple display objects, we can look up their specific activity if needed
  const agents = summary.agents.map((shortName: string) => {
    // Find what they bought and sold based on round
    const sold = summary.round?.find((leg: any) => leg.seller === shortName)
    const bought = summary.round?.find((leg: any) => leg.buyer === shortName)

    return {
      name: shortName,
      didSell: !!sold,
      didBuy: !!bought,
    }
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {agents.map((agent: any) => (
        <Card key={agent.name} className="overflow-hidden">
          <CardHeader className="bg-slate-100/50 pb-4 border-b">
            <CardTitle className="flex justify-between items-center text-lg capitalize">
              {agent.name}
              <Badge variant="outline" className="font-mono text-xs">
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className={`w-4 h-4 ${agent.didSell ? "text-emerald-500" : "text-slate-300"}`} />
                <span className={agent.didSell ? "text-slate-900" : "text-slate-400"}>
                  {agent.didSell ? "Sold Experience" : "No Sale"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Activity className={`w-4 h-4 ${agent.didBuy ? "text-blue-500" : "text-slate-300"}`} />
                <span className={agent.didBuy ? "text-slate-900" : "text-slate-400"}>
                  {agent.didBuy ? "Bought Experience" : "No Purchase"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm pt-2 border-t mt-1">
                <Cpu className="w-4 h-4 text-purple-500" />
                <span className="text-slate-600">OpenClaw Agent</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
