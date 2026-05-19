// ============================================
// CONFIGURACIÓN - Portafolio Arquitectura
// ============================================
// INSTRUCCIONES:
// 1. Crea un proyecto en https://supabase.com
// 2. Ve a Project Settings > API
// 3. Copia tu URL y Anon Key aquí abajo
// 4. Ejecuta el schema SQL en supabase/migration.sql
// ============================================

const CONFIG = {
  SUPABASE_URL: 'https://ouzdmmgoiztvniolmmmj.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91emRtbWdvaXp0dm5pb2xtbW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjQ4NTUsImV4cCI6MjA5NDcwMDg1NX0.ViAMiWGa9Yi_jr92Ex_yyeawNXD7wWjkyoj92awE3fU',

  // OpenAI (para el chatbot) - Se usa desde la función serverless
  // No expongas tu API key en el frontend
  CHATBOT_ENDPOINT: '/api/chatbot',

  STORAGE_BUCKET: 'course-files',

  ADMIN_EMAIL: 'jhonelvs1919@gmail.com',

  UNITS: [
    { id: 1, name: 'Fundamentos de Arquitectura', shortName: 'Fundamentos' },
    { id: 2, name: 'Patrones de Diseño', shortName: 'Patrones' },
    { id: 3, name: 'Arquitectura Avanzada', shortName: 'Avanzado' },
    { id: 4, name: 'Proyecto Final', shortName: 'Proyecto' }
  ],

  WEEKS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],

  FILE_TYPE_ICONS: {
    pdf: 'fa-file-pdf',
    image: 'fa-file-image',
    video: 'fa-file-video',
    document: 'fa-file-alt',
    code: 'fa-file-code',
    other: 'fa-file'
  },

  FILE_TYPE_COLORS: {
    pdf: 'pdf',
    image: 'image',
    video: 'video',
    document: 'document',
    code: 'code',
    other: 'other'
  }
};
