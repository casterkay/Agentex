# Web UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Agentex web app into a "Premium Onchain Intelligence" experience with a narrative hero, glassmorphism agent cards, and a cryptographic ledger using Framer Motion.

**Architecture:** We will first set up dependencies and the base dark theme layout in Tailwind and globals.css. Then we will build out the components iteratively: the structural layout and hero section, the AgentProfiles component with interaction and stagger states, and finally the TransactionLedger with macro animations and spring-based expansions.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS, React 19, Framer Motion, Lucide Icons.

---

### Task 1: Environment & Theme Setup

**Files:**
- Modify: `web/package.json`
- Modify: `web/src/app/globals.css`
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Install Framer Motion**
Run: `cd web && npm install framer-motion`

- [ ] **Step 2: Update Layout for Dark Theme**
```tsx
// Edit web/src/app/layout.tsx to force dark mode and a dark background
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentex Market",
  description: "The Onchain Experience Market for Trading Agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-50">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Update Global CSS settings**
```css
/* Ensure the body matches the slate-950 dark theme in web/src/app/globals.css */
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-slate-950 text-slate-50 selection:bg-emerald-500/30;
  }
  html {
    @apply font-sans;
  }
}
```

- [ ] **Step 4: Verify Compilation**
Run: `cd web && npm run build`
Expected: Passes without errors.

- [ ] **Step 5: Commit**
Run: `git add web/package.json web/package-lock.json web/src/app/layout.tsx web/src/app/globals.css && git commit -m "feat(ui): install framer motion and set up dark theme"`

---

### Task 2: Build the Hero Section and Adjust Page Layout

**Files:**
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Replace header and add Hero component**
```tsx
// Replace the current return in web/src/app/page.tsx
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
```

- [ ] **Step 2: Check Build**
Run: `cd web && npm run build`
Expected: Passes.

- [ ] **Step 3: Commit**
Run: `git add web/src/app/page.tsx && git commit -m "feat(ui): implement dark cinematic hero and dashboard layout"`

---

### Task 3: Revamp Agent Profiles with glassmorphism and motion

**Files:**
- Modify: `web/src/app/components/AgentProfiles.tsx`

- [ ] **Step 1: Rewrite component to use "use client" and framer-motion**
```tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Activity, Cpu, ShieldCheck } from "lucide-react"
import { motion } from "framer-motion"

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariants = {
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
```

- [ ] **Step 2: Check Build**
Run: `cd web && npm run build`
Expected: Passes.

- [ ] **Step 3: Commit**
Run: `git add web/src/app/components/AgentProfiles.tsx && git commit -m "feat(ui): apply glassmorphism and framer-motion stagger to agent cards"`

---

### Task 4: Revamp Transaction Ledger with macro animations

**Files:**
- Modify: `web/src/app/components/TransactionLedger.tsx`

- [ ] **Step 1: Rewrite component to use "use client", styling, and motion**
```tsx
"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowRightLeft, CheckCircle2, FileCode, Lock, Shield } from "lucide-react"
import { motion } from "framer-motion"

type ExchangeLeg = {
  buyer: string
  seller: string
}

type TradeSummary = {
  pair?: string
  side?: string
  fill_price?: string
  trade_tx_hash?: string
}

type ExperienceEntry = TradeSummary & {
  agent?: string
  experience_id?: string
  manifest_path?: string
  encrypted_experience_cid?: string
  public_trade_summary?: TradeSummary
}

type ListingEntry = {
  listing_id?: string
  encrypted_experience_cid?: string
  public_trade_summary?: TradeSummary
}

type AttestationEntry = {
  attestation_id?: string
}

type PurchaseEntry = {
  purchase_id?: string
  decryption_verification_result?: {
    status?: string
  }
  decryption_verification_status?: string
}

type Summary = {
  round?: ExchangeLeg[]
  experiences?: ExperienceEntry[]
  attestations?: AttestationEntry[]
  listings?: ListingEntry[]
  purchases?: PurchaseEntry[]
}

export function TransactionLedger({ summary }: { summary?: Summary | null }) {
  if (!summary || !summary.round) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/10 bg-slate-950/50 hover:bg-slate-950/50">
            <TableHead className="w-[180px] text-slate-400 font-mono text-xs uppercase tracking-wider py-4">Exchange</TableHead>
            <TableHead className="text-slate-400 font-mono text-xs uppercase tracking-wider">Asset & Metadata</TableHead>
            <TableHead className="text-slate-400 font-mono text-xs uppercase tracking-wider">Registry Proofs</TableHead>
            <TableHead className="text-slate-400 font-mono text-xs uppercase tracking-wider text-right pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.round.map((leg, index) => {
            const experience = summary.experiences?.[index] || {}
            const attestation = summary.attestations?.[index] || {}
            const listing = summary.listings?.[index] || {}
            const purchase = summary.purchases?.[index] || {}
            
            // Collect IDs
            const attestationId = attestation.attestation_id || "pending"
            const cid = experience.encrypted_experience_cid || listing.encrypted_experience_cid || "pending"
            const listingId = listing.listing_id || "pending"
            const purchaseId = purchase.purchase_id || "pending"
            
            // Trade metadata
            const item = listing.public_trade_summary || experience.public_trade_summary || experience
            const tradeDesc = item.pair ? `${item.side} ${item.pair} @ ${item.fill_price}` : "No trade data"
            const txHash = item.trade_tx_hash || "No tx hash"
            
            // Verification status
            const status = purchase.decryption_verification_result?.status 
              || purchase.decryption_verification_status 
              || "pending"

            return (
              <TableRow key={index} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                <TableCell className="font-medium align-top pt-5">
                  <div className="flex flex-col gap-1.5 text-sm">
                    <span className="capitalize text-blue-400 font-mono">{leg.buyer}</span>
                    <span className="text-slate-600 text-xs italic font-serif">acquires from</span>
                    <span className="capitalize text-emerald-400 font-mono">{leg.seller}</span>
                  </div>
                </TableCell>
                <TableCell className="align-top pt-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 font-medium font-mono text-slate-200">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                      {tradeDesc}
                    </div>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-2 break-all max-w-[240px] truncate bg-black/40 px-2 py-1 rounded border border-white/5" title={txHash}>
                      <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-2 truncate bg-black/40 px-2 py-1 rounded border border-white/5" title={cid}>
                      <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {cid.substring(0, 16)}...
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top pt-5">
                  <Accordion className="w-full" type="single" collapsible>
                    <AccordionItem value="details" className="border-b-0">
                      <AccordionTrigger className="py-0 hover:no-underline text-xs text-slate-400 font-mono hover:text-white transition-colors mb-2">
                        Inspect Cryptographic IDs
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="flex flex-col gap-2 text-xs font-mono text-slate-400 mt-2 bg-black/50 p-2.5 rounded-lg border border-white/5 shadow-inner">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 uppercase text-[10px]">Attest:</span>
                            <span className="truncate w-32 text-right text-slate-300" title={attestationId}>{attestationId}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 uppercase text-[10px]">List:</span>
                            <span className="truncate w-32 text-right text-slate-300" title={listingId}>{listingId}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 uppercase text-[10px]">Purchase:</span>
                            <span className="truncate w-32 text-right text-slate-300" title={purchaseId}>{purchaseId}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TableCell>
                <TableCell className="align-top pt-5 pr-6">
                  <div className="flex flex-col gap-2 items-end">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6 + (index * 0.1), type: "spring" }}
                    >
                      <Badge variant={status === "verified" ? "default" : "secondary"} className={`${status === "verified" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono" : "bg-slate-800 text-slate-400 font-mono border-slate-700"} border px-2 py-1`}>
                        {status === "verified" ? (
                          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>
                        ) : (
                          <span className="flex items-center gap-1.5">Pending</span>
                        )}
                      </Badge>
                    </motion.div>
                    <Badge variant="outline" className="text-[10px] text-slate-500 font-mono border-white/10 bg-transparent flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Arkhai Settlement
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </motion.div>
  )
}
```

- [ ] **Step 2: Check Build**
Run: `cd web && npm run build`
Expected: Passes.

- [ ] **Step 3: Commit**
Run: `git add web/src/app/components/TransactionLedger.tsx && git commit -m "feat(ui): apply monospace aesthetic and motion to ledger"`

---
