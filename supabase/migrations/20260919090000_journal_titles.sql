-- A journal entry gets a title ("Mom's surgery") above the details, the way a
-- circle topic does. Optional: older entries and quick notes have none.
alter table public.prayer_network_requests add column if not exists title text;
alter table public.prayer_network_requests drop constraint if exists prayer_network_requests_title_check;
alter table public.prayer_network_requests
  add constraint prayer_network_requests_title_check check (title is null or char_length(title) <= 120);
