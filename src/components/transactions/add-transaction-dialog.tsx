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
import { Plus, Loader2 } from "lucide-react"
import type { Category } from "@/lib/types"

interface AddTransactionDialogProps {
  categories: Category[]
}

export function AddTransactionDialog({ categories }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<"income" | "expense">("expense")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const router = useRouter()
  const supabase = createClient()

  const filteredCategories = categories.filter((c) => c.type === type)

  // FUNGSI HANDLESUBMIT TUNGGAL DENGAN VALIDASI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 1. Validasi Wajib Kategori
    if (!categoryId || categoryId === "") {
      alert("Silakan pilih kategori terlebih dahulu")
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 2. Logika penentuan tabel berdasarkan file SQL Anda
    // Pemasukan (income) -> tabel 'sales', Pengeluaran (expense) -> tabel 'expenses'
    const isIncome = type === "income"
    const targetTable = isIncome ? "sales" : "expenses"

    // Menyesuaikan nama kolom sesuai schema SQL (sales menggunakan 'sale_date' dan 'total_amount')
    const payload = isIncome ? {
      user_id: user.id,
      sale_date: date,
      total_amount: parseFloat(amount),
      notes: description || null,
      // Jika tabel sales Anda belum memiliki category_id, pastikan sudah di-alter di SQL
      category_id: categoryId 
    } : {
      user_id: user.id,
      date: date,
      amount: parseFloat(amount),
      description: description,
      category_id: categoryId
    }

    const { error } = await supabase.from(targetTable).insert(payload)

    if (error) {
      alert("Gagal menyimpan data: " + error.message)
    } else {
      setOpen(false)
      resetForm()
      router.refresh()
    }

    setLoading(false)
  }

  const resetForm = () => {
    setType("expense")
    setAmount("")
    setCategoryId("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Transaksi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Transaksi Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipe Transaksi */}
          <div className="space-y-2">
            <Label>Tipe Transaksi</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "income" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setType("income")
                  setCategoryId("") // Reset kategori saat pindah tipe
                }}
              >
                Pemasukan
              </Button>
              <Button
                type="button"
                variant={type === "expense" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setType("expense")
                  setCategoryId("")
                }}
              >
                Pengeluaran
              </Button>
            </div>
          </div>

          {/* Jumlah */}
          <div className="space-y-2">
            <Label htmlFor="amount">Jumlah (Rp)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
            />
          </div>

          {/* Kategori - WAJIB */}
          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select 
              value={categoryId} 
              onValueChange={setCategoryId} 
              required
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Belum ada kategori {type === "income" ? "pemasukan" : "pengeluaran"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tanggal */}
          <div className="space-y-2">
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Keterangan */}
          <div className="space-y-2">
            <Label htmlFor="description">Keterangan (Opsional)</Label>
            <Textarea
              id="description"
              placeholder="Masukkan keterangan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !categoryId || categoryId === "none"}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Transaksi"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}