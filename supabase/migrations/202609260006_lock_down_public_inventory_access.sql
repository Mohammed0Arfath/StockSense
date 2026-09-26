-- Repair deployments where default Supabase grants or policies exposed
-- operational data to anon/PUBLIC. Authenticated application access is retained.
do $$
declare
  relation_name text;
  policy_row record;
  protected_relations text[] := array[
    'profiles','categories','products','warehouses','locations','stock_items',
    'receipts','receipt_lines','deliveries','delivery_lines','internal_transfers',
    'transfer_lines','stock_adjustments','reordering_rules','notifications',
    'operation_status_history','move_history'
  ];
begin
  foreach relation_name in array protected_relations loop
    execute format('alter table public.%I enable row level security', relation_name);

    -- PUBLIC includes anon. Remove any policy that can grant access to either,
    -- while preserving policies whose role list is explicitly authenticated.
    for policy_row in
      select pol.polname
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class cls on cls.oid = pol.polrelid
      join pg_catalog.pg_namespace ns on ns.oid = cls.relnamespace
      where ns.nspname = 'public'
        and cls.relname = relation_name
        and (
          0 = any(pol.polroles)
          or (select oid from pg_catalog.pg_roles where rolname = 'anon') = any(pol.polroles)
        )
    loop
      execute format('drop policy %I on public.%I', policy_row.polname, relation_name);
    end loop;
  end loop;
end $$;

-- Make the intended authenticated read policy explicit for inventory tables.
do $$
declare
  relation_name text;
  protected_relations text[] := array[
    'categories','products','warehouses','locations','stock_items','receipts',
    'receipt_lines','deliveries','delivery_lines','internal_transfers',
    'transfer_lines','stock_adjustments','reordering_rules',
    'operation_status_history','move_history'
  ];
begin
  foreach relation_name in array protected_relations loop
    if not exists (
      select 1 from pg_catalog.pg_policy pol
      join pg_catalog.pg_class cls on cls.oid = pol.polrelid
      join pg_catalog.pg_namespace ns on ns.oid = cls.relnamespace
      where ns.nspname = 'public' and cls.relname = relation_name
        and pol.polcmd in ('r','*')
        and (select oid from pg_catalog.pg_roles where rolname = 'authenticated') = any(pol.polroles)
    ) then
      execute format(
        'create policy authenticated_read on public.%I for select to authenticated using (true)',
        relation_name
      );
    end if;
  end loop;
end $$;

-- Profiles contain internal names, roles, and warehouse assignments. The
-- application uses the authenticated organization roster; anon gets no access.
drop policy if exists profile_org_read on public.profiles;
create policy profile_org_read on public.profiles
  for select to authenticated using (true);

-- Notifications remain private to their owning authenticated user.
drop policy if exists notifications_self_read on public.notifications;
create policy notifications_self_read on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- Remove grants inherited from defaults, then grant only application needs.
revoke all privileges on table
  public.profiles, public.categories, public.products, public.warehouses,
  public.locations, public.stock_items, public.receipts, public.receipt_lines,
  public.deliveries, public.delivery_lines, public.internal_transfers,
  public.transfer_lines, public.stock_adjustments, public.reordering_rules,
  public.notifications, public.operation_status_history, public.move_history
from public, anon, authenticated;

grant select on table
  public.profiles, public.categories, public.products, public.warehouses,
  public.locations, public.stock_items, public.receipts, public.receipt_lines,
  public.deliveries, public.delivery_lines, public.internal_transfers,
  public.transfer_lines, public.stock_adjustments, public.reordering_rules,
  public.notifications, public.operation_status_history, public.move_history
to authenticated;

-- These document writes remain subject to the existing role-aware RLS policies.
grant insert, update, delete on table
  public.categories, public.products, public.warehouses, public.locations,
  public.reordering_rules, public.receipts, public.deliveries,
  public.internal_transfers, public.stock_adjustments
to authenticated;

-- Stock, ledger, operation history, line rows, profiles, and notifications are
-- read-only to clients. Their writes use SECURITY DEFINER RPCs or triggers.

-- Function EXECUTE is granted to PUBLIC by default in PostgreSQL. Explicitly
-- remove that path and grant only authenticated callers for mutation RPCs.
revoke all on function public.create_receipt(jsonb) from public, anon;
revoke all on function public.create_delivery(jsonb) from public, anon;
revoke all on function public.create_transfer(jsonb) from public, anon;
revoke all on function public.create_adjustment(jsonb) from public, anon;
revoke all on function public.create_product(jsonb) from public, anon;
revoke all on function public.pick_delivery(uuid) from public, anon;
revoke all on function public.pack_delivery(uuid) from public, anon;
revoke all on function public.validate_receipt(uuid) from public, anon;
revoke all on function public.validate_delivery(uuid) from public, anon;
revoke all on function public.validate_transfer(uuid) from public, anon;
revoke all on function public.apply_stock_adjustment(uuid) from public, anon;
grant execute on function
  public.create_receipt(jsonb), public.create_delivery(jsonb),
  public.create_transfer(jsonb), public.create_adjustment(jsonb),
  public.create_product(jsonb), public.pick_delivery(uuid),
  public.pack_delivery(uuid), public.validate_receipt(uuid),
  public.validate_delivery(uuid), public.validate_transfer(uuid),
  public.apply_stock_adjustment(uuid)
to authenticated;

-- The helper is used by authenticated RLS policies and is not useful to anon.
revoke all on function public.current_profile_role() from public, anon;
grant execute on function public.current_profile_role() to authenticated;

-- Profile changes must use the self-scoped function, not direct table updates.
revoke all on function public.update_own_profile(text) from public, anon;
grant execute on function public.update_own_profile(text) to authenticated;
