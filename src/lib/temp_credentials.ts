// TEMPORARY FILE - TO BE DELETED
// This file contains hardcoded credentials for Vercel deployment configuration
// DELETE THIS FILE IMMEDIATELY AFTER COPYING THE VALUES

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://yctdrwogilljanzxcgow.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdGRyd29naWxsamFuenhjZ293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODcwMTIsImV4cCI6MjA3NTY2MzAxMn0.azBZebI22BpMy2LoXkm2eiHb1qJhiApXwUkv-QDGd8w";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
