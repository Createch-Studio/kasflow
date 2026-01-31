"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, RefreshCw } from "lucide-react"
import type { Asset, AssetType } from "@/lib/types"

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "cash", label: "Tunai" },
  { value: "investment", label: "Investasi" },
  { value: "crypto", label: "Crypto" },
  { value: "property", label: "Properti" },
  { value: "other", label: "Lainnya" },
]

const POPULAR_COINS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH" },
  { id: "binancecoin", name: "BNB", symbol: "BNB" },
  { id: "solana", name: "Solana", symbol: "SOL" },
  { id: "ripple", name: "XRP", symbol: "XRP" },
  { id: "cardano", name: "Cardano", symbol: "ADA" },
  { id: "dogecoin", name: "Dogecoin", symbol: "DOGE" },
  { id: "polkadot", name: "Polkadot", symbol: "DOT" },
  { id: "avalanche-2", name: "Avalanche", symbol: "AVAX" },
  { id: "chainlink", name: "Chainlink", symbol: "LINK" },
]

interface EditAssetDialogProps {
  asset: Asset
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditAssetDialog({ asset, open, onOpenChange }: EditAssetDialogProps) {
  const [loading, setLoading] = useState(false)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<AssetType>("cash")
  const [value, setValue] = useState("")
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [currentPrice, setCurrentPrice] = useState("")
  const [coinId, setCoinId] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const isCrypto = type === "crypto"

  useEffect(() => {
    if (asset && open) {
      setName(asset.name)
      setType(asset.type)
      setValue(asset.value?.toString() || "")
      setDescription(asset.description || "")
      setQuantity(asset.quantity?.toString() || "")
      setBuyPrice(asset.buy_price?.toString() || "")
      setCurrentPrice(asset.current_price?.toString() || "")
      setCoinId(asset.coin_id || "")
    }
  }, [asset, open])

  const fetchCryptoPrice = async () => {
    if (!coinId) return
    setFetchingPrice(true)
    try {
      const response = await fetch(`/api/crypto/price?coinId=${coinId}`)
      const data = await response.json()
      if (data.price) {
        setCurrentPrice(data.price.toString())
        if (quantity) {
          const calculatedValue = parseFloat(quantity) * data.price
          setValue(calculatedValue.toString())
        }
      }
    } catch (error) {
      // Opsi 1: Menggunakan komentar abaikan (disarankan jika ingin tetap melacak error)
      // eslint-disable-next-line no-console
      // console.error("Error fetching price:", error)
      alert("Gagal mengambil harga terbaru. Silakan coba input manual.");
      // Opsi 2: Hapus console.error dan biarkan kosong atau ganti dengan toast/alert
    }
    setFetchingPrice(false)
  }

  const handleCoinSelect = (selectedCoinId: string) => {
    setCoinId(selectedCoinId)
    const coin = POPULAR_COINS.find(c => c.id === selectedCoinId)
    if (coin) {
      setName(`${coin.name} (${coin.symbol})`)
    }
  }

  const handleQuantityChange = (newQuantity: string) => {
    setQuantity(newQuantity)
    if (currentPrice && newQuantity) {
      const calculatedValue = parseFloat(newQuantity) * parseFloat(currentPrice)
      setValue(calculatedValue.toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const updateData: Record<string, unknown> = {
      name,
      type,
      value: parseFloat(value) || 0,
      description: description || null,
      updated_at: new Date().toISOString(),
    }

    if (isCrypto) {
      updateData.quantity = quantity ? parseFloat(quantity) : null
      updateData.buy_price = buyPrice ? parseFloat(buyPrice) : null
      updateData.current_price = currentPrice ? parseFloat(currentPrice) : null
      updateData.coin_id = coinId || null
    } else {
      // Clear crypto fields if not crypto type
      updateData.quantity = null
      updateData.buy_price = null
      updateData.current_price = null
      updateData.coin_id = null
    }

    await supabase.from("assets").update(updateData).eq("id", asset.id)

    setLoading(false)
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Aset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-type">Jenis Aset</Label>
            <Select value={type} onValueChange={(v) => setType(v as AssetType)}>
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((assetType) => (
                  <SelectItem key={assetType.value} value={assetType.value}>
                    {assetType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCrypto && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-coin">Pilih Koin</Label>
                <Select value={coinId} onValueChange={handleCoinSelect}>
                  <SelectTrigger id="edit-coin">
                    <SelectValue placeholder="Pilih cryptocurrency..." />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_COINS.map((coin) => (
                      <SelectItem key={coin.id} value={coin.id}>
                        {coin.name} ({coin.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Jumlah (Qty)</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  step="any"
                  placeholder="0.00000000"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-buyPrice">Harga Beli (Rp)</Label>
                <Input
                  id="edit-buyPrice"
                  type="number"
                  placeholder="0"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-currentPrice">Harga Saat Ini (Rp)</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-currentPrice"
                    type="number"
                    placeholder="0"
                    value={currentPrice}
                    onChange={(e) => {
                      setCurrentPrice(e.target.value)
                      if (quantity && e.target.value) {
                        const calculatedValue = parseFloat(quantity) * parseFloat(e.target.value)
                        setValue(calculatedValue.toString())
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={fetchCryptoPrice}
                    disabled={!coinId || fetchingPrice}
                    title="Ambil harga dari CoinGecko"
                  >
                    {fetchingPrice ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {quantity && buyPrice && currentPrice && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nilai Beli:</span>
                    <span>Rp {(parseFloat(quantity) * parseFloat(buyPrice)).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nilai Saat Ini:</span>
                    <span>Rp {(parseFloat(quantity) * parseFloat(currentPrice)).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-medium mt-1 pt-1 border-t">
                    <span>Profit/Loss:</span>
                    <span className={
                      parseFloat(currentPrice) >= parseFloat(buyPrice) 
                        ? "text-green-600" 
                        : "text-red-600"
                    }>
                      {parseFloat(currentPrice) >= parseFloat(buyPrice) ? "+" : ""}
                      Rp {((parseFloat(quantity) * parseFloat(currentPrice)) - (parseFloat(quantity) * parseFloat(buyPrice))).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">Nama Aset</Label>
            <Input
              id="edit-name"
              placeholder="Contoh: Tabungan BCA, Bitcoin, Rumah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-value">Total Nilai (Rp)</Label>
            <Input
              id="edit-value"
              type="number"
              placeholder="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              min="0"
              readOnly={isCrypto && !!quantity && !!currentPrice}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Keterangan (Opsional)</Label>
            <Textarea
              id="edit-description"
              placeholder="Masukkan keterangan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
