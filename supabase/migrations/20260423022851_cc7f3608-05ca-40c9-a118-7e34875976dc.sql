create or replace view public.partner_public_profiles
with (security_invoker = on) as
select
  id,
  name,
  instagram,
  avatar_url
from public.partners
where coalesce(is_active, true) = true;

grant select on public.partner_public_profiles to anon, authenticated;