-- ============================================
-- ESQUEMA DE SUPABASE - Portafolio Arquitectura
-- ============================================

-- 1. TABLA DE ARCHIVOS DEL CURSO
CREATE TABLE IF NOT EXISTS course_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_type TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  unit INTEGER NOT NULL CHECK (unit >= 1 AND unit <= 4),
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 16),
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE PERFILES (ADMIN)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'visitor')),
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA PARA METADATOS DEL CHATBOT
CREATE TABLE IF NOT EXISTS chatbot_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES course_files(id) ON DELETE CASCADE,
  content_text TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE CONVERSACIONES DEL CHATBOT
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_files_unit_week ON course_files(unit, week);
CREATE INDEX IF NOT EXISTS idx_files_type ON course_files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_created ON course_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON chatbot_conversations(session_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE course_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- --- COURSE FILES ---
CREATE POLICY "Anyone can view files"
  ON course_files FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert files"
  ON course_files FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update files"
  ON course_files FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete files"
  ON course_files FOR DELETE
  USING (auth.role() = 'authenticated');

-- --- PROFILES ---
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- --- CHATBOT CONTEXT ---
CREATE POLICY "Anyone can view chatbot context"
  ON chatbot_context FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage chatbot context"
  ON chatbot_context FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update chatbot context"
  ON chatbot_context FOR UPDATE
  USING (auth.role() = 'authenticated');

-- --- CHATBOT CONVERSATIONS ---
CREATE POLICY "Anyone can insert conversations"
  ON chatbot_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view conversations"
  ON chatbot_conversations FOR SELECT
  USING (true);

-- ============================================
-- TRIGGER PARA ACTUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_files_updated
  BEFORE UPDATE ON course_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- CREAR BUCKET DE STORAGE
-- ============================================
-- EJECUTAR EN SUPABASE SQL EDITOR DESPUÉS DE LA MIGRACIÓN:
--
-- 1. Crear bucket público:
INSERT INTO storage.buckets (id, name, public) VALUES ('course-files', 'course-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Storage:
CREATE POLICY "Anyone can view files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-files');

CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'course-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'course-files' AND auth.role() = 'authenticated');

-- ============================================
-- TRIGGER: CREAR PERFIL AUTOMÁTICAMENTE
-- ============================================
-- Cuando se crea un usuario en Auth, se inserta su perfil automáticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin',
    'Estudiante de Arquitectura de Software'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- INSERTAR PERFIL ADMIN MANUAL (ALTERNATIVA)
-- ============================================
-- Si ya creaste el usuario en Authentication > Users,
-- obtén su ID de auth.users y ejecuta:
-- INSERT INTO profiles (id, full_name, role, bio)
-- VALUES ('<USER_UUID>', 'Jhon Taipe Chavez', 'admin', 'Estudiante de Arquitectura de Software');
-- Para obtener el UUID: SELECT id FROM auth.users WHERE email = 'tu@email.com';
