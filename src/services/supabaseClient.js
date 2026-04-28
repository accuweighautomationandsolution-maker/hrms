import { createClient } from '@supabase/supabase-js'

// Vite-specific way to access environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Initialize and export the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
