-- ============================================
-- RESET TOTAL - Limpia todo lo creado
-- Ejecuta esto ANTES de volver a correr migration.sql
-- ============================================

-- 1. Eliminar tablas (con CASCADE para borrar dependencias)
DROP TABLE IF EXISTS public.chatbot_conversations CASCADE;
DROP TABLE IF EXISTS public.chatbot_context CASCADE;
DROP TABLE IF EXISTS public.course_files CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Eliminar funciones
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Eliminar triggers (por si acaso)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS course_files_updated ON public.course_files;

-- 4. Eliminar políticas de storage
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;

-- 5. Eliminar todos los archivos del bucket (opcional)
-- DELETE FROM storage.objects WHERE bucket_id = 'course-files';

-- 6. Eliminar el bucket
DELETE FROM storage.buckets WHERE id = 'course-files';

-- 7. Verificar que quedó limpio
SELECT '✅ Todo eliminado correctamente' AS resultado;
