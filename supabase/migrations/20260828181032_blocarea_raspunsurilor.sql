-- RLS hotărăște ce rânduri vede un utilizator, nu ce coloane. Până aici,
-- politica `questions_citire` ascundea ciornele, dar un elev autentificat putea
-- cere explicit `correct`, `expl` sau `why` pentru orice grilă publicată.
--
-- Retragem mai întâi dreptul pe tabel. Un simplu REVOKE pe trei coloane nu ar
-- avea efect cât timp rolul păstrează SELECT pe întregul tabel. Apoi acordăm
-- explicit numai coloanele care nu dezvăluie rezolvarea.

revoke select on table public.questions from public, anon, authenticated;

grant select (
  id,
  chapter_id,
  materie_id,
  tip,
  tip_id,
  status,
  text,
  enunturi,
  src,
  sursa,
  an,
  colectie_id,
  acces,
  dificultate,
  created_at,
  updated_at
) on table public.questions to authenticated;

revoke select on table public.question_options from public, anon, authenticated;

grant select (
  question_id,
  key,
  text
) on table public.question_options to authenticated;

-- `correct`, `expl` și `why` se citesc de acum numai prin funcțiile controlate:
-- lucrarea le deschide după verificare/predare, iar Administrarea le primește
-- prin RPC-urile care verifică `private.is_admin()`.
