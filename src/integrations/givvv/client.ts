import { createClient } from '@supabase/supabase-js';

// Givvv Supabase connection
// This connects TicketFlo to Givvv's database for donation features
const givvvUrl = import.meta.env.VITE_GIVVV_SUPABASE_URL;
const givvvAnonKey = import.meta.env.VITE_GIVVV_SUPABASE_ANON_KEY;

export const givvvClient = givvvUrl && givvvAnonKey
  ? createClient(givvvUrl, givvvAnonKey)
  : null;

export function isGivvvConfigured(): boolean {
  return !!givvvClient;
}
