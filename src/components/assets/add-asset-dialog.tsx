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
  
  // Field Khusus Keuangan/Crypto
  const [quantity, setQuantity] = useState("") 
  const [buyPrice, setBuyPrice] = useState("")
  const [currentPrice, setCurrentPrice] = useState("")
  const [coinId, setCoinId] = useState("")
  const [value, setValue] = useState("") // Total Nilai

  const router = useRouter()
  const supabase = createClient()

  // Fungsi Manual Klik untuk Ambil Harga
  const fetchLatestPrice = async () => {
    if (!coinId) return alert("Pilih koin terlebih dahulu")
    
    setFetchingPrice(true)
    try {
      const res = await fetch(`/api/crypto/price?ids=${coinId}`)
      const data = await res.json()
      
      if (data.prices && data.prices[coinId]) {
        const price = data.prices[coinId]
        setCurrentPrice(price.toString())
        
        // Hitung Value otomatis jika QTY sudah ada
        if (quantity) {
          const total = parseFloat(quantity) * price
          setValue(Math.round(total).toString())
        }
      }
    } catch (err) {
      alert("Gagal mengambil harga terbaru")
    } finally {
      setFetchingPrice(false)
    }
  }

  // Hitung Value otomatis saat QTY atau Harga Saat Ini berubah manual
  const calculateValue = (qty: string, price: string) => {
    const q = parseFloat(qty) || 0
    const p = parseFloat(price) || 0
    setValue(Math.round(q * p).toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Sesi berakhir")

      const { error } = await supabase.from("assets").insert({
        user_id: user.id,
        name,
        type,
        quantity: type === "crypto" || type === "investment" ? parseFloat(quantity) : null,
        buy_price: buyPrice ? parseFloat(buyPrice) : null,
        current_price: currentPrice ? parseFloat(currentPrice) : null,
        value: parseFloat(value) || 0,
        coin_id: type === "crypto" ? coinId : null,
        description: description || null,
        currency: "IDR"
      })

      if (error) throw error

      setOpen(false)
      setName("")
      setQuantity("")
      setBuyPrice("")
      setCurrentPrice("")
      setValue("")
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal simpan"
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600">
          <Plus className="mr-2 h-4 w-4" /> Tambah Aset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Data Aset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select value={type} onValueChange={(v: AssetType) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spending_account">Spending</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="investment">Investasi</SelectItem>
                  <SelectItem value="debt">Utang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama Aset</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>

          {type === "crypto" && (
            <div className="p-3 bg-slate-50 rounded-lg space-y-3 border">
              <div className="space-y-2">
                <Label>Pilih Koin</Label>
                <div className="flex gap-2">
                  <Select value={coinId} onValueChange={setCoinId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                      <SelectItem value="solana">Solana (SOL)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={fetchLatestPrice}
                    disabled={fetchingPrice}
                  >
                    <RefreshCw className={`h-4 w-4 ${fetchingPrice ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>QTY</Label>
                  <Input 
                    type="number" 
                    step="any" 
                    value={quantity} 
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      calculateValue(e.target.value, currentPrice);
                    }} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Harga Beli (Rp)</Label>
                  <Input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Harga Saat Ini (Rp)</Label>
              <Input 
                type="number" 
                value={currentPrice} 
                onChange={(e) => {
                  setCurrentPrice(e.target.value);
                  calculateValue(quantity, e.target.value);
                }} 
              />
            </div>
            <div className="space-y-2">
              <Label>Total Nilai (Value)</Label>
              <Input 
                type="number" 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                className="bg-blue-50 font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <Button type="submit" className="w-full bg-blue-600" disabled={loading}>
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Simpan Data"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}