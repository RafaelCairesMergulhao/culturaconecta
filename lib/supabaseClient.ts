import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Opcional. A rede em uso grava contas e publicações em data/network.json.
// Se um projeto Supabase for ligado depois, preencha .env.local (veja .env.example).
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
