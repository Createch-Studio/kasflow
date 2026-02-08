"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Trash2, 
  Wallet, 
  TrendingUp, 
  Bitcoin, 
  Home, 
  MoreHorizontal, 
  Pencil,
  RefreshCw,
  Loader2,
  ChevronDown,
  HandCoins,
  Landmark,
  Filter,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { EditAssetDialog } from "./edit-asset-dialog"
import { UpdateDebtDialog } from "./update-debt-dialog"
import type { Asset } from "@/lib/types"

const ASSET_CONFIG = {
  spending_account: { label: "Spending Account", icon: CreditCard, color: "bg-indigo-100 text-indigo-600" },
  cash: { label: "Tunai", icon: Wallet, color: "bg-blue-100 text-blue-600" },
  investment: { label: "Investasi", icon: TrendingUp, color: "bg-green-100 text-green-600" },
  crypto: { label: "Crypto", icon: Bitcoin, color: "bg-orange-100 text-orange-600" },
  property: { label: "Properti", icon: Home, color: "bg-purple-100 text-purple-600" },
  receivable: { label: "Piutang", icon: HandCoins, color: "bg-emerald-100 text-emerald-600" },
  debt: { label: "Utang", icon: Landmark, color: "bg-red-100 text-red-600" },
  other: { label: "Lainnya", icon: MoreHorizontal, color: "bg-gray-100 text-gray-600" },
}

const FILTER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "spending_account", label: "Spending" },
  { value: "cash", label: "Simpanan" },
  { value: "investment", label: "Investasi" },
  { value: "crypto", label: "Crypto" },
  { value: "property", label: "Properti" },
  { value: "receivable", label: "Piutang" },
  { value: "debt", label: "Utang" },
  { value: "other", label: "Lainya" },
]

interface AssetListProps {
  assets: Asset[]
}

export function AssetList({ assets }: AssetListProps) {
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [updatingAsset, setUpdatingAsset] = useState<Asset | null>(null)
  const [updatingPrices, setUpdatingPrices] = useState(false)
  const [visibleCount, setVisibleCount] = useState(10)
  const [activeFilter, setActiveFilter] = useState("all")
  
  const router = useRouter()
  const supabase = createClient()

  const filteredAssets = assets.filter((asset) => {
    if (activeFilter === "all") return true
    return asset.type === activeFilter
  })

  const displayedAssets = filteredAssets.slice(0, visibleCount)

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("assets").delete().eq("id", id)
      if (error) throw error
      router.refresh()
    } catch {
      alert("Gagal menghapus aset")
    }
  }

  const cryptoAssets = assets.filter(a => a.type === "crypto" && a.coin_id)

  const updateAllCryptoPrices = async () => {
    if (cryptoAssets.length === 0) return
    setUpdatingPrices(true)
    try {
      const coinIds = [...new Set(cryptoAssets.map(a => a.coin_id).filter(Boolean))]
      const response = await fetch("/api/crypto/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinIds }),
      })
      const data = await response.json()
      if (data.prices) {
        for (const asset of cryptoAssets) {
          if (asset.coin_id && data.prices[asset.coin_id]) {
            const newPrice = data.prices[asset.coin_id]
            const newValue = asset.quantity ? asset.quantity * newPrice : newPrice
            await supabase.from("assets").update({
              current_price: newPrice,
              value: newValue,
              updated_at: new Date().toISOString(),
            }).eq("id", asset.id)
          }
        }
        router.refresh()
      }
    } catch {
      alert("Gagal update harga crypto")
    } finally {
      setUpdatingPrices(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Daftar Rincian Aset</CardTitle>
            {activeFilter === "crypto" && cryptoAssets.length > 0 && (
              <Button variant="outline" size="sm" onClick={updateAllCryptoPrices} disabled={updatingPrices}>
                {updatingPrices ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Update Harga
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
            <div className="flex items-center gap-2 text-muted-foreground mr-2 shrink-0">
              <Filter className="h-4 w-4" />
              <span className="text-xs font-medium">Filter:</span>
            </div>
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={activeFilter === opt.value ? "default" : "outline"}
                size="sm"
                className="rounded-full px-4 h-8 text-xs shrink-0"
                onClick={() => {
                  setActiveFilter(opt.value)
                  setVisibleCount(10)
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {displayedAssets.length > 0 ? (
            <div className="space-y-3">
              {displayedAssets.map((asset) => {
                const config = ASSET_CONFIG[asset.type as keyof typeof ASSET_CONFIG] || ASSET_CONFIG.other
                const Icon = config.icon
                const isDebt = asset.type === "debt"
                const isDebtOrReceivable = asset.type === "debt" || asset.type === "receivable"
                const isCrypto = asset.type === "crypto"
                const isInvestment = asset.type === "investment"
                
                // Hitung Modal Awal
                const modalAwal = (asset.quantity && asset.buy_price) ? asset.quantity * asset.buy_price : 0
                
                // Hitung Perubahan Persen
                let changePercent = 0
                if ((isCrypto || isInvestment) && asset.buy_price && asset.current_price) {
                  changePercent = ((asset.current_price - asset.buy_price) / asset.buy_price) * 100
                }

                return (
                  <div key={asset.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{asset.name}</p>
                          {asset.description && (
                            <span className="text-[11px] text-muted-foreground truncate border-l pl-2 italic max-w-[120px] sm:max-w-[200px]">
                              {asset.description}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 h-4">
                            {config.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(asset.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right flex flex-col items-end min-w-[120px]">
                        <p className={`font-bold text-lg leading-none ${isDebt ? "text-red-600" : "text-foreground"}`}>
                          {isDebt ? "-" : ""}{formatCurrency(Number(asset.value))}
                        </p>
                        
                        {/* Menampilkan Modal dan % Change untuk Crypto & Investasi */}
                        {(isCrypto || isInvestment) && asset.buy_price && (
                          <div className="flex flex-col items-end mt-1 space-y-0.5">
                            {modalAwal > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                Modal: {formatCurrency(modalAwal)}
                              </span>
                            )}
                            <div className={`flex items-center gap-0.5 text-[11px] font-bold ${changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {changePercent >= 0 ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {isDebtOrReceivable && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[11px] px-2 gap-1 border-primary/20 hover:bg-primary/5"
                            onClick={() => setUpdatingAsset(asset)}
                          >
                            <HandCoins className="h-3 w-3" />
                            Update Saldo
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingAsset(asset)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Data?</AlertDialogTitle>
                              <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(asset.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredAssets.length > visibleCount && (
                <div className="flex justify-center pt-2">
                  <Button variant="ghost" size="sm" onClick={handleLoadMore} className="text-muted-foreground text-xs">
                    <ChevronDown className="mr-1 h-3 w-3" />
                    Muat lebih banyak
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
              <p className="text-sm">Belum ada data untuk kategori filter ini.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {editingAsset && (
        <EditAssetDialog
          asset={editingAsset}
          open={!!editingAsset}
          onOpenChange={(open) => !open && setEditingAsset(null)}
        />
      )}

      {updatingAsset && (
        <UpdateDebtDialog
          asset={updatingAsset}
          open={!!updatingAsset}
          onOpenChange={(open) => !open && setUpdatingAsset(null)}
        />
      )}
    </>
  )
}