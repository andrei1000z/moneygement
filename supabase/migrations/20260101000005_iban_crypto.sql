-- =====================================================================
-- 0005_iban_crypto.sql — encryption pentru IBAN-uri.
--
-- Cheia trăiește în Supabase Vault (extensia `vault`). Înainte de a rula
-- aplicația, setează cheia o singură dată din SQL editor sau dashboard:
--
--   select vault.create_secret(
--     '<random-32-byte-base64-string>',
--     'iban_encryption_key',
--     'IBAN encryption key for accounts.iban_encrypted'
--   );
--
-- RPC-urile `public.encrypt_iban` și `public.decrypt_iban` folosesc
-- pgp_sym_encrypt / pgp_sym_decrypt cu cheia din Vault. Server actions
-- accesează aceste funcții (vezi src/lib/crypto.ts).
-- =====================================================================

-- Helper privat: returnează cheia de criptare din Vault, sau null dacă
-- nu este setată încă.
create or replace function app.iban_key()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
begin
  -- Vault expune view-ul vault.decrypted_secrets pentru staff-ul DB-ului.
  -- Folosim execute ca să tolerăm cazul când extensia `vault` nu e activă.
  begin
    execute $exec$
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'iban_encryption_key'
      limit 1
    $exec$ into v_key;
  exception when others then
    v_key := null;
  end;
  return v_key;
end;
$$;

revoke all on function app.iban_key() from public;
grant execute on function app.iban_key() to service_role;

-- ---------- public.encrypt_iban ------------------------------------------
create or replace function public.encrypt_iban(iban text)
returns bytea
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
begin
  if iban is null or length(trim(iban)) = 0 then
    return null;
  end if;
  v_key := app.iban_key();
  if v_key is null then
    raise exception 'IBAN encryption key not found in vault.secrets (name = iban_encryption_key)';
  end if;
  return pgp_sym_encrypt(iban, v_key);
end;
$$;

revoke all on function public.encrypt_iban(text) from public;
grant execute on function public.encrypt_iban(text)
  to authenticated, service_role;

-- ---------- public.decrypt_iban ------------------------------------------
-- Întoarce IBAN-ul plaintext doar dacă apelantul are acces (RLS pe accounts
-- îl gardează — funcția nu impune un al doilea filtru, dar e security
-- definer ca să poată citi cheia din Vault).
create or replace function public.decrypt_iban(encrypted bytea)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
begin
  if encrypted is null then
    return null;
  end if;
  v_key := app.iban_key();
  if v_key is null then
    return null;
  end if;
  begin
    return pgp_sym_decrypt(encrypted, v_key);
  exception when others then
    return null;
  end;
end;
$$;

revoke all on function public.decrypt_iban(bytea) from public;
grant execute on function public.decrypt_iban(bytea)
  to authenticated, service_role;
