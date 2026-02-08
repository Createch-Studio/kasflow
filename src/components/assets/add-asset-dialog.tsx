"use client"

import { useState, useMemo } from "react"
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

/* ================= CONSTANT ================= */

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
  { id: "tether", name: "USDT", symbol: "USDT" },
  { id: "usd-coin", name: "USDC", symbol: "USDC" },
]

/* ================= COMPONENT ================= */

export function AddAssetDialog() {
  const router = useRouter()
  const supabase = createClient()

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
  const [manualValue, setManualValue] = useState("")

  const isCrypto = type === "crypto"
  const isInvestment = type === "investment"

  /* ================= DERIVED ================= */

  const qty = Number(quantity) || 0
  const buy = Number(buyPrice) || 0
  const current = Number(currentPrice) || 0

  const initialValue = useMemo(() => {
    if (!qty || !buy) return 0
    return Math.round(qty * buy)
  }, [qty, buy])

  const currentValue = useMemo(() => {
    if (isCrypto || isInvestment) {
      if (!qty || !current) return 0
      return Math.round(qty * current)
    }
    return Math.abs(Number(manualValue) || 0)
  }, [qty, current, manualValue, isCrypto, isInvestment])

  const profitLoss = currentValue - initialValue

  /* ================= HANDLERS ================= */

  const handleCoinSelect = (id: string) => {
    setCoinId(id)
    const coin = POPULAR_COINS.find(c => c.id === id)
    if (coin) setName(`${coin.name} (${coin.symbol})`)
  }

  const fetchCryptoPrice = async () => {
    if (!coinId) return
    setFetchingPrice(true)
    try {
      const res = await fetch(`/api/crypto/price?coinId=${coinId}`)
      const data = await res.json()
      const price = data.price ?? data.prices?.[coinId]
      if (price) setCurrentPrice(String(price))
    } finally {
      setFetchingPrice(false)
    }
  }

  const resetForm = () => {
    setType("spending_account")
    setName("")
    setDescription("")
    setQuantity("")
    setBuyPrice("")
    setCurrentPrice("")
    setManualValue("")
    setCoinId("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data } = await supabase.auth.getUser()
      if (!data.user) throw new Error("Session expired")

      const { error } = await supabase.from("assets").insert({
        user_id: data.user.id,
        name,
        type,
        quantity: isCrypto || isInvestment ? qty : null,
        buy_price: buy || null,
        current_price: current || null,
        initial_value: isCrypto || isInvestment ? initialValue : null,
        value: currentValue,
        coin_id: isCrypto ? coinId : null,
        description: description || null,
        currency: "IDR",
      })

      if (error) throw error

      setOpen(false)
      resetForm()
      router.refresh()
    } catch (err: any) {
      alert(err.message ?? "Gagal menyimpan data")
    } finally {
      setLoading(false)
    }
  }

  /* ================= UI ================= */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Tambah Data
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Aset</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TYPE */}
          <div>
            <Label>Kategori</Label>
            <Select value={type} onValueChange={v => setType(v as AssetType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CRYPTO / INVESTMENT */}
          {(isCrypto || isInvestment) && (
            <>
              {isCrypto && (
                <div>
                  <Label>Pilih Koin</Label>
                  <Select value={coinId} onValueChange={handleCoinSelect}>
                    <SelectTrigger><SelectValue placeholder="Pilih koin" /></SelectTrigger>
                    <SelectContent>
                      {POPULAR_COINS.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Qty" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
                <Input placeholder="Harga Beli" type="number" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} />
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Harga Saat Ini"
                  type="number"
                  value={currentPrice}
                  onChange={e => setCurrentPrice(e.target.value)}
                />
                {isCrypto && (
                  <Button type="button" size="icon" variant="outline" onClick={fetchCryptoPrice}>
                    {fetchingPrice ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              {qty > 0 && (
                <div className="text-xs border rounded p-3 bg-muted">
                  <div className="flex justify-between">
                    <span>Modal Awal</span>
                    <span>Rp {initialValue.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nilai Saat Ini</span>
                    <span>Rp {currentValue.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Profit / Loss</span>
                    <span className={profitLoss >= 0 ? "text-green-600" : "text-red-600"}>
                      {profitLoss >= 0 ? "+" : ""}Rp {profitLoss.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* NAME */}
          <Input placeholder="Nama Aset" value={name} onChange={e => setName(e.target.value)} required />

          {/* MANUAL VALUE */}
          {!isCrypto && !isInvestment && (
            <Input
              placeholder="Total Nilai (Rp)"
              type="number"
              value={manualValue}
              onChange={e => setManualValue(e.target.value)}
              required
            />
          )}

          <Textarea placeholder="Keterangan (opsional)" value={description} onChange={e => setDescription(e.target.value)} />

          <Button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Simpan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
