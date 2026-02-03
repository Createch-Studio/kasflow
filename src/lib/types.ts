export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  currency: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  icon: string | null
  color: string | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  asset_id: string | null // Tambahkan baris ini agar terbaca di Edit/Add Dialog
  amount: number
  type: 'income' | 'expense'
  description: string | null
  date: string
  created_at: string
  updated_at: string
  category?: Category
  asset?: Asset // Tambahkan juga ini jika nanti Anda melakukan JOIN query
}

export interface Budget {
  id: string
  user_id: string
  category_id: string | null
  name: string
  amount: number
  period: 'weekly' | 'monthly' | 'yearly'
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string
  category?: Category
  spent?: number
}

export type AssetType = 'spending_account' | 'cash' | 'investment' | 'crypto' | 'property' | 'debt' | 'receivable' | 'other'

export interface Asset {
  id: string
  user_id: string
  name: string
  type: AssetType
  value: number
  currency: string
  description: string | null
  icon: string | null
  quantity: number | null
  buy_price: number | null
  current_price: number | null
  coin_id: string | null
  created_at: string
  updated_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  created_at: string
  updated_at: string
}
