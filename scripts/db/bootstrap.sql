-- =============================================================================
-- Outmat Propostas — bootstrap do banco no PostgreSQL NATIVO
-- Cria o usuário e o banco DEDICADOS da aplicação.
--
-- Rodar UMA vez, como superusuário (postgres). Ex.:
--   psql -U postgres -h localhost -p 5432 -f scripts/db/bootstrap.sql
--
-- A aplicação NUNCA usa o usuário postgres — apenas 'outmat'.
-- =============================================================================

-- 1) Papel (role) dedicado da aplicação -------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'outmat') THEN
    CREATE ROLE outmat WITH LOGIN PASSWORD 'outmat123';
  ELSE
    ALTER ROLE outmat WITH LOGIN PASSWORD 'outmat123';
  END IF;
END
$$;

-- 2) Banco dedicado, pertencente ao papel 'outmat' --------------------------
--    (CREATE DATABASE não roda dentro de bloco/transação; usamos \gexec)
SELECT 'CREATE DATABASE outmat_propostas OWNER outmat'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'outmat_propostas')
\gexec

-- 3) Privilégios de schema para o 'outmat' no banco recém-criado -------------
\connect outmat_propostas
ALTER SCHEMA public OWNER TO outmat;
GRANT ALL ON SCHEMA public TO outmat;

\echo 'Bootstrap concluído: role outmat + banco outmat_propostas prontos.'
