import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Role = 'host' | 'required' | 'optional';
export type ParticipantStatus = 'pending' | 'completed';
export type BlockType = 'unavailable' | 'disliked';

export interface Group {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  deadline: string;
  grid_start_hour: number;
  grid_end_hour: number;
  created_at: string;
}

export interface Participant {
  id: string;
  group_id: string;
  name: string;
  role: Role;
  status: ParticipantStatus;
  created_at: string;
}

export interface TimeBlock {
  id: string;
  participant_id: string;
  date: string;
  slot_index: number;
  type: BlockType;
  created_at: string;
}
