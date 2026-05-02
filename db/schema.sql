create table if not exists demo_users (
  id text primary key,
  workos_user_id text,
  email text not null,
  name text not null,
  role text not null,
  created_at timestamptz not null default now()
);

create table if not exists agents (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists resources (
  id text primary key,
  name text not null,
  resource_type text not null,
  category text not null,
  required_read_permission text not null,
  required_export_permission text,
  created_at timestamptz not null default now()
);

create table if not exists agent_visas (
  id text primary key,
  agent_id text not null references agents(id),
  permission text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id text primary key,
  occurred_at timestamptz not null default now(),
  actor_type text not null,
  actor_id text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  decision text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  workos_status text not null default 'not_sent',
  workos_error text
);
