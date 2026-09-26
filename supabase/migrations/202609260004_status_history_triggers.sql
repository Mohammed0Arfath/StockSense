create or replace function public.track_operation_status() returns trigger
language plpgsql security definer set search_path='' as $$
declare kind text;
begin
  if tg_table_name='receipts' then kind:='receipt';
  elsif tg_table_name='deliveries' then kind:='delivery';
  elsif tg_table_name='internal_transfers' then kind:='transfer';
  elsif tg_table_name='stock_adjustments' then kind:='adjustment';
  else raise exception 'Unsupported operation type'; end if;
  if tg_op='INSERT' then
    insert into public.operation_status_history(entity_type,entity_id,status,actor_id)
    values(kind,new.id,new.status,auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.operation_status_history(entity_type,entity_id,status,actor_id)
    values(kind,new.id,new.status,auth.uid());
  end if;
  return new;
end $$;
create trigger receipt_status_history after insert or update of status on public.receipts for each row execute function public.track_operation_status();
create trigger delivery_status_history after insert or update of status on public.deliveries for each row execute function public.track_operation_status();
create trigger transfer_status_history after insert or update of status on public.internal_transfers for each row execute function public.track_operation_status();
create trigger adjustment_status_history after insert or update of status on public.stock_adjustments for each row execute function public.track_operation_status();
