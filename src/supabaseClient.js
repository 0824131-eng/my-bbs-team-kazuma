import { createClient } from '@supabase/supabase-js';

// ↓ここにコピーした「Project URL」を貼り付け（シングルクォート ' ' で囲む）
const supabaseUrl = 'https://rvqpyqxaxekurhenohqd.supabase.co';

// ↓ここにコピーした「anon public Key」を貼り付け（シングルクォート ' ' で囲む）
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cXB5cXhheGVrdXJoZW5vaHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDUwMzEsImV4cCI6MjA4NDU4MTAzMX0.ZyJI5NWE7aDCkCTektWRjuQIu4DD-477-rC95TSVT4E';

export const supabase = createClient(supabaseUrl, supabaseKey);
