begin;
select plan(10);

select ok(
  not exists (
    select 1 from (values
      ('profiles'),('categories'),('products'),('warehouses'),('locations'),
      ('stock_items'),('receipts'),('receipt_lines'),('deliveries'),
      ('delivery_lines'),('internal_transfers'),('transfer_lines'),
      ('stock_adjustments'),('reordering_rules'),('notifications'),
      ('operation_status_history'),('move_history')
    ) as protected(name)
    join pg_catalog.pg_class c on c.relname=protected.name
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
    where not c.relrowsecurity
  ),
  'RLS is enabled on every protected public relation'
);

select ok(
  not exists (
    select 1 from (values
      ('profiles'),('categories'),('products'),('warehouses'),('locations'),
      ('stock_items'),('receipts'),('receipt_lines'),('deliveries'),
      ('delivery_lines'),('internal_transfers'),('transfer_lines'),
      ('stock_adjustments'),('reordering_rules'),('notifications'),
      ('operation_status_history'),('move_history')
    ) as protected(name)
    where has_table_privilege('anon', format('public.%I', protected.name), 'SELECT')
       or has_table_privilege('anon', format('public.%I', protected.name), 'INSERT')
       or has_table_privilege('anon', format('public.%I', protected.name), 'UPDATE')
       or has_table_privilege('anon', format('public.%I', protected.name), 'DELETE')
  ),
  'anon has no table read or write grants on protected relations'
);

select ok(
  not exists (
    select 1 from (values
      ('profiles'),('categories'),('products'),('warehouses'),('locations'),
      ('stock_items'),('receipts'),('receipt_lines'),('deliveries'),
      ('delivery_lines'),('internal_transfers'),('transfer_lines'),
      ('stock_adjustments'),('reordering_rules'),('notifications'),
      ('operation_status_history'),('move_history')
    ) as protected(name)
    where not has_table_privilege('authenticated', format('public.%I', protected.name), 'SELECT')
  ),
  'authenticated retains inventory read grants'
);

select ok(
  not exists (
    select 1 from (values
      ('stock_items'),('move_history'),('operation_status_history'),
      ('receipt_lines'),('delivery_lines'),('transfer_lines'),('profiles'),('notifications')
    ) as protected(name)
    where has_table_privilege('authenticated', format('public.%I', protected.name), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', protected.name), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', protected.name), 'DELETE')
  ),
  'clients cannot directly mutate stock, ledgers, status history, lines, profiles, or notifications'
);

select ok(
  not exists (
    select 1 from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid=p.polrelid
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname = any(array[
        'profiles','categories','products','warehouses','locations','stock_items',
        'receipts','receipt_lines','deliveries','delivery_lines','internal_transfers',
        'transfer_lines','stock_adjustments','reordering_rules','notifications',
        'operation_status_history','move_history'
      ])
      and (0=any(p.polroles) or (select oid from pg_catalog.pg_roles where rolname='anon')=any(p.polroles))
  ),
  'no protected relation has an anon or PUBLIC policy'
);

select ok(
  not exists (
    select 1 from (values
      ('create_receipt(jsonb)'),('create_delivery(jsonb)'),('create_transfer(jsonb)'),
      ('create_adjustment(jsonb)'),('create_product(jsonb)'),('pick_delivery(uuid)'),
      ('pack_delivery(uuid)'),('validate_receipt(uuid)'),('validate_delivery(uuid)'),
      ('validate_transfer(uuid)'),('apply_stock_adjustment(uuid)')
    ) as fn(signature)
    where has_function_privilege('anon', 'public.' || fn.signature, 'EXECUTE')
  ),
  'anon cannot execute inventory mutation RPCs'
);

select ok(
  not exists (
    select 1 from (values
      ('create_receipt(jsonb)'),('create_delivery(jsonb)'),('create_transfer(jsonb)'),
      ('create_adjustment(jsonb)'),('create_product(jsonb)'),('pick_delivery(uuid)'),
      ('pack_delivery(uuid)'),('validate_receipt(uuid)'),('validate_delivery(uuid)'),
      ('validate_transfer(uuid)'),('apply_stock_adjustment(uuid)')
    ) as fn(signature)
    where not has_function_privilege('authenticated', 'public.' || fn.signature, 'EXECUTE')
  ),
  'authenticated can execute inventory mutation RPCs'
);

select ok(
  not has_function_privilege('anon', 'public.update_own_profile(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.update_own_profile(text)', 'EXECUTE'),
  'profile update RPC is authenticated-only'
);

select ok(
  not has_function_privilege('anon', 'public.current_profile_role()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.current_profile_role()', 'EXECUTE'),
  'role helper is unavailable to anon and usable by authenticated policy checks'
);

select ok(
  has_table_privilege('authenticated','public.products','INSERT')
  and has_table_privilege('authenticated','public.receipts','INSERT')
  and has_table_privilege('authenticated','public.deliveries','INSERT')
  and has_table_privilege('authenticated','public.internal_transfers','INSERT')
  and has_table_privilege('authenticated','public.stock_adjustments','INSERT'),
  'authenticated document/product writes remain available behind RLS policies'
);

select * from finish();
rollback;
