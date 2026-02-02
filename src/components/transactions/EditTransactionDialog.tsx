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
import { Pencil, Loader2 } from "lucide-react"
import type { Transaction, Category } from "@/lib/types"

interface EditTransactionDialogProps {
  transaction: Transaction
  categories: Category[]
}

export function EditTransactionDialog({ transaction, categories }: EditTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // State diisi dengan data awal dari props transaction
  const [type, setType] = useState<"income" | "expense">(transaction.type as "income" | "expense")
  const [amount, setAmount] = useState(transaction.amount.toString())
  const [categoryId, setCategoryId] = useState(transaction.category_id)
  const [description, setDescription] = useState(transaction.description || "")
  const [date, setDate] = useState(transaction.date)
  
  const router = useRouter()
  const supabase = createClient()

  const filteredCategories = categories.filter((c) => c.type === type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from("transactions")
      .update({
        type,
        amount: parseFloat(amount),
        category_id: categoryId,
        description: description || null,
        date,
      })
      .eq("id", transaction.id)

    if (error) {
      alert("Gagal memperbarui transaksi")
    } else {
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaksi</DialogTitle>
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
                  setCategoryId("")
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
            <Label htmlFor="edit-amount">Jumlah (Rp)</Label>
            <Input
              id="edit-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Kategori */}
          <div className="space-y-2">
            <Label htmlFor="edit-category">Kategori</Label>
            <Select value={categoryId ?? ""} onValueChange={setCategoryId} required>
              <SelectTrigger>
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
                  <SelectItem value="" disabled>Belum ada kategori</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tanggal */}
          <div className="space-y-2">
            <Label htmlFor="edit-date">Tanggal</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Keterangan */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Keterangan (Opsional)</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Masukkan keterangan..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !categoryId}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Perubahan"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}