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
  Filter
} from "lucide-react"
import { EditAssetDialog } from "./edit-asset-dialog"
import type { Asset } from "@/lib/types"

const ASSET_CONFIG = {
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
  { value: "cash", label: "Tunai" },
  { value: "investment", label: "Investasi" },
  { value: "crypto", label: "Crypto" },
  { value: "property", label: "Properti" },
  { value: "receivable", label: "Piutang" },
  { value: "debt", label: "Utang" },
]

interface AssetListProps {
  assets: Asset[]
}

export function AssetList({ assets }: AssetListProps) {
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
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
    await supabase.from("assets").delete().eq("id", id)
    router.refresh()
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
    } catch (_error) {
       alert("Gagal memperbarui harga.");
    }
    setUpdatingPrices(false)
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Daftar Aset & Kewajiban</CardTitle>
            {activeFilter === "crypto" && cryptoAssets.length > 0 && (
              <Button variant="outline" size="sm" onClick={updateAllCryptoPrices} disabled={updatingPrices}>
                {updatingPrices ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Update Harga
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar scrollbar-hide">
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
                
                return (
                  <div key={asset.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{asset.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tight">
                            {config.label}
                          </Badge>
                          {asset.type === "crypto" && asset.quantity && (
                            <span className="text-xs">Qty: {asset.quantity.toLocaleString('id-ID')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="text-right">
                        <p className={`font-semibold text-lg ${isDebt ? "text-red-600" : ""}`}>
                          {isDebt ? "-" : ""}{formatCurrency(Number(asset.value))}
                        </p>
                        <p className="text-[10px] text-muted-foreground hidden sm:block">
                          {formatDate(asset.updated_at)}
                        </p>
                      </div>

                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingAsset(asset)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-destructive text-muted-foreground">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Data?</AlertDialogTitle>
                              <AlertDialogDescription>Tindakan ini permanen.</AlertDialogDescription>
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
                <div className="flex justify-center pt-4">
                  <Button variant="ghost" onClick={handleLoadMore} className="w-full gap-2 text-muted-foreground">
                    <ChevronDown className="h-4 w-4" />
                    Lihat Lebih Banyak
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
              <p>Tidak ada data ditemukan.</p>
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
    </>
  )
}