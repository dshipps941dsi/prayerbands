// /api/prayer-requests/create.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { title, body, visibility, userId } = req.body;

  if (!title || !userId) {
    return res.status(400).json({ error: 'title and userId are required' });
  }

  const { data, error } = await supabase
    .from('prayer_requests')
    .insert({ user_id: userId, title, body, visibility: visibility || 'network' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ request: data });
}