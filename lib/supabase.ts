import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.https://blheublmkgsiottnxtck.supabase.co
const supabaseAnonKey = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaGV1Ymxta2dzaW90dG54dGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjQ4NTIsImV4cCI6MjA5MTMwMDg1Mn0.ZGski1cdBpnbeB8-1qXi_2L9CQzqgzikWgKE_uSv6pQ

export const supabase = createClient(supabaseUrl, supabaseAnonKey)