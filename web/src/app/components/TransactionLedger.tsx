"use client"

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
                  <Accordion className="w-full"  >
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
