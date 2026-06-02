import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { name, prefix, subdomain, location, website, pastor, email, password } = await req.json();

    if (!name || !prefix || !email || !password || !pastor) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check prefix and subdomain aren't already taken
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .or(`prefix.eq.${prefix},subdomain.eq.${subdomain}`)
      .maybeSingle();

    if (existing) {
      return Response.json(
        { error: 'A church with a similar name already exists. Please contact support.' },
        { status: 409 }
      );
    }

    // 2. Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: pastor },
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // 3. Create profile
    const masterId = 'M-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    await supabase.from('profiles').insert({
      id: userId,
      master_id: masterId,
      display_name: pastor,
      email,
    });

    // 4. Create the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        prefix: prefix.toUpperCase(),
        subdomain: subdomain.toLowerCase(),
        location: location || null,
        website: website || null,
        admin_id: userId,
        plan: 'ministry',
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // 5. Link profile to org
    await supabase
      .from('profiles')
      .update({ org_id: org.id })
      .eq('id', userId);

    return Response.json({ success: true, org_id: org.id, subdomain });

  } catch (err) {
    console.error('Onboard error:', err);
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}