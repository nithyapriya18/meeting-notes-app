import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Meeting = {
  id: string;
  user_id?: string;
  title: string;
  notes: string;
  transcript: string;
  speaker_tags: Record<string, string>;
  duration_minutes: number;
  is_billable: boolean;
  template_type: string;
  created_at: string;
  updated_at?: string;
};

export type Action = {
  id: string;
  action_text: string;
  assignee: string;
  due_date: string;
  speaker: string;
  completed: boolean;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  plan: string;
  created_at: string;
};