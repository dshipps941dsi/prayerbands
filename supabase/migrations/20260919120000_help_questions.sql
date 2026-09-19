-- What people ask the help assistant, and what it said back. Read in Admin →
-- Contacts to see what the FAQ is missing. Service role only.
create table if not exists public.help_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text,
  link_href text,
  answered boolean not null default true,
  user_id uuid references auth.users(id) on delete set null,
  place text,
  created_at timestamptz not null default now()
);

create index if not exists help_questions_created_idx on public.help_questions (created_at desc);

alter table public.help_questions enable row level security;
grant all on public.help_questions to service_role;
