import { sql } from "drizzle-orm";
import { db } from "@/db";
import { bootstrapAdminsIfEmpty } from "@/lib/admin-bootstrap";

/**
 * Production bootstrap.
 *
 * Creates the schema if it doesn't exist (all tables, indexes,
 * relationships and constraints), then provisions the three staff
 * authentication accounts (founder / admin / finance) when the admin
 * table is empty so logins work immediately after any deployment.
 *
 * No demo, sample, or test data is ever inserted — every customer,
 * provider, job, payment and review is created exclusively by real
 * users through the live application.
 */
const DDL = sql`
create table if not exists providers (
  id serial primary key,
  business_name text not null,
  owner_name text not null,
  email text not null,
  password_hash text,
  phone text not null,
  whatsapp text,
  province text not null,
  city text not null,
  suburb text,
  address text,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  service_radius_km integer not null default 30,
  categories jsonb not null default '[]'::jsonb,
  provinces jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  badges jsonb not null default '[]'::jsonb,
  bio text not null default '',
  website text,
  years_experience integer not null default 1,
  employees integer not null default 1,
  emergency_available boolean not null default false,
  operating_hours text not null default 'Mon–Fri 08:00–17:00',
  hourly_rate integer not null default 450,
  rating numeric(3,2) not null default 5.00,
  review_count integer not null default 0,
  jobs_completed integer not null default 0,
  response_minutes integer not null default 30,
  success_rate integer not null default 90,
  accent text not null default '#0F9E99',
  logo_url text,
  status text not null default 'pending',
  plan text not null default 'free',
  application_note text not null default '',
  application_decided_by text,
  application_decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table providers add column if not exists logo_url text;
alter table providers add column if not exists password_hash text;
alter table providers add column if not exists application_note text not null default '';
alter table providers add column if not exists application_decided_by text;
alter table providers add column if not exists application_decided_at timestamptz;
create unique index if not exists providers_email_idx on providers (lower(email));

create table if not exists provider_documents (
  id serial primary key,
  provider_id integer not null,
  document_type text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  file_data text not null,
  status text not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists provider_documents_provider_idx on provider_documents (provider_id);

create table if not exists jobs (
  id serial primary key,
  customer_id integer,
  reference text not null,
  category_slug text not null,
  title text not null,
  description text not null default '',
  address text not null default '',
  suburb text not null default '',
  city text not null,
  province text not null,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  urgency text not null default 'this-week',
  budget_min integer,
  budget_max integer,
  contact_method text not null default 'whatsapp',
  preferred_times text not null default '',
  photos jsonb not null default '[]'::jsonb,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null default '',
  status text not null default 'open',
  ai_summary text not null default '',
  ai_complexity text not null default 'standard',
  ai_budget_low integer not null default 0,
  ai_budget_high integer not null default 0,
  broadcast_count integer not null default 0,
  quote_deadline timestamptz,
  accepted_quote_id integer,
  created_at timestamptz not null default now()
);
alter table jobs add column if not exists customer_id integer;

create table if not exists quotes (
  id serial primary key,
  job_id integer not null,
  provider_id integer not null,
  amount integer not null,
  message text not null default '',
  availability text not null default 'Within 48 hours',
  warranty_months integer not null default 6,
  includes_materials boolean not null default true,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id serial primary key,
  provider_id integer not null,
  job_id integer,
  author text not null,
  city text not null default '',
  rating integer not null default 5,
  quality integer not null default 5,
  communication integer not null default 5,
  professionalism integer not null default 5,
  punctuality integer not null default 5,
  value integer not null default 5,
  recommend boolean not null default true,
  comment text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id serial primary key,
  job_id integer not null,
  provider_id integer,
  sender text not null default 'customer',
  author_name text not null default 'Customer',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists broadcasts (
  id serial primary key,
  job_id integer not null,
  provider_id integer not null,
  distance_km numeric(6,2) not null default 0,
  match_score integer not null default 0,
  channels jsonb not null default '[]'::jsonb,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

create table if not exists subscribers (
  id serial primary key,
  email text not null,
  source text not null default 'footer',
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id serial primary key,
  job_id integer not null,
  quote_id integer not null,
  provider_id integer not null,
  total_amount_cents integer not null,
  commission_cents integer not null,
  provider_payout_cents integer not null,
  commission_rate numeric(5,4) not null default 0.1300,
  yoco_checkout_id text,
  yoco_payment_id text,
  yoco_redirect_url text,
  status text not null default 'pending',
  payout_status text not null default 'pending',
  payout_reference text,
  reference text not null,
  method text not null default 'yoco',
  payout_requested_at timestamptz,
  payout_notes text not null default '',
  processed_by text,
  meta jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  payout_at timestamptz,
  created_at timestamptz not null default now()
);
alter table payments add column if not exists payout_requested_at timestamptz;
alter table payments add column if not exists payout_notes text not null default '';
alter table payments add column if not exists processed_by text;
alter table payments add column if not exists method text not null default 'yoco';

create table if not exists admin_users (
  id serial primary key,
  email text not null,
  name text not null,
  password_hash text not null,
  role text not null default 'admin',
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id serial primary key,
  actor text not null,
  action text not null,
  target text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists admin_password_codes (
  id serial primary key,
  admin_user_id integer not null,
  admin_email text not null,
  code_hash text not null,
  purpose text not null default 'password_change',
  requested_by_ip text,
  used boolean not null default false,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists admin_password_codes_email_idx on admin_password_codes (lower(admin_email));

create table if not exists password_reset_codes (
  id serial primary key,
  account_type text not null,
  account_id integer not null,
  email text not null,
  code_hash text not null,
  requested_by_ip text,
  used boolean not null default false,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_reset_codes_email_idx on password_reset_codes (lower(email));

create table if not exists customers (
  id serial primary key,
  name text not null,
  email text not null,
  phone text not null default '',
  password_hash text not null,
  province text not null default 'Gauteng',
  city text not null default 'Johannesburg',
  suburb text not null default '',
  address text not null default '',
  contact_method text not null default 'whatsapp',
  wallet_cents integer not null default 0,
  status text not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists customers_email_idx on customers (lower(email));

create table if not exists wallet_transactions (
  id serial primary key,
  customer_id integer not null,
  type text not null,
  amount_cents integer not null,
  balance_after_cents integer not null default 0,
  description text not null default '',
  reference text not null,
  status text not null default 'completed',
  job_id integer,
  yoco_checkout_id text,
  created_at timestamptz not null default now()
);

create table if not exists inbox_messages (
  id serial primary key,
  customer_id integer,
  customer_email text not null,
  type text not null default 'new_quote',
  title text not null,
  body text not null default '',
  job_id integer,
  quote_id integer,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists withdrawals (
  id serial primary key,
  customer_id integer not null,
  amount_cents integer not null,
  reference text not null,
  bank_name text not null,
  account_holder text not null,
  account_number text not null,
  branch_code text not null default '',
  account_type text not null default 'cheque',
  status text not null default 'requested',
  payout_reference text,
  processed_by text,
  admin_notes text not null default '',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
`;

let initPromise: Promise<void> | null = null;

async function boot() {
  await db.execute(DDL);
  // Production staff accounts are guaranteed to exist on every deployment.
  await bootstrapAdminsIfEmpty();
}

/** Idempotent schema bootstrap — runs once per process. */
export function ensureSeeded(): Promise<void> {
  if (!initPromise) {
    initPromise = boot().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}
