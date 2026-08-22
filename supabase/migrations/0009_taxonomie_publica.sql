-- Taxonomia devine sursa de adevăr, și se poate citi și fără sesiune.
--
-- Până acum materiile și capitolele existau în două locuri: tabelele de aici și
-- constanta compilată `src/data/chapters.ts`. Cele două au și divergit deja —
-- baza are materia `ant` („Subiecte anterioare") cu 8 capitole, fișierul e tipat
-- `MaterieId = 'bio' | 'chim'` și nu le cunoaște. Nimic n-a semnalat:
-- `chapterLabelById` cade pe id-ul brut, deci capitolele alea se afișau cu
-- `ant-2026-mg` în loc de titlu, iar `numaraGrile` nu le putea atribui nicio
-- materie.
--
-- Constanta exista dintr-un motiv real: pagina publică numără capitole fără
-- sesiune, iar politicile de citire erau date doar lui `authenticated`. Se
-- repară aici, la rădăcină — taxonomia publicată se citește și de `anon` — ca
-- fișierul să poată dispărea în loc să fie ținut în sincron cu mâna.

create table centre_admitere (
  id          text primary key,
  nume        text not null check (length(btrim(nume)) > 0),
  oras        text,
  position    smallint not null default 0,
  publicat    boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table centre_admitere is
  'Centrul de admitere care revendică o materie. Există unul singur azi; tabelul '
  'e aici ca al doilea să fie o linie inserată, nu o migrare peste tot conținutul.';

insert into centre_admitere (id, nume, oras, position, publicat)
values ('umfcd', 'UMFCD „Carol Davila”', 'București', 0, true);

-- `publicat` guvernează ce se vede, nu ce e secret: taxonomia nu e sensibilă.
-- Implicit `true` fiindcă tot ce există acum e deja vizibil, iar o migrare care
-- ascunde conținut existent ar fi o surpriză, nu o îmbunătățire.
alter table materii  add column publicat boolean not null default true;
alter table chapters add column publicat boolean not null default true;

-- `default 'umfcd'` e deliberat, nu lene: azi există exact un centru, iar
-- valoarea implicită ține valide `seed.sql` și orice inserare scrisă înainte de
-- migrarea asta. Se scoate în aceeași migrare care adaugă al doilea centru,
-- când „care centru" devine o întrebare cu mai multe răspunsuri.
alter table materii add column centru_id text not null default 'umfcd'
  references centre_admitere (id) on update cascade;

create index materii_centru_idx on materii (centru_id, position);

alter table centre_admitere enable row level security;

create policy centre_citire on centre_admitere
  for select to authenticated
  using (publicat or private.is_admin());

create policy centre_scriere on centre_admitere
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Citirea pentru elevi se strânge la ce e publicat, cu aceeași formă ca
-- `questions_citire`: administratorul vede și ce n-a publicat încă. Erau
-- `using (true)`, deci o materie ascunsă din administrare ar fi rămas pe ecranul
-- elevului.
drop policy materii_citire on materii;
create policy materii_citire on materii
  for select to authenticated
  using (publicat or private.is_admin());

drop policy chapters_citire on chapters;
create policy chapters_citire on chapters
  for select to authenticated
  using (publicat or private.is_admin());

-- Vizitatorul fără cont vede exact taxonomia publicată — atât cât îi trebuie
-- paginii de prezentare ca să numere capitole fără să mintă. Nicio grilă, niciun
-- răspuns: `questions` și `question_options` rămân fără nicio politică pentru
-- `anon`, ca până acum.
create policy centre_publice on centre_admitere
  for select to anon
  using (publicat);

create policy materii_publice on materii
  for select to anon
  using (publicat);

-- Capitolul se vede public doar dacă și materia lui e publicată — altfel
-- ascunderea unei materii ar lăsa capitolele ei numărabile de pe pagina publică.
create policy chapters_publice on chapters
  for select to anon
  using (
    publicat
    and exists (
      select 1 from materii m
      where m.id = chapters.materie_id and m.publicat
    )
  );
