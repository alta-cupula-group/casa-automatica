-- Papel com que a API conecta ao banco a partir do M2. Ele obedece ao Row Level Security.
-- Papel é do cluster, não do banco. Por isso a migração cria o papel só se ele não existe.
-- Dois bancos do mesmo cluster podem migrar ao mesmo tempo. O segundo CREATE ROLE espera o
-- primeiro terminar e falha com duplicate_object ou unique_violation, que o bloco ignora.
-- A migração não define senha nem concede permissão. A senha é um passo manual do README.md,
-- e as permissões chegam na M1.3.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'api_app') THEN
    CREATE ROLE api_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOINHERIT;
  END IF;
EXCEPTION
  WHEN duplicate_object OR unique_violation THEN
    NULL;
END
$$;
