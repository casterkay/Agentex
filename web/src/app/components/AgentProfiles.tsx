"use client"

import { motion, type Variants } from "framer-motion"
import { Activity, Cpu, ShieldCheck } from "lucide-react"

type ExchangeLeg = {
  buyer: string
  seller: string
}

type Summary = {
  agents?: string[]
  round?: ExchangeLeg[]
}

type AgentDisplay = {
  name: string
  didSell: boolean
  didBuy: boolean
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
}

export function AgentProfiles({ summary }: { summary?: Summary | null }) {
  if (!summary || !summary.agents) return null

  const agents: AgentDisplay[] = summary.agents.map((shortName) => {
    const sold = summary.round?.find((leg) => leg.seller === shortName)
    const bought = summary.round?.find((leg) => leg.buyer === shortName)

    return {
      name: shortName,
      didSell: !!sold,
      didBuy: !!bought,
    }
  })

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {agents.map((agent) => (
        <motion.div
          key={agent.name}
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02 }}
          className={`relative overflow-hidden rounded-xl border bg-slate-900/50 backdrop-blur-xl transition-all duration-300 ${
            agent.didBuy ? 'hover:border-blue-500/50 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]' : 
            agent.didSell ? 'hover:border-emerald-500/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]' : 
            'hover:border-slate-700'
          } border-white/5`}
        >
          {/* Subtle top highlight */}
          <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent ${agent.didBuy ? 'via-blue-500/50' : agent.didSell ? 'via-emerald-500/50' : 'via-white/20'} to-transparent`} />

          <div className="p-5 border-b border-white/5 bg-white/5">
            <div className="flex justify-between items-center text-lg capitalize font-bold text-white">
              {agent.name}
              <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded-md border border-white/5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 bg-emerald-400"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Active</span>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-sm">
                <div className={`p-1.5 rounded-md ${agent.didSell ? "bg-emerald-500/10" : "bg-white/5"}`}>
                  <ShieldCheck className={`w-4 h-4 ${agent.didSell ? "text-emerald-400" : "text-slate-600"}`} />
                </div>
                <span className={agent.didSell ? "text-slate-200" : "text-slate-500"}>
                  {agent.didSell ? "Sold Experience" : "No Sale"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className={`p-1.5 rounded-md ${agent.didBuy ? "bg-blue-500/10" : "bg-white/5"}`}>
                  <Activity className={`w-4 h-4 ${agent.didBuy ? "text-blue-400" : "text-slate-600"}`} />
                </div>
                <span className={agent.didBuy ? "text-slate-200" : "text-slate-500"}>
                  {agent.didBuy ? "Bought Experience" : "No Purchase"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm pt-4 border-t border-white/5 mt-1">
                <Cpu className="w-4 h-4 text-purple-400/70" />
                <span className="text-slate-400 font-mono text-xs">OpenClaw Engine</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
