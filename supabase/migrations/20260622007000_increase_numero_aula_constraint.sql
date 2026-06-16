-- Drop the hardcoded limit of 40 on lesson numbers and replace it with a positive constraint
ALTER TABLE public.aulas DROP CONSTRAINT IF EXISTS aulas_numero_aula_check;
ALTER TABLE public.aulas ADD CONSTRAINT aulas_numero_aula_check CHECK (numero_aula >= 1);
