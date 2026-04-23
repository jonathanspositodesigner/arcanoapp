create or replace function public.get_public_partner_profiles()
returns table (
  id uuid,
  name text,
  instagram text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.instagram,
    p.avatar_url
  from public.partners p
  where coalesce(p.is_active, true) = true;
$$;

grant execute on function public.get_public_partner_profiles() to anon, authenticated;