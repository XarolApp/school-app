-- Plan 021 — the catalogue is for pupils finishing 9th grade only.
--
-- Programmes a 9th grader cannot apply to (6- and 8-year gymnázia, nástavby,
-- 8-year dance conservatories) are MOVED to school_programs_hidden, never
-- deleted. A school left with no visible programme gets
-- schools.hidden_reason = 'not_for_9th_grade'. Safe to run more than once.
--
-- Apply BEFORE deploying the server code that reads schools.hidden_reason.

begin;

alter table public.schools add column if not exists hidden_reason text;

create table if not exists public.school_programs_hidden (
  id bigint generated always as identity primary key,
  school_id bigint not null references public.schools (id) on delete cascade,
  rok int not null,
  kkov text,
  obor_nazev text,
  typ_skoly text,
  zrizovatel text,
  maturitni boolean,
  jpz_povinna boolean,
  jazyk_studia text,
  delka_studia int,
  forma_vzdelavani text,
  zamereni text,
  kapacita int,
  prihlasky int,
  prijati int,
  cutoff numeric,
  hidden_reason text not null default 'not_for_9th_grade',
  hidden_at timestamptz not null default now()
);
create index if not exists school_programs_hidden_school_id_idx
  on public.school_programs_hidden (school_id);
alter table public.school_programs_hidden enable row level security;

-- Must stay identical to lib/ninthGrade.js (a test enforces it).
create or replace function public.ninth_grade_program(p_typ text, p_delka int)
returns boolean
language sql
immutable
as $$
  select not (
    coalesce(p_typ, '') in ('Gymnázia 6letá', 'Gymnázia 8letá', 'Nástavby')
    or (p_typ = 'Konzervatoře' and p_delka = 8)
  )
$$;

-- Hide schools with no visible programme (but hidden ones); un-hide the ones
-- that have a visible programme again. Null ids = all schools.
create or replace function public.refresh_school_visibility(p_school_ids bigint[] default null)
returns void
language sql
as $$
  update public.schools s
     set hidden_reason = 'not_for_9th_grade'
   where s.merged_into is null
     and s.hidden_reason is null
     and (p_school_ids is null or s.id = any (p_school_ids))
     and not exists (select 1 from public.school_programs p where p.school_id = s.id)
     and exists (select 1 from public.school_programs_hidden h where h.school_id = s.id);

  update public.schools s
     set hidden_reason = null
   where s.hidden_reason = 'not_for_9th_grade'
     and (p_school_ids is null or s.id = any (p_school_ids))
     and exists (select 1 from public.school_programs p where p.school_id = s.id);
$$;

-- School-level cutoff / acceptance rate from VISIBLE programmes only, newest
-- year per school; same arithmetic as scripts/import-admission-data.js.
create or replace function public.recompute_school_admission(p_school_ids bigint[] default null)
returns void
language sql
as $$
  with newest as (
    select school_id, max(rok) as rok
      from public.school_programs
     where p_school_ids is null or school_id = any (p_school_ids)
     group by school_id
  ), agg as (
    select p.school_id,
           round(avg(p.cutoff) filter (where p.cutoff is not null), 1) as cutoff,
           case when coalesce(sum(p.prihlasky) filter (where p.prihlasky > 0 and p.prijati is not null), 0) > 0
                then round(100.0 * sum(p.prijati) filter (where p.prihlasky > 0 and p.prijati is not null)
                                 / sum(p.prihlasky) filter (where p.prihlasky > 0 and p.prijati is not null), 1)
           end as rate
      from public.school_programs p
      join newest n on n.school_id = p.school_id and n.rok = p.rok
     group by p.school_id
  )
  update public.schools s
     set admission_cutoff = agg.cutoff,
         acceptance_rate = agg.rate
    from agg
   where s.id = agg.school_id;
$$;

revoke all on function public.refresh_school_visibility(bigint[]) from public, anon, authenticated;
revoke all on function public.recompute_school_admission(bigint[]) from public, anon, authenticated;
grant execute on function public.refresh_school_visibility(bigint[]) to service_role;
grant execute on function public.recompute_school_admission(bigint[]) to service_role;

-- The one-off move (atomic).
with moved as (
  delete from public.school_programs
   where not public.ninth_grade_program(typ_skoly, delka_studia)
  returning school_id, rok, kkov, obor_nazev, typ_skoly, zrizovatel, maturitni, jpz_povinna,
            jazyk_studia, delka_studia, forma_vzdelavani, zamereni, kapacita, prihlasky, prijati, cutoff
)
insert into public.school_programs_hidden
  (school_id, rok, kkov, obor_nazev, typ_skoly, zrizovatel, maturitni, jpz_povinna,
   jazyk_studia, delka_studia, forma_vzdelavani, zamereni, kapacita, prihlasky, prijati, cutoff)
select school_id, rok, kkov, obor_nazev, typ_skoly, zrizovatel, maturitni, jpz_povinna,
       jazyk_studia, delka_studia, forma_vzdelavani, zamereni, kapacita, prihlasky, prijati, cutoff
  from moved;

select public.refresh_school_visibility();
select public.recompute_school_admission();

commit;

-- Verify (expect 194 / 23 / 0):
-- select (select count(*) from public.schools where merged_into is null and hidden_reason is null) as visible,
--        (select count(*) from public.schools where hidden_reason = 'not_for_9th_grade') as hidden,
--        (select count(*) from public.school_programs where not public.ninth_grade_program(typ_skoly, delka_studia)) as leftover;
