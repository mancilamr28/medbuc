-- Un retry după o întrerupere de rețea nu trebuie să dubleze jurnalul de progres.
-- Coloana rămâne nullable pentru rândurile istorice; clientul nou o completează.
alter table attempts add column client_key text;
alter table attempts add constraint attempts_client_key_unique unique (client_key);
