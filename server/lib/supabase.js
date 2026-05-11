import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';

dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_KEY missing. Backend auth routes will fail until configured.');
}

export const supabase = createClient(url || '', serviceKey || '', {
  realtime: {
    transport: ws,
  },
});
