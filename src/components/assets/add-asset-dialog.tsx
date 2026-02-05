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
  { value: "spending_account", label: "Spending Account" },
  { value: "cash", label: "Simpanan (Tunai/Bank)" },
  { value: "investment", label: "Investasi" },
  { value: "crypto", label: "Crypto" },
  { value: "property", label: "Properti" },
  { value: "receivable", label: "Piutang" },
  { value: "debt", label: "Utang" },
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
  { id: "tether", name: "USDT", symbol: "USDT" },
  { id: "usdcoin", name: "USDC", symbol: "USDC" },
  { id: "chainlink", name: "Chainlink", symbol: "LINK" },
]

export function AddAssetDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  
  const [type, setType] = useState<AssetType>("spending_account")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("") 
  const [buyPrice, setBuyPrice] = useState("")
  const [currentPrice, setCurrentPrice] = useState("")
  const [coinId, setCoinId] = useState("")
  const [value, setValue] = useState("") 

  const router = useRouter()
  const supabase = createClient()

  const isCrypto = type === "crypto"

  const handleCoinSelect = (selectedCoinId: string) => {
    setCoinId(selectedCoinId)
    const coin = POPULAR_COINS.find(c => c.id === selectedCoinId)
    if (coin) {
      setName(`${coin.name} (${coin.symbol})`)
    }
  }

  const fetchCryptoPrice = async () => {
    if (!coinId) return
    setFetchingPrice(true)
    try {
      const response = await fetch(`/api/crypto/price?coinId=${coinId}`)
      const data = await response.json()
      // Menyesuaikan dengan struktur data.prices[coinId] atau data.price
      const price = data.prices ? data.prices[coinId] : data.price
      
      if (price) {
        setCurrentPrice(price.toString())
        if (quantity) {
          const calculatedValue = parseFloat(quantity) * price
          setValue(Math.round(calculatedValue).toString())
        }
      }
    } catch (error) {
      alert("Gagal mengambil harga terbaru.")
    } finally {
      setFetchingPrice(false)
    }
  }

  const handleQuantityChange = (qty: string) => {
    setQuantity(qty)
    if (currentPrice && qty) {
      const calculatedValue = parseFloat(qty) * parseFloat(currentPrice)
      setValue(Math.round(calculatedValue).toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Sesi berakhir")

      const finalValue = Math.abs(parseFloat(value) || 0)

      const { error } = await supabase.from("assets").insert({
        user_id: user.id,
        name,
        type,
        quantity: (isCrypto || type === "investment") ? parseFloat(quantity) : null,
        buy_price: buyPrice ? parseFloat(buyPrice) : null,
        current_price: currentPrice ? parseFloat(currentPrice) : null,
        value: finalValue,
        coin_id: isCrypto ? coinId : null,
        description: description || null,
        currency: "IDR"
      })

      if (error) throw error

      setOpen(false)
      // Reset Form
      setName(""); setQuantity(""); setBuyPrice(""); setCurrentPrice(""); 
      setValue(""); setCoinId(""); setDescription(""); setType("spending_account");
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal simpan"
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Tambah Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah {type === "debt" ? "Kewajiban" : "Aset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={type} onValueChange={(v: AssetType) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCrypto && (
            <>
              <div className="space-y-2">
                <Label>Pilih Koin</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jumlah (Qty)</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Harga Beli (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Harga Saat Ini (Rp)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0"
                    value={currentPrice}
                    onChange={(e) => {
                      setCurrentPrice(e.target.value)
                      if (quantity && e.target.value) {
                        const calc = parseFloat(quantity) * parseFloat(e.target.value)
                        setValue(Math.round(calc).toString())
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={fetchCryptoPrice}
                    disabled={!coinId || fetchingPrice}
                  >
                    {fetchingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {quantity && buyPrice && currentPrice && (
                <div className="p-3 rounded-lg bg-slate-50 border text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Estimasi Modal:</span>
                    <span>Rp {(parseFloat(quantity) * parseFloat(buyPrice)).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-1 border-t">
                    <span>Profit/Loss:</span>
                    <span className={parseFloat(currentPrice) >= parseFloat(buyPrice) ? "text-green-600" : "text-red-600"}>
                      {parseFloat(currentPrice) >= parseFloat(buyPrice) ? "+" : ""}
                      Rp {((parseFloat(quantity) * parseFloat(currentPrice)) - (parseFloat(quantity) * parseFloat(buyPrice))).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>{type === "debt" ? "Nama Kreditur" : "Nama Aset"}</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              placeholder="Contoh: Bitcoin, Tabungan BCA, dll"
            />
          </div>

          <div className="space-y-2">
            <Label>Total Nilai / Saldo (Rp)</Label>
            <Input 
              type="number" 
              value={value} 
              onChange={(e) => setValue(e.target.value)} 
              required
              readOnly={isCrypto && !!quantity && !!currentPrice}
              className={isCrypto && !!quantity && !!currentPrice ? "bg-muted" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label>Keterangan (Opsional)</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Simpan Aset"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}