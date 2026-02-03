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
  TrendingDown,
  ChevronDown,
  HandCoins,
  Landmark
} from "lucide-react"
import { EditAssetDialog } from "./edit-asset-dialog"
import type { Asset } from "@/lib/types"

// Update ASSET_CONFIG untuk menyertakan Utang dan Piutang
const ASSET_CONFIG = {
  cash: { label: "Tunai", icon: Wallet, color: "bg-blue-100 text-blue-600" },
  investment: { label: "Investasi", icon: TrendingUp, color: "bg-green-100 text-green-600" },
  crypto: { label: "Crypto", icon: Bitcoin, color: "bg-orange-100 text-orange-600" },
  property: { label: "Properti", icon: Home, color: "bg-purple-100 text-purple-600" },
  receivable: { label: "Piutang", icon: HandCoins, color: "bg-emerald-100 text-emerald-600" },
  debt: { label: "Utang", icon: Landmark, color: "bg-red-100 text-red-600" },
  other: { label: "Lainnya", icon: MoreHorizontal, color: "bg-gray-100 text-gray-600" },
}

interface AssetListProps {
  assets: Asset[]
}

export function AssetList({ assets }: AssetListProps) {
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [updatingPrices, setUpdatingPrices] = useState(false)
  const [visibleCount, setVisibleCount] = useState(10)
  
  const router = useRouter()
  const supabase = createClient()

  const displayedAssets = assets.slice(0, visibleCount)

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
            
            await supabase
              .from("assets")
              .update({
                current_price: newPrice,
                value: newValue,
                updated_at: new Date().toISOString(),
              })
              .eq("id", asset.id)
          }
        }
        router.refresh()
      }
    } catch (error) {
       alert("Gagal mengambil harga terbaru.");
    }
    setUpdatingPrices(false)
  }

  const calculateProfitLoss = (asset: Asset) => {
    if (!asset.quantity || !asset.buy_price || !asset.current_price) return null
    const buyValue = asset.quantity * asset.buy_price
    const currentValue = asset.quantity * asset.current_price
    return {
      amount: currentValue - buyValue,
      percentage: ((currentValue - buyValue) / buyValue) * 100,
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Daftar Aset & Kewajiban</CardTitle>
          {cryptoAssets.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={updateAllCryptoPrices}
              disabled={updatingPrices}
            >
              {updatingPrices ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memperbarui...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Update Harga Kripto</>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {assets.length > 0 ? (
            <div className="space-y-3">
              {displayedAssets.map((asset) => {
                const config = ASSET_CONFIG[asset.type as keyof typeof ASSET_CONFIG] || ASSET_CONFIG.other
                const Icon = config.icon
                const profitLoss = asset.type === "crypto" ? calculateProfitLoss(asset) : null
                const isDebt = asset.type === "debt"
                
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{asset.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px] sm:text-xs">
                            {config.label}
                          </Badge>
                          {asset.type === "crypto" && asset.quantity && (
                            <span className="text-xs">
                              Qty: {asset.quantity.toLocaleString('id-ID', { maximumFractionDigits: 8 })}
                            </span>
                          )}
                        </div>
                        {asset.type === "crypto" && profitLoss && (
                          <div className="flex items-center gap-1 mt-1">
                            {profitLoss.amount >= 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span className={`text-xs font-medium ${profitLoss.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {profitLoss.amount >= 0 ? "+" : ""}
                              {formatCurrency(profitLoss.amount)} ({profitLoss.percentage.toFixed(2)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="text-right">
                        <p className={`font-semibold text-lg ${isDebt ? "text-red-600" : ""}`}>
                          {isDebt ? "-" : ""}{formatCurrency(Number(asset.value))}
                        </p>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                          {formatDate(asset.updated_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEditingAsset(asset)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus?</AlertDialogTitle>
                              <AlertDialogDescription>Tindakan ini permanen.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(asset.id)}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                )
              })}

              {assets.length > visibleCount && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={handleLoadMore} className="w-full sm:w-auto gap-2">
                    <ChevronDown className="h-4 w-4" />
                    Lihat Aset Sebelumnya
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Belum ada data.</div>
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