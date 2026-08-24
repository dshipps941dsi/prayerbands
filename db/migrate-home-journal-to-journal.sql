-- One-time: fold the old inline Home "My Prayer Journal" (prayer_requests,
-- band-scoped: title / body / answered testimony) into the unified Journal
-- (prayer_network_requests, account-scoped) as private entries, so retiring the
-- Home inline journal loses nothing. Title + body + any "Answered" testimony
-- become the request text; created_at is preserved; audience is 'private'.
-- Guarded by NOT EXISTS on (user_id, created_at) so it is safe to re-run.
insert into public.prayer_network_requests
  (user_id, request_text, is_answered, answered_at, created_at, visibility, audience, public_name)
select pr.user_id,
       trim(both E'\n ' from
         coalesce(nullif(trim(pr.title),''),'')
         || case when nullif(trim(pr.body),'') is not null then E'\n\n' || trim(pr.body) else '' end
         || case when nullif(trim(pr.answered_testimony),'') is not null then E'\n\n✝ Answered: ' || trim(pr.answered_testimony) else '' end
       ),
       (pr.status = 'answered' or pr.answered_at is not null),
       pr.answered_at, pr.created_at, 'private', 'private', null
from public.prayer_requests pr
where pr.user_id is not null
  and coalesce(nullif(trim(pr.title),''), nullif(trim(pr.body),'')) is not null
  and not exists (
    select 1 from public.prayer_network_requests n
    where n.user_id = pr.user_id and n.created_at = pr.created_at
  );
