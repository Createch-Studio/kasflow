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

  // Label dinamis berdasarkan kategori
  const getNameLabel = () => {
    if (type === "debt") return "Nama Kreditur (Pemberi Utang)"
    if (type === "receivable") return "Nama Debitur (Penerima Piutang)"
    return "Nama Aset"
  }

  const getPlaceholder = () => {
    if (type === "debt") return "Contoh: Bank BCA, Teman A"
    if (type === "receivable") return "Contoh: Teman B, Client X"
    return "Contoh: Tabungan Utama, Rumah Kelapa Gading"
  }

  // PERBAIKAN: Fungsi fetch disesuaikan dengan struktur API Route Anda
  const fetchLatestPrice = async () => {
    if (!coinId) return alert("Pilih koin terlebih dahulu")
    setFetchingPrice(true)
    try {
      const res = await fetch(`/api/crypto/price?coinId=${coinId}`)
      const data = await res.json()
      
      // Mengambil dari data.prices sesuai struktur yang kita buat di API
      if (data.prices && data.prices[coinId]) {
        const price = data.prices[coinId]
        setCurrentPrice(price.toString())
        
        // Update state 'value' (total nominal) secara otomatis
        if (quantity) {
          const total = parseFloat(quantity) * price
          setValue(Math.round(total).toString())
        }
      } else {
        alert("Gagal mendapatkan harga untuk koin ini")
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

      // Pastikan nilai selalu positif sebelum masuk DB (dashboard pakai rumus Aset - Utang)
      const finalValue = Math.abs(parseFloat(value) || 0)

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
      // Reset form
      setName(""); setQuantity(""); setBuyPrice(""); setCurrentPrice(""); setValue(""); setCoinId(""); setDescription("");
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
          <Plus className="mr-2 h-4 w-4" /> Tambah Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah {type === "debt" ? "Kewajiban" : "Aset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={type} onValueChange={(v: AssetType) => {
              setType(v);
              setValue(""); // Reset value saat ganti kategori agar bersih
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spending_account">Spending Account</SelectItem>
                <SelectItem value="cash">Simpanan (Tunai/Bank)</SelectItem>
                <SelectItem value="property">Properti</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="investment">Investasi Lainnya</SelectItem>
                <SelectItem value="receivable">Piutang (Uang di Orang Lain)</SelectItem>
                <SelectItem value="debt">Utang (Kewajiban)</SelectItem>
                <SelectItem value="other">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{getNameLabel()}</Label>
            <Input 
              placeholder={getPlaceholder()} 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          {type === "crypto" && (
            <div className="p-3 bg-blue-50/50 rounded-lg space-y-3 border border-blue-100">
              <Label className="text-blue-700 font-semibold text-xs uppercase">Koneksi Market</Label>
              <div className="flex gap-2">
                <Select value={coinId} onValueChange={setCoinId}>
                  <SelectTrigger className="flex-1 bg-white"><SelectValue placeholder="Pilih Koin..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                    <SelectItem value="solana">Solana (SOL)</SelectItem>
                    <SelectItem value="ripple">XRP (XRP)</SelectItem>
                    <SelectItem value="chainlink">Chainlink (LINK)</SelectItem>
                    <SelectItem value="usdcoin">USDC (USDC)</SelectItem>
                    <SelectItem value="tether">Tether (USDT)</SelectItem>
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
                <Label>Jumlah (QTY)</Label>
                <Input 
                  type="number" 
                  step="any" 
                  value={quantity} 
                  onChange={(e) => { 
                    setQuantity(e.target.value); 
                    calculateValue(e.target.value, currentPrice); 
                  }} 
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Harga Beli</Label>
                <Input 
                  type="number" 
                  value={buyPrice} 
                  onChange={(e) => setBuyPrice(e.target.value)} 
                  placeholder="Rp"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {isMarketAsset ? "Harga Pasar Saat Ini (Per Unit)" : "Nominal / Saldo"}
            </Label>
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
              placeholder="Masukkan angka..."
              className={type === "debt" ? "focus-visible:ring-red-500" : ""}
            />
            {type === "debt" && <p className="text-[10px] text-red-500 italic">*Akan mengurangi total kekayaan bersih</p>}
          </div>

          <div className="space-y-2">
            <Label>Keterangan (Opsional)</Label>
            <Textarea 
              placeholder="Tambahkan catatan jika perlu..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Simpan Data"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}