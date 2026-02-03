import { createClient } from "@/lib/supabase/server"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AssetList } from "@/components/assets/asset-list"
import { AddAssetDialog } from "@/components/assets/add-asset-dialog"
import { 
  Wallet, 
  TrendingUp, 
  Bitcoin, 
  Home, 
  MoreHorizontal, 
  HandCoins, 
  Landmark,
  CreditCard // Icon baru untuk Spending Account
} from "lucide-react"

// Tambahkan spending_account ke konfigurasi visual
const ASSET_CONFIG = {
  spending_account: { label: "Spending", icon: CreditCard, color: "text-indigo-500" },
  cash: { label: "Simpanan", icon: Wallet, color: "text-blue-500" },
  investment: { label: "Investasi", icon: TrendingUp, color: "text-green-500" },
  crypto: { label: "Crypto", icon: Bitcoin, color: "text-orange-500" },
  property: { label: "Properti", icon: Home, color: "text-purple-500" },
  receivable: { label: "Piutang", icon: HandCoins, color: "text-emerald-500" },
  debt: { label: "Utang", icon: Landmark, color: "text-red-500" },
  other: { label: "Lainnya", icon: MoreHorizontal, color: "text-gray-500" },
}

export default async function AssetsPage() {
  const supabase = await createClient()
  
  const { data: assets } = await supabase
    .from("assets")
    .select("*")
    .order("value", { ascending: false })

  const assetsList = assets || []

  // LOGIKA: Utang dikurangi dari total kekayaan
  const totalAssets = assetsList.reduce((sum, a) => {
    if (a.type === 'debt') return sum - Number(a.value)
    return sum + Number(a.value)
  }, 0)

  // Mengelompokkan total per kategori
  const assetsByType: Record<string, number> = assetsList.reduce((acc, asset) => {
    acc[asset.type] = (acc[asset.type] || 0) + Number(asset.value)
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Aset & Kewajiban</h1>
          <p className="text-muted-foreground">Kelola kekayaan bersih (Net Worth) Anda</p>
        </div>
        <AddAssetDialog />
      </div>

      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Total Kekayaan Bersih (Net Worth)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-4xl font-black ${totalAssets < 0 ? 'text-red-600' : 'text-primary'}`}>
            {formatCurrency(totalAssets)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] bg-background px-2 py-0.5 rounded border font-medium">
              RUMUS: TOTAL ASET - TOTAL UTANG
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grid Kategori - Dioptimalkan untuk banyak kategori (8 item) */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
        {Object.entries(ASSET_CONFIG).map(([type, config]) => {
          const value = assetsByType[type] || 0
          const Icon = config.icon
          const isDebt = type === 'debt'

          return (
            <Card key={type} className="overflow-hidden border-none shadow-sm bg-muted/30">
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  <div className={`p-2 w-fit rounded-lg bg-background shadow-sm ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{config.label}</p>
                    <p className={`font-bold text-xs truncate ${isDebt && value > 0 ? 'text-red-600' : ''}`}>
                      {isDebt && value > 0 ? "-" : ""}{formatCurrency(value)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <AssetList assets={assetsList} />
    </div>
  )
}