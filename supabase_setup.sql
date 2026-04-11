-- ═══════════════════════════════════════════════════════════════════
-- PRESUPRO STUDIO — Supabase Setup v2
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- Si ya ejecutaste la versión anterior, ejecutá primero:
--   drop table if exists budget_events cascade;
--   drop table if exists budgets_shared cascade;
-- ═══════════════════════════════════════════════════════════════════

-- ── Limpiar si existe versión anterior ───────────────────────────
drop table if exists budget_events cascade;
drop table if exists budgets_shared cascade;

-- ── 1. TABLA PRINCIPAL ───────────────────────────────────────────
create table budgets_shared (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        text not null default 'default',
  budget_data      jsonb not null,
  status           text not null default 'sent'
                   check (status in ('sent','viewed','accepted','rejected')),
  view_count       integer not null default 0,
  first_viewed_at  timestamptz,
  last_viewed_at   timestamptz,
  responded_at     timestamptz,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz
);

-- ── 2. TABLA DE EVENTOS ──────────────────────────────────────────
create table budget_events (
  id           uuid primary key default gen_random_uuid(),
  budget_id    uuid not null references budgets_shared(id) on delete cascade,
  event_type   text not null
               check (event_type in ('viewed','accepted','rejected')),
  user_agent   text,
  created_at   timestamptz not null default now()
);

-- ── 3. ÍNDICES ───────────────────────────────────────────────────
create index idx_budgets_tenant  on budgets_shared(tenant_id);
create index idx_budgets_status  on budgets_shared(status);
create index idx_events_budget   on budget_events(budget_id);

-- ── 4. RLS — SIMPLE Y PERMISIVO PARA ANON ───────────────────────
alter table budgets_shared enable row level security;
alter table budget_events   enable row level security;

-- Anon puede hacer todo en budgets_shared (leer, insertar, actualizar)
create policy "anon_all_budgets"
  on budgets_shared
  for all
  to anon
  using (true)
  with check (true);

-- Anon puede insertar eventos
create policy "anon_insert_events"
  on budget_events
  for insert
  to anon
  with check (true);

-- Anon puede leer eventos
create policy "anon_read_events"
  on budget_events
  for select
  to anon
  using (true);

-- ── 5. VERIFICACIÓN ──────────────────────────────────────────────
-- Después de ejecutar, deberías ver las tablas en Table Editor.
-- Para confirmar que funcionan, ejecutá:
--   select * from budgets_shared limit 1;
-- No debería dar error (puede devolver 0 filas, eso es normal).
