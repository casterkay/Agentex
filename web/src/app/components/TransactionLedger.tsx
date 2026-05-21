import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowRightLeft, CheckCircle2, FileCode, Lock } from "lucide-react"

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
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-[180px]">Exchange Leg</TableHead>
            <TableHead>Asset & Price</TableHead>
            <TableHead>Attestation</TableHead>
            <TableHead>Status</TableHead>
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
              <TableRow key={index} className="group">
                <TableCell className="font-medium align-top pt-4">
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="capitalize text-blue-600 font-semibold">{leg.buyer}</span>
                    <span className="text-slate-500 text-xs">buys from</span>
                    <span className="capitalize text-emerald-600 font-semibold">{leg.seller}</span>
                  </div>
                </TableCell>
                <TableCell className="align-top pt-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 font-medium font-mono text-slate-800">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                      {tradeDesc}
                    </div>
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 break-all max-w-[200px] truncate" title={txHash}>
                      <FileCode className="w-3.5 h-3.5" />
                      Tx: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                    </div>
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 truncate" title={cid}>
                      <Lock className="w-3.5 h-3.5" />
                      CID: {cid.substring(0, 16)}...
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top pt-4">
                  <Accordion className="w-full">
                    <AccordionItem value="details" className="border-b-0">
                      <AccordionTrigger className="py-0 hover:no-underline text-xs text-slate-500 mb-2">
                        View Registry IDs
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="flex flex-col gap-2 text-xs font-mono text-slate-600 mt-2 bg-slate-50 p-2 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Attest:</span>
                            <span className="truncate w-32 text-right" title={attestationId}>{attestationId}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">List:</span>
                            <span className="truncate w-32 text-right" title={listingId}>{listingId}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Purch:</span>
                            <span className="truncate w-32 text-right" title={purchaseId}>{purchaseId}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TableCell>
                <TableCell className="align-top pt-4">
                  <div className="flex flex-col gap-2 items-start">
                    <Badge variant={status === "verified" ? "default" : "secondary"} className={status === "verified" ? "bg-emerald-500" : ""}>
                      {status === "verified" ? (
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                      ) : (
                        <span className="flex items-center gap-1">Pending</span>
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-slate-500 bg-white">
                      Arkhai NLA Escrow
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
