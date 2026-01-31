"use client"

import { useState } from "react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, RefreshCw } from "lucide-react"
import type { AssetType } from "@/lib/types"

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

export function AddAssetDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<AssetType>("cash")
  const [value, setValue] = useState("")
  const [description, setDescription] = useState("")
  // Crypto specific fields
  const [quantity, setQuantity] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [currentPrice, setCurrentPrice] = useState("")
  const [coinId, setCoinId] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const isCrypto = type === "crypto"

  const fetchCryptoPrice = async () => {
    if (!coinId) return
    setFetchingPrice(true)
    try {
      const response = await fetch(`/api/crypto/price?coinId=${coinId}`)
      const data = await response.json()
      if (data.price) {
        setCurrentPrice(data.price.toString())
        // Auto-calculate value if quantity is set
        if (quantity) {
          const calculatedValue = parseFloat(quantity) * data.price
          setValue(calculatedValue.toString())
        }
      }
    } catch (error) {
      // Menghapus console.error dan menggantinya dengan penanganan yang lebih baik
      // atau biarkan kosong jika tidak ingin menampilkan apa pun, 
      // tapi sebaiknya berikan feedback ke user (opsional)
      alert("Gagal mengambil harga terbaru. Silakan coba input manual.");
    }
    setFetchingPrice(false);
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const assetData: Record<string, unknown> = {
      user_id: user.id,
      name,
      type,
      value: parseFloat(value) || 0,
      description: description || null,
    }

    if (isCrypto) {
      assetData.quantity = quantity ? parseFloat(quantity) : null
      assetData.buy_price = buyPrice ? parseFloat(buyPrice) : null
      assetData.current_price = currentPrice ? parseFloat(currentPrice) : null
      assetData.coin_id = coinId || null
    }

    await supabase.from("assets").insert(assetData)

    setLoading(false)
    setOpen(false)
    resetForm()
    router.refresh()
  }

  const resetForm = () => {
    setName("")
    setType("cash")
    setValue("")
    setDescription("")
    setQuantity("")
    setBuyPrice("")
    setCurrentPrice("")
    setCoinId("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Aset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Aset Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Jenis Aset</Label>
            <Select value={type} onValueChange={(v) => setType(v as AssetType)}>
              <SelectTrigger>
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
                <Label htmlFor="coin">Pilih Koin</Label>
                <Select value={coinId} onValueChange={handleCoinSelect}>
                  <SelectTrigger>
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
                <Label htmlFor="quantity">Jumlah (Qty)</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  placeholder="0.00000000"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  required={isCrypto}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buyPrice">Harga Beli (Rp)</Label>
                <Input
                  id="buyPrice"
                  type="number"
                  placeholder="0"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPrice">Harga Saat Ini (Rp)</Label>
                <div className="flex gap-2">
                  <Input
                    id="currentPrice"
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
                <p className="text-xs text-muted-foreground">
                  Klik tombol refresh untuk mengambil harga terkini dari CoinGecko
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Aset</Label>
            <Input
              id="name"
              placeholder="Contoh: Tabungan BCA, Bitcoin, Rumah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Total Nilai (Rp)</Label>
            <Input
              id="value"
              type="number"
              placeholder="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              min="0"
              readOnly={isCrypto && !!quantity && !!currentPrice}
            />
            {isCrypto && quantity && currentPrice && (
              <p className="text-xs text-muted-foreground">
                Nilai dihitung otomatis: {quantity} x Rp {parseFloat(currentPrice).toLocaleString('id-ID')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Keterangan (Opsional)</Label>
            <Textarea
              id="description"
              placeholder="Masukkan keterangan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Aset"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
