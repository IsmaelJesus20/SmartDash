import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-my-custom-header': 'smartdash-app'
    }
  }
})

// Types para las tablas principales
export interface Profile {
  id: string
  email: string
  full_name?: string
  company_name?: string
  plan_type: 'free' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface DataFile {
  id: string
  project_id?: string
  name: string
  original_name: string
  file_path: string
  file_size: number
  file_type: string
  status: 'uploaded' | 'processing' | 'processed' | 'failed'
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  processed_at?: string
  error_message?: string
  rows_count?: number
  columns_count?: number
  created_at: string
  updated_at: string
}

export interface DataSchema {
  id: string
  file_id: string
  project_id?: string
  schema: any[] // JSONB con estructura de columnas
  row_count?: number
  column_count?: number
  created_at: string
}