// ============================================
// AUTH - Autenticación con Supabase
// ============================================

const Auth = {
  currentUser: null,
  session: null,
  listeners: [],

  async init() {
    const sb = await initSupabase();
    if (!sb) {
      console.log('Auth: sin conexión a Supabase (solo lectura)');
      return;
    }

    try {
      const { data: { session }, error } = await sb.auth.getSession();
      if (error) {
        console.warn('Auth: error al obtener sesión:', error.message);
        return;
      }

      this.session = session;
      this.currentUser = session?.user ?? null;
      this._notify();
      this._listen(sb);
    } catch (err) {
      console.warn('Auth: error de inicialización:', err.message);
    }
  },

  _listen(sb) {
    sb.auth.onAuthStateChange((event, session) => {
      this.session = session;
      this.currentUser = session?.user ?? null;
      this._notify();
    });
  },

  onAuthChange(callback) {
    this.listeners.push(callback);
    if (this.currentUser !== null) {
      callback(this.currentUser);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  _notify() {
    this.listeners.forEach(cb => cb(this.currentUser));
  },

  async login(email, password) {
    const sb = await initSupabase();
    if (!sb) throw new Error('Supabase no disponible. Verifica tu conexión.');

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async logout() {
    const sb = await initSupabase();
    if (!sb) return;

    const { error } = await sb.auth.signOut();
    if (error) throw error;
  },

  isAdmin() {
    return this.currentUser !== null;
  },

  getUserId() {
    return this.currentUser?.id ?? null;
  }
};
