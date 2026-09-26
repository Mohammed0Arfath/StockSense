create or replace function public.create_receipt(p_document jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid := coalesce((p_document->>'id')::uuid,gen_random_uuid()); line jsonb;
begin
  if auth.uid() is null or public.current_profile_role()<>'Inventory Manager' then raise exception 'Inventory Manager role required'; end if;
  if jsonb_array_length(coalesce(p_document->'lines','[]'::jsonb))=0 then raise exception 'Receipt requires at least one product line'; end if;
  insert into public.receipts(id,receipt_number,vendor,warehouse_id,scheduled_date,reference,status,created_by)
  values(new_id,p_document->>'receipt_number',p_document->>'vendor',(p_document->>'warehouse_id')::uuid,(p_document->>'scheduled_date')::timestamptz,coalesce(p_document->>'reference',''),'draft',auth.uid());
  for line in select value from jsonb_array_elements(coalesce(p_document->'lines','[]'::jsonb)) loop
    insert into public.receipt_lines(id,receipt_id,product_id,expected_quantity,received_quantity,unit,location_id)
    values(coalesce((line->>'id')::uuid,gen_random_uuid()),new_id,(line->>'product_id')::uuid,(line->>'expected_quantity')::numeric,(line->>'received_quantity')::numeric,line->>'unit',(line->>'location_id')::uuid);
  end loop;
  return new_id;
end $$;

create or replace function public.create_delivery(p_document jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid := coalesce((p_document->>'id')::uuid,gen_random_uuid()); line jsonb;
begin
  if auth.uid() is null or public.current_profile_role()<>'Inventory Manager' then raise exception 'Inventory Manager role required'; end if;
  if jsonb_array_length(coalesce(p_document->'lines','[]'::jsonb))=0 then raise exception 'Delivery requires at least one product line'; end if;
  insert into public.deliveries(id,delivery_number,customer,source_warehouse_id,source_location_id,scheduled_date,reference,status,created_by)
  values(new_id,p_document->>'delivery_number',p_document->>'customer',(p_document->>'source_warehouse_id')::uuid,(p_document->>'source_location_id')::uuid,(p_document->>'scheduled_date')::timestamptz,coalesce(p_document->>'reference',''),'draft',auth.uid());
  for line in select value from jsonb_array_elements(coalesce(p_document->'lines','[]'::jsonb)) loop
    insert into public.delivery_lines(id,delivery_id,product_id,requested_quantity,picked_quantity,packed_quantity)
    values(coalesce((line->>'id')::uuid,gen_random_uuid()),new_id,(line->>'product_id')::uuid,(line->>'requested_quantity')::numeric,0,0);
  end loop;
  return new_id;
end $$;

create or replace function public.create_transfer(p_document jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid := coalesce((p_document->>'id')::uuid,gen_random_uuid()); line jsonb;
begin
  if auth.uid() is null or public.current_profile_role() not in ('Inventory Manager','Warehouse Staff') then raise exception 'Authenticated warehouse role required'; end if;
  if jsonb_array_length(coalesce(p_document->'lines','[]'::jsonb))=0 then raise exception 'Transfer requires at least one product line'; end if;
  insert into public.internal_transfers(id,transfer_number,source_warehouse_id,source_location_id,destination_warehouse_id,destination_location_id,scheduled_date,status,created_by)
  values(new_id,p_document->>'transfer_number',(p_document->>'source_warehouse_id')::uuid,(p_document->>'source_location_id')::uuid,(p_document->>'destination_warehouse_id')::uuid,(p_document->>'destination_location_id')::uuid,(p_document->>'scheduled_date')::timestamptz,'draft',auth.uid());
  for line in select value from jsonb_array_elements(coalesce(p_document->'lines','[]'::jsonb)) loop
    insert into public.transfer_lines(id,transfer_id,product_id,quantity)
    values(coalesce((line->>'id')::uuid,gen_random_uuid()),new_id,(line->>'product_id')::uuid,(line->>'quantity')::numeric);
  end loop;
  return new_id;
end $$;

create or replace function public.create_adjustment(p_document jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid := coalesce((p_document->>'id')::uuid,gen_random_uuid());
begin
  if auth.uid() is null or public.current_profile_role() not in ('Inventory Manager','Warehouse Staff') then raise exception 'Authenticated warehouse role required'; end if;
  insert into public.stock_adjustments(id,adjustment_number,product_id,warehouse_id,location_id,system_quantity,counted_quantity,reason,status,created_by,scheduled_date)
  values(new_id,p_document->>'adjustment_number',(p_document->>'product_id')::uuid,(p_document->>'warehouse_id')::uuid,(p_document->>'location_id')::uuid,(p_document->>'system_quantity')::numeric,(p_document->>'counted_quantity')::numeric,coalesce(p_document->>'reason',''),'draft',auth.uid(),coalesce((p_document->>'date')::timestamptz,now()));
  return new_id;
end $$;

create or replace function public.create_product(p_document jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid := coalesce((p_document->>'id')::uuid,gen_random_uuid()); qty numeric := coalesce((p_document->>'initial_stock')::numeric,0); p public.products; w public.warehouses; loc public.locations;
begin
  if auth.uid() is null or public.current_profile_role()<>'Inventory Manager' then raise exception 'Inventory Manager role required'; end if;
  select * into w from public.warehouses where id=(p_document->>'default_warehouse_id')::uuid and status='active';
  select * into loc from public.locations where id=(p_document->>'default_location_id')::uuid and warehouse_id=w.id and status='active';
  if w.id is null or loc.id is null then raise exception 'Select a valid active warehouse and location'; end if;
  if qty<0 then raise exception 'Initial stock cannot be negative'; end if;
  insert into public.products(id,name,sku,category_id,unit,reorder_point,default_warehouse_id,default_location_id)
  values(new_id,p_document->>'name',p_document->>'sku',(p_document->>'category_id')::uuid,p_document->>'unit',coalesce((p_document->>'reorder_point')::numeric,0),w.id,loc.id) returning * into p;
  if qty>0 then
    insert into public.stock_items(product_id,warehouse_id,location_id,on_hand,reserved) values(p.id,w.id,loc.id,qty,0);
    insert into public.move_history(reference,operation,product_id,sku,source,destination,quantity,user_id,status,document_id,destination_warehouse_id,destination_location_id)
    values(p.sku,'Adjustment',p.id,p.sku,'Initial balance',w.name||' / '||loc.name,qty,auth.uid(),'Applied',p.id,w.id,loc.id);
  end if;
  return p.id;
end $$;

create or replace function public.pick_delivery(p_delivery_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare d public.deliveries; l record; s public.stock_items;
begin
  if auth.uid() is null or public.current_profile_role() not in ('Inventory Manager','Warehouse Staff') then raise exception 'Authenticated warehouse role required'; end if;
  select * into d from public.deliveries where id=p_delivery_id for update;
  if not found or d.status<>'draft' then raise exception 'Only a draft delivery can be picked'; end if;
  if not exists(select 1 from public.delivery_lines where delivery_id=d.id) then raise exception 'Delivery requires product lines'; end if;
  for l in select product_id,sum(requested_quantity) qty from public.delivery_lines where delivery_id=d.id group by product_id loop
    select * into s from public.stock_items where product_id=l.product_id and warehouse_id=d.source_warehouse_id and location_id=d.source_location_id for update;
    if not found or s.on_hand-s.reserved<l.qty then raise exception 'Insufficient available stock'; end if;
  end loop;
  update public.delivery_lines set picked_quantity=requested_quantity where delivery_id=d.id;
  update public.deliveries set status='waiting' where id=d.id;
end $$;

create or replace function public.pack_delivery(p_delivery_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare d public.deliveries;
begin
  if auth.uid() is null or public.current_profile_role() not in ('Inventory Manager','Warehouse Staff') then raise exception 'Authenticated warehouse role required'; end if;
  select * into d from public.deliveries where id=p_delivery_id for update;
  if not found or d.status<>'waiting' then raise exception 'Pick this delivery before packing'; end if;
  if exists(select 1 from public.delivery_lines where delivery_id=d.id and picked_quantity<requested_quantity) then raise exception 'Pick every requested quantity before packing'; end if;
  update public.delivery_lines set packed_quantity=picked_quantity where delivery_id=d.id;
  update public.deliveries set status='ready' where id=d.id;
end $$;

grant execute on function public.create_receipt(jsonb),public.create_delivery(jsonb),public.create_transfer(jsonb),public.create_adjustment(jsonb),public.create_product(jsonb),public.pick_delivery(uuid),public.pack_delivery(uuid) to authenticated;
