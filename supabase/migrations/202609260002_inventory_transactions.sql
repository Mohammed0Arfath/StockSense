create or replace function public.validate_receipt(p_receipt_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.receipts; l record;
begin
  if auth.uid() is null or public.current_profile_role()<>'Inventory Manager' then raise exception 'Inventory Manager role required'; end if;
  select * into r from public.receipts where id=p_receipt_id for update;
  if not found or r.status<>'ready' then raise exception 'Only a ready receipt can be validated'; end if;
  if btrim(r.receipt_number)='' or btrim(r.vendor)='' or r.scheduled_date is null or not exists(select 1 from public.warehouses where id=r.warehouse_id and status='active') then raise exception 'Receipt fields or warehouse are invalid'; end if;
  if not exists(select 1 from public.receipt_lines where receipt_id=r.id) then raise exception 'Receipt requires product lines'; end if;
  for l in select rl.*,p.sku,loc.name location_name,w.name warehouse_name from public.receipt_lines rl join public.products p on p.id=rl.product_id join public.locations loc on loc.id=rl.location_id join public.warehouses w on w.id=r.warehouse_id where rl.receipt_id=r.id loop
    if l.location_id not in(select id from public.locations where warehouse_id=r.warehouse_id and status='active') then raise exception 'Receipt destination is invalid'; end if;
    insert into public.stock_items(product_id,warehouse_id,location_id,on_hand,reserved) values(l.product_id,r.warehouse_id,l.location_id,l.received_quantity,0)
      on conflict(product_id,warehouse_id,location_id) do update set on_hand=public.stock_items.on_hand+excluded.on_hand,updated_at=now();
    insert into public.move_history(reference,operation,product_id,sku,source,destination,quantity,user_id,status,document_id,destination_warehouse_id,destination_location_id)
      values(r.receipt_number,'Receipt',l.product_id,l.sku,r.vendor,l.warehouse_name||' / '||l.location_name,l.received_quantity,auth.uid(),'Done',r.id,r.warehouse_id,l.location_id);
  end loop;
  update public.receipts set status='done' where id=r.id;
end $$;

create or replace function public.validate_delivery(p_delivery_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare d public.deliveries; l record; s public.stock_items;
begin
  if auth.uid() is null or public.current_profile_role()<>'Inventory Manager' then raise exception 'Inventory Manager role required'; end if;
  select * into d from public.deliveries where id=p_delivery_id for update;
  if not found or d.status<>'ready' then raise exception 'Only a ready delivery can be validated'; end if;
  if btrim(d.delivery_number)='' or btrim(d.customer)='' or d.scheduled_date is null or not exists(select 1 from public.warehouses where id=d.source_warehouse_id and status='active') then raise exception 'Delivery fields or source warehouse are invalid'; end if;
  if not exists(select 1 from public.delivery_lines where delivery_id=d.id) then raise exception 'Delivery requires product lines'; end if;
  if not exists(select 1 from public.locations where id=d.source_location_id and warehouse_id=d.source_warehouse_id and status='active') then raise exception 'Delivery source location is invalid'; end if;
  for l in select dl.product_id,sum(dl.requested_quantity) qty,p.sku from public.delivery_lines dl join public.products p on p.id=dl.product_id where dl.delivery_id=d.id group by dl.product_id,p.sku loop
    select * into s from public.stock_items where product_id=l.product_id and warehouse_id=d.source_warehouse_id and location_id=d.source_location_id for update;
    if not found or s.on_hand-s.reserved<l.qty then raise exception 'Insufficient available stock for SKU %: requested %, available %',l.sku,l.qty,coalesce(s.on_hand-s.reserved,0); end if;
    if exists(select 1 from public.delivery_lines where delivery_id=d.id and product_id=l.product_id and packed_quantity<requested_quantity) then raise exception 'Pack all requested quantities before validation'; end if;
  end loop;
  for l in select dl.*,p.sku,loc.name location_name,w.name warehouse_name from public.delivery_lines dl join public.products p on p.id=dl.product_id join public.locations loc on loc.id=d.source_location_id join public.warehouses w on w.id=d.source_warehouse_id where dl.delivery_id=d.id loop
    update public.stock_items set on_hand=on_hand-l.requested_quantity,updated_at=now() where product_id=l.product_id and warehouse_id=d.source_warehouse_id and location_id=d.source_location_id;
    insert into public.move_history(reference,operation,product_id,sku,source,destination,quantity,user_id,status,document_id,source_warehouse_id,source_location_id)
      values(d.delivery_number,'Delivery',l.product_id,l.sku,l.warehouse_name||' / '||l.location_name,d.customer,-l.requested_quantity,auth.uid(),'Done',d.id,d.source_warehouse_id,d.source_location_id);
  end loop;
  update public.deliveries set status='done' where id=d.id;
end $$;

create or replace function public.validate_transfer(p_transfer_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare t public.internal_transfers; l record; s public.stock_items;
begin
  if auth.uid() is null or public.current_profile_role() not in ('Inventory Manager','Warehouse Staff') then raise exception 'Authentication required'; end if;
  select * into t from public.internal_transfers where id=p_transfer_id for update;
  if not found or t.status<>'ready' then raise exception 'Only a ready transfer can be validated'; end if;
  if btrim(t.transfer_number)='' or t.scheduled_date is null or not exists(select 1 from public.warehouses where id=t.source_warehouse_id and status='active') or not exists(select 1 from public.warehouses where id=t.destination_warehouse_id and status='active') then raise exception 'Transfer fields or warehouses are invalid'; end if;
  if not exists(select 1 from public.transfer_lines where transfer_id=t.id) then raise exception 'Transfer requires product lines'; end if;
  if t.source_location_id=t.destination_location_id or not exists(select 1 from public.locations where id=t.source_location_id and warehouse_id=t.source_warehouse_id and status='active') or not exists(select 1 from public.locations where id=t.destination_location_id and warehouse_id=t.destination_warehouse_id and status='active') then raise exception 'Transfer locations are invalid'; end if;
  for l in select tl.product_id,sum(tl.quantity) qty,p.sku from public.transfer_lines tl join public.products p on p.id=tl.product_id where tl.transfer_id=t.id group by tl.product_id,p.sku loop
    select * into s from public.stock_items where product_id=l.product_id and warehouse_id=t.source_warehouse_id and location_id=t.source_location_id for update;
    if not found or s.on_hand-s.reserved<l.qty then raise exception 'Insufficient available stock for SKU %: requested %, available %',l.sku,l.qty,coalesce(s.on_hand-s.reserved,0); end if;
  end loop;
  for l in select tl.*,p.sku,sl.name source_name,dl.name destination_name,sw.name source_warehouse,dw.name destination_warehouse from public.transfer_lines tl join public.products p on p.id=tl.product_id join public.locations sl on sl.id=t.source_location_id join public.locations dl on dl.id=t.destination_location_id join public.warehouses sw on sw.id=t.source_warehouse_id join public.warehouses dw on dw.id=t.destination_warehouse_id where tl.transfer_id=t.id loop
    update public.stock_items set on_hand=on_hand-l.quantity,updated_at=now() where product_id=l.product_id and warehouse_id=t.source_warehouse_id and location_id=t.source_location_id;
    insert into public.stock_items(product_id,warehouse_id,location_id,on_hand,reserved) values(l.product_id,t.destination_warehouse_id,t.destination_location_id,l.quantity,0)
      on conflict(product_id,warehouse_id,location_id) do update set on_hand=public.stock_items.on_hand+excluded.on_hand,updated_at=now();
    insert into public.move_history(reference,operation,product_id,sku,source,destination,quantity,user_id,status,document_id,source_warehouse_id,source_location_id,destination_warehouse_id,destination_location_id)
      values(t.transfer_number,'Internal Transfer',l.product_id,l.sku,l.source_warehouse||' / '||l.source_name,l.destination_warehouse||' / '||l.destination_name,l.quantity,auth.uid(),'Done',t.id,t.source_warehouse_id,t.source_location_id,t.destination_warehouse_id,t.destination_location_id);
  end loop;
  update public.internal_transfers set status='done' where id=t.id;
end $$;

create or replace function public.apply_stock_adjustment(p_adjustment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a public.stock_adjustments; s public.stock_items; p public.products; loc public.locations; w public.warehouses; delta numeric;
begin
  if auth.uid() is null or public.current_profile_role() not in ('Inventory Manager','Warehouse Staff') then raise exception 'Authentication required'; end if;
  select * into a from public.stock_adjustments where id=p_adjustment_id for update;
  if not found or a.status<>'draft' then raise exception 'Only a draft adjustment can be applied'; end if;
  if not exists(select 1 from public.warehouses where id=a.warehouse_id and status='active') then raise exception 'Adjustment warehouse is inactive'; end if;
  select * into p from public.products where id=a.product_id;
  select * into loc from public.locations where id=a.location_id and warehouse_id=a.warehouse_id and status='active';
  if not found then raise exception 'Adjustment location is invalid'; end if;
  select * into w from public.warehouses where id=a.warehouse_id;
  insert into public.stock_items(product_id,warehouse_id,location_id,on_hand,reserved) values(a.product_id,a.warehouse_id,a.location_id,0,0) on conflict(product_id,warehouse_id,location_id) do nothing;
  select * into s from public.stock_items where product_id=a.product_id and warehouse_id=a.warehouse_id and location_id=a.location_id for update;
  delta:=a.counted_quantity-s.on_hand;
  if a.counted_quantity<s.reserved then raise exception 'Counted quantity cannot be less than reserved stock'; end if;
  update public.stock_items set on_hand=a.counted_quantity,updated_at=now() where id=s.id;
  update public.stock_adjustments set system_quantity=s.on_hand,status='applied' where id=a.id;
  insert into public.move_history(reference,operation,product_id,sku,source,destination,quantity,user_id,status,document_id,source_warehouse_id,source_location_id,destination_warehouse_id,destination_location_id,zero_difference)
    values(a.adjustment_number,'Adjustment',a.product_id,p.sku,w.name||' / '||loc.name,w.name||' / '||loc.name,delta,auth.uid(),'Applied',a.id,a.warehouse_id,a.location_id,a.warehouse_id,a.location_id,delta=0);
end $$;

grant execute on function public.validate_receipt(uuid),public.validate_delivery(uuid),public.validate_transfer(uuid),public.apply_stock_adjustment(uuid) to authenticated;
