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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const [paymentType, setPaymentType] = useState<string>("partial")
  
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

      // 1. Update saldo Assets
      await supabase.from("assets").update({ 
        value: newValue <= 0 ? 0 : newValue, 
        updated_at: new Date().toISOString() 
      }).eq("id", asset.id)

      // 2. Catat Transaksi
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: isDebt ? "expense" : "income",
        amount: payAmount,
        description: `${isDebt ? 'Bayar' : 'Terima'} ${asset.name} (${paymentType === 'full' ? 'Lunas' : 'Cicil'})`,
        date: new Date().toISOString().split('T')[0],
      })

      onOpenChange(false)
      router.refresh()
    } catch (_error) {
      alert("Gagal memperbarui data.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isDebt ? "Update Utang" : "Update Piutang"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="bg-muted/50 p-4 rounded-xl border border-dashed text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Sisa Saldo</p>
            <p className="text-xl font-bold">{formatCurrency(Number(asset.value))}</p>
          </div>
          
          <div className="space-y-2">
            <Label>Metode Update</Label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partial">Bayar Sebagian (Cicil)</SelectItem>
                <SelectItem value="full">Pelunasan (Full)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentType === "partial" && (
            <div className="space-y-2">
              <Label htmlFor="amount">Nominal yang {isDebt ? "Dibayar" : "Diterima"}</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            className="w-full" 
            onClick={handleUpdate} 
            disabled={loading || (paymentType === 'partial' && !amount)}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}