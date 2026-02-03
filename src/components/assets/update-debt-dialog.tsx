"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import type { Asset } from "@/lib/types"

interface UpdateDebtDialogProps {
  asset: Asset
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpdateDebtDialog({ asset, open, onOpenChange }: UpdateDebtDialogProps) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [paymentType, setPaymentType] = useState<"partial" | "full">("partial")
  
  const router = useRouter()
  const supabase = createClient()
  const isDebt = asset.type === "debt"

  const handleUpdate = async () => {
    setLoading(true)
    const payAmount = paymentType === "full" ? Number(asset.value) : Number(amount)
    const newValue = Number(asset.value) - payAmount

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Update saldo di tabel Assets
      if (newValue <= 0) {
        // Jika lunas, bisa pilih hapus atau set 0. Di sini kita set 0.
        await supabase.from("assets").update({ value: 0, updated_at: new Date().toISOString() }).eq("id", asset.id)
      } else {
        await supabase.from("assets").update({ value: newValue, updated_at: new Date().toISOString() }).eq("id", asset.id)
      }

      // 2. Catat ke tabel Transactions agar sinkron dengan laporan bulanan
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: isDebt ? "expense" : "income", // Bayar utang = pengeluaran, terima piutang = pemasukan
        amount: payAmount,
        category_id: null, // Bisa disesuaikan jika ada kategori khusus 'Hutang'
        description: `${isDebt ? 'Pembayaran' : 'Penerimaan'} ${asset.name}`,
        date: new Date().toISOString().split('T')[0],
      })

      onOpenChange(false)
      router.refresh()
    } catch (_error) {
      alert("Terjadi kesalahan saat memperbarui data.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isDebt ? "Bayar Utang" : "Terima Piutang"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-sm bg-muted p-3 rounded-lg">
            <p className="text-muted-foreground">Total {isDebt ? "Utang" : "Piutang"}:</p>
            <p className="text-lg font-bold">{formatCurrency(Number(asset.value))}</p>
          </div>
          
          <RadioGroup value={paymentType} onValueChange={(v: any) => setPaymentType(v)} className="grid grid-cols-2 gap-4">
            <div>
              <RadioGroupItem value="partial" id="partial" className="peer sr-only" />
              <Label htmlFor="partial" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                <span>Sebagian</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="full" id="full" className="peer sr-only" />
              <Label htmlFor="full" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                <span>Pelunasan</span>
              </Label>
            </div>
          </RadioGroup>

          {paymentType === "partial" && (
            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah {isDebt ? "Dibayar" : "Diterima"}</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Masukkan nominal..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleUpdate} disabled={loading || (paymentType === 'partial' && !amount)}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Konfirmasi {isDebt ? "Pembayaran" : "Penerimaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}