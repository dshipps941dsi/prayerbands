-- A permanent, opaque, unguessable per-account handle for connecting to a
-- person by their QR / link — never their email, phone, name, or band, just a
-- random 12-char token that resolves to "connect with <first name>".
create or replace function public.gen_connect_code()
  returns text language plpgsql security definer set search_path to 'public' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text; i int; attempts int := 0;
begin
  loop
    code := '';
    for i in 1..12 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where connect_code = code);
    attempts := attempts + 1;
    if attempts > 50 then raise exception 'gen_connect_code: could not find a free code'; end if;
  end loop;
  return code;
end; $$;

alter table public.profiles add column if not exists connect_code text unique;
update public.profiles set connect_code = public.gen_connect_code() where connect_code is null;
alter table public.profiles alter column connect_code set default public.gen_connect_code();
alter table public.profiles alter column connect_code set not null;
revoke execute on function public.gen_connect_code() from public, anon, authenticated;
