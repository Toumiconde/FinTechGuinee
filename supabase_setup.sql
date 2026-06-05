-- 1. Création de la table des profils
CREATE TABLE IF NOT EXISTS public.profiles (
    phone TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_seed TEXT,
    avatar_uri TEXT,
    currency TEXT DEFAULT 'GNF',
    language TEXT DEFAULT 'fr',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Activez la sécurité RLS (Row Level Security) mais autorisez l'accès public pour la démo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read profiles" ON public.profiles 
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert profiles" ON public.profiles 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update profiles" ON public.profiles 
    FOR UPDATE USING (true);

-- 2. Création de la table des dépenses/recettes
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    phone TEXT REFERENCES public.profiles(phone) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'GNF',
    description TEXT,
    icon TEXT,
    date TEXT NOT NULL, -- Format DD/MM/YYYY utilisé par l'application
    type TEXT CHECK (type IN ('income', 'expense', 'planned')),
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Activez la sécurité RLS pour les dépenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read expenses" ON public.expenses 
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert expenses" ON public.expenses 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update expenses" ON public.expenses 
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete expenses" ON public.expenses 
    FOR DELETE USING (true);
