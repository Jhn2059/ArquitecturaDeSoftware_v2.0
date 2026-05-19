// ============================================
// SUPABASE INIT - Cliente de Supabase
// Carga ESM desde esm.sh (más confiable)
// ============================================

let supabase = null;

async function initSupabase() {
  if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.includes('tu-proyecto')) {
    console.warn('⚠️ Supabase no configurado. Revisa js/config.js');
    return null;
  }

  if (supabase) return supabase;

  try {
    const { createClient } = await import(
      'https://esm.sh/@supabase/supabase-js@2.39.0'
    );

    supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    });

    return supabase;
  } catch (err) {
    console.warn('⚠️ No se pudo cargar Supabase SDK:', err?.message);
    console.warn('   La app funciona igual, pero sin conexión a la base de datos.');
    return null;
  }
}

function getSupabase() {
  return supabase;
}
