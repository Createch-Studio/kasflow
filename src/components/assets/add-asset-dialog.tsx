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

  const fetchLatestPrice = async () => {
    if (!coinId) return alert("Pilih koin terlebih dahulu")
    setFetchingPrice(true)
    try {
      const res = await fetch(`/api/crypto/price?ids=${coinId}`)
      const data = await res.json()
      if (data.prices && data.prices[coinId]) {
        const price = data.prices[coinId]
        setCurrentPrice(price.toString())
        if (quantity) {
          const total = parseFloat(quantity) * price
          setValue(Math.round(total).toString())
        }
      }
    } catch (err: unknown) {
      alert("Gagal mengambil harga terbaru")
    } finally {
      setFetchingPrice(false)
    }
  }

  const calculateValue = (qty: string, price: string) => {
    const q = parseFloat(qty) || 0
    const p = parseFloat(price) || 0
    if (q > 0 || p > 0) {
      setValue(Math.round(q * p).toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Sesi berakhir")

      const rawValue = parseFloat(value) || 0
      // UTANG: Disimpan sebagai NEGATIF agar bisa langsung di-SUM di database
      const finalValue = type === "debt" ? -Math.abs(rawValue) : Math.abs(rawValue)

      const { error } = await supabase.from("assets").insert({
        user_id: user.id,
        name,
        type,
        quantity: (type === "crypto" || type === "investment") ? parseFloat(quantity) : null,
        buy_price: buyPrice ? parseFloat(buyPrice) : null,
        current_price: currentPrice ? parseFloat(currentPrice) : null,
        value: finalValue,
        coin_id: type === "crypto" ? coinId : null,
        description: description || null,
        currency: "IDR"
      })

      if (error) throw error

      setOpen(false)
      setName(""); setQuantity(""); setBuyPrice(""); setCurrentPrice(""); setValue(""); setCoinId("");
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal simpan")
    } finally {
      setLoading(false)
    }
  }

  const isMarketAsset = type === "crypto" || type === "investment"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Tambah Aset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Tambah Data Keuangan</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={type} onValueChange={(v: AssetType) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spending_account">Spending</SelectItem>
                  <SelectItem value="cash">Simpanan</SelectItem>
                  <SelectItem value="investment">Investasi</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="property">Properti</SelectItem>
                  <SelectItem value="receivable">Piutang</SelectItem>
                  <SelectItem value="debt">Utang</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama Aset</Label>
              <Input placeholder="BCA, Rumah, ETH" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>

          {type === "crypto" && (
            <div className="p-3 bg-blue-50/50 rounded-lg space-y-3 border border-blue-100">
              <Label className="text-blue-700 font-semibold text-xs uppercase">Market Price</Label>
              <div className="flex gap-2">
                <Select value={coinId} onValueChange={setCoinId}>
                  <SelectTrigger className="flex-1 bg-white"><SelectValue placeholder="Pilih Koin..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                    <SelectItem value="solana">Solana (SOL)</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={fetchLatestPrice} disabled={fetchingPrice} className="bg-white">
                  <RefreshCw className={`h-4 w-4 ${fetchingPrice ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          )}

          {isMarketAsset && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border">
              <div className="space-y-2">
                <Label>QTY</Label>
                <Input type="number" step="any" value={quantity} onChange={(e) => { setQuantity(e.target.value); calculateValue(e.target.value, currentPrice); }} />
              </div>
              <div className="space-y-2">
                <Label>Harga Beli</Label>
                <Input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isMarketAsset ? "Harga Saat Ini" : "Nominal"}</Label>
              <Input 
                type="number" 
                value={isMarketAsset ? currentPrice : value} 
                onChange={(e) => {
                  if(isMarketAsset) {
                    setCurrentPrice(e.target.value);
                    calculateValue(quantity, e.target.value);
                  } else {
                    setValue(e.target.value);
                  }
                }} 
              />
            </div>
            <div className="space-y-2">
              <Label>Total Nilai</Label>
              <Input 
                type="number" 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                className={`font-bold ${type === "debt" ? "text-red-600 bg-red-50" : "text-blue-700 bg-blue-50"}`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea placeholder="Opsional..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <Button type="submit" className="w-full bg-blue-600" disabled={loading}>
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Simpan Data"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}