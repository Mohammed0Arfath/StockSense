create or replace function public.update_own_profile(p_full_name text) returns public.profiles
language plpgsql security definer set search_path='' as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles set full_name=trim(p_full_name) where id=auth.uid() returning * into result;
  if not found then raise exception 'Profile not found'; end if;
  return result;
end $$;
revoke all on function public.update_own_profile(text) from public;
grant execute on function public.update_own_profile(text) to authenticated;

