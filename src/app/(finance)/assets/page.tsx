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
  Landmark 
} from "lucide-react"

// Tambahkan piutang dan debt ke konfigurasi visual
const ASSET_CONFIG = {
  cash: { label: "Tunai", icon: Wallet, color: "text-blue-500" },
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

  // LOGIKA PENTING: Utang dikurangi dari total kekayaan
  const totalAssets = assetsList.reduce((sum, a) => {
    if (a.type === 'debt') return sum - Number(a.value)
    return sum + Number(a.value)
  }, 0)

  // Mengelompokkan total per kategori untuk tampilan card kecil
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

      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Kekayaan Bersih (Net Worth)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${totalAssets < 0 ? 'text-red-600' : 'text-primary'}`}>
            {formatCurrency(totalAssets)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Total Aset - Total Utang
          </p>
        </CardContent>
      </Card>

      {/* Grid Kategori - Responsive col-2 ke col-4 */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {Object.entries(ASSET_CONFIG).map(([type, config]) => {
          const value = assetsByType[type] || 0
          const Icon = config.icon
          const isDebt = type === 'debt'

          return (
            <Card key={type} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                    <p className={`font-semibold text-sm truncate ${isDebt && value > 0 ? 'text-red-600' : ''}`}>
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