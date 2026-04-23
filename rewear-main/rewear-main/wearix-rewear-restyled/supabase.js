    // ============================================================
// WEARIX — Supabase Client Config
// ============================================================

const SUPABASE_URL = 'https://jtprrhppsleunzjbolbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cHJyaHBwc2xldW56amJvbGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzc1MjIsImV4cCI6MjA5MjM1MzUyMn0.OvXO8H2rHK9FIDB0nYpnxf1xMdLwlfqAi_8ihRADFZE';

// Load Supabase via CDN (added to each HTML page via <script> tag)
// This file is loaded AFTER the CDN script so `supabase` global is available

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
