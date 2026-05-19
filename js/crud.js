// ============================================
// CRUD - Gestión de Archivos en Supabase
// ============================================

const Crud = {
  files: [],
  currentFilter: { unit: 1, week: 1 },

  async loadFiles(unit, week) {
    const sb = await initSupabase();
    if (!sb) return [];

    this.currentFilter = { unit, week };

    let query = sb
      .from('course_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (unit) query = query.eq('unit', unit);
    if (week) query = query.eq('week', week);

    const { data, error } = await query;
    if (error) {
      console.error('Error loading files:', error.message);
      return [];
    }

    this.files = data || [];
    return this.files;
  },

  async loadAllFiles() {
    const sb = await initSupabase();
    if (!sb) return [];

    const { data, error } = await sb
      .from('course_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }
    this.files = data || [];
    return this.files;
  },

  async uploadFile(file, metadata) {
    const sb = await initSupabase();
    if (!sb) throw new Error('Supabase no disponible');

    const userId = Auth.getUserId();
    if (!userId) throw new Error('Debes iniciar sesión como administrador');

    const safeName = file.name.replace(/ /g, '_').replace(/[^a-zA-Z0-9._-]/g, c => encodeURIComponent(c));
    const filePath = `${userId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await sb.storage
      .from(CONFIG.STORAGE_BUCKET)
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = sb.storage
      .from(CONFIG.STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const fileRecord = {
      name: metadata.name || file.name,
      description: metadata.description || '',
      file_type: metadata.file_type || 'other',
      file_size: file.size,
      file_url: publicUrl,
      storage_path: filePath,
      unit: parseInt(metadata.unit),
      week: parseInt(metadata.week),
      tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      uploaded_by: userId
    };

    const { data, error: insertError } = await sb
      .from('course_files')
      .insert(fileRecord)
      .select()
      .single();

    if (insertError) {
      await sb.storage.from(CONFIG.STORAGE_BUCKET).remove([filePath]).catch(() => {});
      throw insertError;
    }

    return data;
  },

  async updateFile(id, updates) {
    const sb = await initSupabase();
    if (!sb) throw new Error('Supabase no disponible');

    const dataToUpdate = {};
    if (updates.name) dataToUpdate.name = updates.name;
    if (updates.description !== undefined) dataToUpdate.description = updates.description;
    if (updates.file_type) dataToUpdate.file_type = updates.file_type;
    if (updates.unit) dataToUpdate.unit = parseInt(updates.unit);
    if (updates.week) dataToUpdate.week = parseInt(updates.week);
    if (updates.tags) dataToUpdate.tags = updates.tags.split(',').map(t => t.trim()).filter(Boolean);

    const { data, error } = await sb
      .from('course_files')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteFile(id) {
    const sb = await initSupabase();
    if (!sb) throw new Error('Supabase no disponible');

    const { data: existing } = await sb
      .from('course_files')
      .select('storage_path')
      .eq('id', id)
      .single();

    const { error: dbError } = await sb
      .from('course_files')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    if (existing?.storage_path) {
      await sb.storage
        .from(CONFIG.STORAGE_BUCKET)
        .remove([existing.storage_path])
        .catch(() => {});
    }

    return true;
  },

  async getFileCount() {
    const sb = await initSupabase();
    if (!sb) return 0;

    const { count, error } = await sb
      .from('course_files')
      .select('*', { count: 'exact', head: true });

    if (error) return 0;
    return count || 0;
  },

  async getFilesByUnit(unit) {
    const sb = await initSupabase();
    if (!sb) return [];

    const { data, error } = await sb
      .from('course_files')
      .select('*')
      .eq('unit', unit)
      .order('week', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async searchFiles(query) {
    const sb = await initSupabase();
    if (!sb) return [];

    const q = query.toLowerCase();
    const { data, error } = await sb
      .from('course_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.tags && f.tags.some(t => t.toLowerCase().includes(q)))
    );
  }
};
