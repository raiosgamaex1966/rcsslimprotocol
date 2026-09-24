-- ============================================================
-- MIGRAÇÃO PARA O MODELO RELACIONAL (SaaS)
-- ============================================================

-- 1. Criação das tabelas

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    name text,
    email text,
    phone text,
    whatsapp text,
    sex text CHECK (sex IN ('masculino', 'feminino', 'outro', '')),
    birth_date date,
    start_weight_kg numeric,
    height_cm numeric,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.treatments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    med_id text NOT NULL,
    dose_mg numeric NOT NULL,
    start_date date,
    ai_guidance_note text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(patient_id) -- Apenas um tratamento ativo por paciente por enquanto
);

CREATE TABLE IF NOT EXISTS public.treatment_phases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_id uuid NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
    start_week int NOT NULL,
    end_week int,
    dose_mg numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS public.dose_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL,
    applied_at timestamptz NOT NULL,
    dose_mg numeric NOT NULL,
    injection_site text,
    side_effects jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.weight_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    measured_at date NOT NULL,
    weight_kg numeric NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.water_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date date NOT NULL,
    amount_ml int NOT NULL,
    UNIQUE(patient_id, date)
);

CREATE TABLE IF NOT EXISTS public.admin_settings (
    id int PRIMARY KEY DEFAULT 1,
    llm_provider text,
    llm_api_key text,
    llm_model text,
    updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. Habilitar RLS (Segurança)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuário lê próprio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuário edita próprio perfil" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Políticas para treatments e phases
CREATE POLICY "Usuário lê próprio tratamento" ON public.treatments FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Usuário edita próprio tratamento" ON public.treatments FOR ALL USING (auth.uid() = patient_id);

CREATE POLICY "Usuário lê fases" ON public.treatment_phases FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.treatments t WHERE t.id = treatment_id AND t.patient_id = auth.uid())
);
CREATE POLICY "Usuário edita fases" ON public.treatment_phases FOR ALL USING (
    EXISTS (SELECT 1 FROM public.treatments t WHERE t.id = treatment_id AND t.patient_id = auth.uid())
);

-- Políticas para logs
CREATE POLICY "Usuário acessa doses" ON public.dose_logs FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Usuário acessa pesos" ON public.weight_logs FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Usuário acessa água" ON public.water_logs FOR ALL USING (auth.uid() = patient_id);

-- Admin Settings (Só quem tem role especial ou todos se quiser simplificar, mas melhor isolar)
-- O backend na Vercel vai usar a SUPABASE_SERVICE_ROLE_KEY para ler, então não precisa de policy pública.

-- ============================================================
-- 3. Função RPC para migrar de JSONB para Relacional
-- ============================================================
-- (Para facilitar a vida e não quebrar o React imediatamente, criamos funções
-- de leitura e escrita que convertem o JSON para o banco relacional)

CREATE OR REPLACE FUNCTION public.save_patient_data_relational(p_user_id uuid, p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_treatment_id uuid;
    v_phase jsonb;
    v_dose jsonb;
    v_weight jsonb;
    v_water jsonb;
BEGIN
    -- 1. Atualiza Perfil
    INSERT INTO public.profiles (id, name, email, phone, whatsapp, sex, birth_date, start_weight_kg, height_cm)
    VALUES (
        p_user_id,
        p_data->'profile'->>'name',
        p_data->'profile'->>'email',
        p_data->'profile'->>'phone',
        p_data->'profile'->>'whatsapp',
        p_data->'profile'->>'sex',
        (p_data->'profile'->>'birthDate')::date,
        (p_data->'profile'->>'startWeightKg')::numeric,
        (p_data->'profile'->>'heightCm')::numeric
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        whatsapp = EXCLUDED.whatsapp,
        sex = EXCLUDED.sex,
        birth_date = EXCLUDED.birth_date,
        start_weight_kg = EXCLUDED.start_weight_kg,
        height_cm = EXCLUDED.height_cm,
        updated_at = now();

    -- 2. Atualiza Tratamento (Se existir)
    IF p_data->'treatment' IS NOT NULL AND jsonb_typeof(p_data->'treatment') = 'object' THEN
        INSERT INTO public.treatments (patient_id, med_id, dose_mg, ai_guidance_note)
        VALUES (
            p_user_id,
            p_data->'treatment'->>'medId',
            (p_data->'treatment'->>'doseMg')::numeric,
            p_data->'treatment'->>'aiGuidanceNote'
        )
        ON CONFLICT (patient_id) DO UPDATE SET
            med_id = EXCLUDED.med_id,
            dose_mg = EXCLUDED.dose_mg,
            ai_guidance_note = EXCLUDED.ai_guidance_note
        RETURNING id INTO v_treatment_id;

        -- Deleta fases antigas e recria
        DELETE FROM public.treatment_phases WHERE treatment_id = v_treatment_id;
        
        IF p_data->'treatment'->'phases' IS NOT NULL THEN
            FOR v_phase IN SELECT * FROM jsonb_array_elements(p_data->'treatment'->'phases')
            LOOP
                INSERT INTO public.treatment_phases (treatment_id, start_week, end_week, dose_mg)
                VALUES (
                    v_treatment_id,
                    (v_phase->>'startWeek')::int,
                    (v_phase->>'endWeek')::int,
                    (v_phase->>'doseMg')::numeric
                );
            END LOOP;
        END IF;
    ELSE
        DELETE FROM public.treatments WHERE patient_id = p_user_id;
    END IF;

    -- 3. Atualiza Doses (Sincronização Simples: Deleta e Recria para evitar complicação de diff, ou só insere novos)
    -- Para robustez relacional, vamos apagar e recriar os logs (como é um SaaS pequeno é ok, mas o ideal é granular)
    DELETE FROM public.dose_logs WHERE patient_id = p_user_id;
    IF p_data->'doses' IS NOT NULL THEN
        FOR v_dose IN SELECT * FROM jsonb_array_elements(p_data->'doses')
        LOOP
            INSERT INTO public.dose_logs (patient_id, treatment_id, applied_at, dose_mg, injection_site)
            VALUES (
                p_user_id,
                v_treatment_id,
                (v_dose->>'date')::timestamptz,
                (v_dose->>'mg')::numeric,
                v_dose->>'site'
            );
        END LOOP;
    END IF;

    -- 4. Atualiza Pesos
    DELETE FROM public.weight_logs WHERE patient_id = p_user_id;
    IF p_data->'weights' IS NOT NULL THEN
        FOR v_weight IN SELECT * FROM jsonb_array_elements(p_data->'weights')
        LOOP
            INSERT INTO public.weight_logs (patient_id, measured_at, weight_kg)
            VALUES (
                p_user_id,
                (v_weight->>'date')::date,
                (v_weight->>'kg')::numeric
            );
        END LOOP;
    END IF;

    -- 5. Atualiza Água
    DELETE FROM public.water_logs WHERE patient_id = p_user_id;
    IF p_data->'water' IS NOT NULL THEN
        FOR v_water IN SELECT * FROM jsonb_array_elements(p_data->'water')
        LOOP
            INSERT INTO public.water_logs (patient_id, date, amount_ml)
            VALUES (
                p_user_id,
                (v_water->>'date')::date,
                (v_water->>'ml')::int
            );
        END LOOP;
    END IF;
    
    -- Mantém a versão antiga sincronizada para não quebrar componentes que ainda leiam a tabela velha
    INSERT INTO public.patient_data (user_id, data, updated_at)
    VALUES (p_user_id, p_data, now())
    ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

END;
$$;
