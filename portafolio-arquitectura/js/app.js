// ============================================
// APP - Orquestación Principal
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 800,
        once: true,
        offset: 100,
        easing: 'ease-out-cubic'
      });
    }
  } catch (e) { /* AOS no disponible */ }

  try {
    await Auth.init();
  } catch (e) {
    console.warn('Auth.init falló (modo offline):', e?.message);
  }

  Chatbot.init();
  bindUI();
  setupWeekSelect();

  try {
    await loadUnit(1);
    const count = await Crud.getFileCount();
    document.getElementById('fileCountStat').textContent = count;
  } catch (e) {
    console.warn('Carga de archivos falló:', e?.message);
  }
});

// ============================================
// UI BINDINGS
// ============================================

function bindUI() {
  // Navbar toggle (mobile)
  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
    document.getElementById('navToggle').classList.toggle('active');
  });

  // Cerrar nav al hacer clic en link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('navLinks').classList.remove('open');
      document.getElementById('navToggle').classList.remove('active');
    });
  });

  // Tabs de unidades
  document.querySelectorAll('.unit-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const unitId = parseInt(tab.dataset.unit);
      loadUnit(unitId);
    });
  });

  // Navbar scroll
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Active nav link on scroll
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.section, .hero');
    const navLinks = document.querySelectorAll('.nav-link');
    let current = 'hero';

    sections.forEach(section => {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) {
        current = section.id || 'hero';
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  });

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    document.querySelector('#themeToggle i').className = next === 'light' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', next);
  });

  // Restaurar tema
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.querySelector('#themeToggle i').className = savedTheme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
  }

  // Chatbot toggle (navbar button)
  const chatToggleBtn = document.getElementById('chatToggle');
  if (chatToggleBtn) {
    chatToggleBtn.addEventListener('click', () => Chatbot.toggle());
  }

  // Auth button
  document.getElementById('authBtn').addEventListener('click', () => {
    if (Auth.isAdmin()) {
      Auth.logout().catch(console.error);
    } else {
      openModal('loginModal');
    }
  });

  Auth.onAuthChange(user => {
    const btn = document.getElementById('authBtn');
    const text = document.getElementById('authBtnText');
    const uploadBtn = document.getElementById('uploadBtn');

    if (user) {
      text.textContent = 'Cerrar Sesión';
      btn.classList.add('logged-in');
      document.querySelector('#authBtn i').className = 'fas fa-sign-out-alt';
      uploadBtn.style.display = 'inline-flex';
    } else {
      text.textContent = 'Ingresar';
      btn.classList.remove('logged-in');
      document.querySelector('#authBtn i').className = 'fas fa-user';
      uploadBtn.style.display = 'none';
    }
  });

  // Login form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.classList.remove('visible');
    errorEl.textContent = '';

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';

    try {
      await Auth.login(email, password);
      closeModal('loginModal');
      document.getElementById('loginForm').reset();
      showToast('Sesión iniciada como administrador', 'success');
    } catch (err) {
      errorEl.textContent = err.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      errorEl.classList.add('visible');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }
  });

  // Cerrar modales
  document.getElementById('loginModalClose').addEventListener('click', () => closeModal('loginModal'));
  document.getElementById('fileModalClose').addEventListener('click', () => closeModal('fileModal'));
  document.getElementById('confirmModalClose').addEventListener('click', () => closeModal('confirmModal'));
  document.getElementById('fileModalCancel').addEventListener('click', () => closeModal('fileModal'));
  document.getElementById('confirmCancel').addEventListener('click', () => closeModal('confirmModal'));

  // Cerrar modal al hacer clic fuera
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Upload button
  document.getElementById('uploadBtn').addEventListener('click', () => {
    openFileModal();
  });

  // File form submit
  document.getElementById('fileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFileSubmit();
  });

  // File search
  let searchTimeout;
  document.getElementById('fileSearch').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = e.target.value.trim();
      if (q) {
        searchFiles(q);
      } else {
        renderFiles(Crud.files);
      }
    }, 300);
  });

  // File dropzone
  const dropzone = document.getElementById('fileDropzone');
  const fileInput = document.getElementById('fileInput');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      showFilePreview(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      showFilePreview(fileInput.files[0]);
    }
  });
  document.getElementById('filePreviewRemove').addEventListener('click', () => {
    fileInput.value = '';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('fileDropzone').style.display = 'block';
  });

  // Confirm delete
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    const id = document.getElementById('confirmDelete').dataset.fileId;
    if (id) {
      await deleteFile(id);
    }
  });
}

// ============================================
// UNITS & WEEKS
// ============================================

function setupWeekSelect() {
  const select = document.getElementById('fileWeek');
  select.innerHTML = '';
  CONFIG.WEEKS.forEach(w => {
    const unit = Math.ceil(w / 4);
    const option = document.createElement('option');
    option.value = w;
    option.textContent = `Semana ${w}`;
    select.appendChild(option);
  });
}

async function loadUnit(unitId) {
  // Actualizar tabs
  document.querySelectorAll('.unit-tab').forEach(tab => {
    tab.classList.toggle('active', parseInt(tab.dataset.unit) === unitId);
  });

  // Renderizar semanas
  renderWeeks(unitId);

  // Cargar semana 1 por defecto
  const firstWeek = (unitId - 1) * 4 + 1;
  await loadWeek(unitId, firstWeek);
}

async function loadWeek(unitId, weekId) {
  // Actualizar semanas
  document.querySelectorAll('.week-chip').forEach(chip => {
    chip.classList.toggle('active', parseInt(chip.dataset.week) === weekId);
  });

  // Actualizar título
  const unitName = CONFIG.UNITS.find(u => u.id === unitId)?.shortName || '';
  document.getElementById('filesSectionTitle').textContent =
    `Semana ${weekId} — ${unitName}`;

  // Cargar archivos
  await renderFilesForWeek(unitId, weekId);
}

function renderWeeks(unitId) {
  const container = document.getElementById('weeksTimeline');
  const startWeek = (unitId - 1) * 4 + 1;
  const endWeek = startWeek + 3;

  container.innerHTML = '';
  for (let w = startWeek; w <= endWeek; w++) {
    const chip = document.createElement('button');
    chip.className = 'week-chip';
    chip.dataset.week = w;
    chip.textContent = `Semana ${w}`;
    chip.addEventListener('click', () => loadWeek(unitId, w));
    container.appendChild(chip);
  }
}

async function renderFilesForWeek(unitId, weekId) {
  const grid = document.getElementById('filesGrid');
  const empty = document.getElementById('emptyState');
  const loading = document.getElementById('loadingState');

  loading.style.display = 'flex';
  grid.innerHTML = '';
  empty.style.display = 'none';

  try {
    const files = await Crud.loadFiles(unitId, weekId);
    loading.style.display = 'none';

    if (files.length === 0) {
      empty.style.display = 'flex';
    } else {
      renderFiles(files);
    }
  } catch (err) {
    loading.style.display = 'none';
    empty.style.display = 'flex';
    empty.querySelector('p').textContent = 'Error al cargar archivos.';
    console.error(err);
  }
}

function renderFiles(files) {
  const grid = document.getElementById('filesGrid');
  const empty = document.getElementById('emptyState');

  grid.innerHTML = '';

  if (files.length === 0) {
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  files.forEach(file => {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.dataset.id = file.id;

    const iconClass = CONFIG.FILE_TYPE_ICONS[file.file_type] || CONFIG.FILE_TYPE_ICONS.other;
    const colorClass = CONFIG.FILE_TYPE_COLORS[file.file_type] || 'other';
    const fileSize = formatFileSize(file.file_size);

    card.innerHTML = `
      <div class="file-card-icon ${colorClass}">
        <i class="fas ${iconClass}"></i>
      </div>
      <div class="file-card-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
      <div class="file-card-desc">${escapeHtml(file.description || 'Sin descripción')}</div>
      <div class="file-card-meta">
        <span><i class="fas fa-weight"></i> ${fileSize}</span>
        <span><i class="far fa-calendar"></i> ${formatDate(file.created_at)}</span>
      </div>
      ${Auth.isAdmin() ? `
        <div class="file-card-actions">
          <button class="file-card-action" onclick="editFile('${file.id}')" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          <button class="file-card-action danger" onclick="confirmDeleteFile('${file.id}')" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      ` : ''}
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.file-card-actions')) {
        window.open(file.file_url, '_blank');
      }
    });

    grid.appendChild(card);
  });
}

// ============================================
// FILE OPERATIONS
// ============================================

function openFileModal(fileData = null) {
  const modal = document.getElementById('fileModal');
  const form = document.getElementById('fileForm');
  form.reset();

  document.getElementById('fileId').value = '';
  document.getElementById('existingUrl').value = '';
  document.getElementById('existingPath').value = '';
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('fileDropzone').style.display = 'block';
  document.getElementById('fileFormError').classList.remove('visible');

  if (fileData) {
    document.getElementById('fileModalIcon').className = 'fas fa-edit';
    document.getElementById('fileModalTitle').textContent = 'Editar Archivo';
    document.getElementById('fileModalDesc').textContent = 'Modifica los detalles del archivo';
    document.getElementById('fileSubmitText').textContent = 'Guardar Cambios';
    document.getElementById('fileId').value = fileData.id;
    document.getElementById('existingUrl').value = fileData.file_url || '';
    document.getElementById('existingPath').value = fileData.storage_path || '';
    document.getElementById('fileName').value = fileData.name || '';
    document.getElementById('fileType').value = fileData.file_type || 'other';
    document.getElementById('fileUnit').value = fileData.unit || 1;
    document.getElementById('fileWeek').value = fileData.week || 1;
    document.getElementById('fileDesc').value = fileData.description || '';
    document.getElementById('fileTags').value = (fileData.tags || []).join(', ');
    document.getElementById('fileUploadGroup').style.display = 'none';
  } else {
    document.getElementById('fileModalIcon').className = 'fas fa-file-upload';
    document.getElementById('fileModalTitle').textContent = 'Subir Archivo';
    document.getElementById('fileModalDesc').textContent = 'Completa los detalles del archivo';
    document.getElementById('fileSubmitText').textContent = 'Subir Archivo';
    document.getElementById('fileUploadGroup').style.display = 'block';
    document.getElementById('fileUnit').value = Crud.currentFilter.unit || 1;
    const defaultWeek = Crud.currentFilter.week || 1;
    document.getElementById('fileWeek').value = defaultWeek;
  }

  openModal('fileModal');
}

async function handleFileSubmit() {
  const id = document.getElementById('fileId').value;
  const fileInput = document.getElementById('fileInput');
  const errorEl = document.getElementById('fileFormError');
  errorEl.classList.remove('visible');

  const metadata = {
    name: document.getElementById('fileName').value.trim(),
    description: document.getElementById('fileDesc').value.trim(),
    file_type: document.getElementById('fileType').value,
    unit: document.getElementById('fileUnit').value,
    week: document.getElementById('fileWeek').value,
    tags: document.getElementById('fileTags').value.trim()
  };

  if (!metadata.name) {
    errorEl.textContent = 'El nombre del archivo es obligatorio.';
    errorEl.classList.add('visible');
    return;
  }

  const submitBtn = document.getElementById('fileSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

  try {
    if (id) {
      await Crud.updateFile(id, metadata);
      showToast('Archivo actualizado correctamente', 'success');
    } else {
      if (!fileInput.files.length) {
        errorEl.textContent = 'Debes seleccionar un archivo.';
        errorEl.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> <span id="fileSubmitText">Subir Archivo</span>';
        return;
      }
      await Crud.uploadFile(fileInput.files[0], metadata);
      showToast('Archivo subido correctamente', 'success');
    }

    closeModal('fileModal');
    await renderFilesForWeek(Crud.currentFilter.unit, Crud.currentFilter.week);

    const count = await Crud.getFileCount();
    document.getElementById('fileCountStat').textContent = count;
  } catch (err) {
    errorEl.textContent = err.message || 'Error al guardar el archivo.';
    errorEl.classList.add('visible');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-save"></i> <span id="fileSubmitText">${id ? 'Guardar Cambios' : 'Subir Archivo'}</span>`;
  }
}

function editFile(id) {
  const file = Crud.files.find(f => f.id === id);
  if (file) {
    openFileModal(file);
  }
}

function confirmDeleteFile(id) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmTitle').textContent = '¿Eliminar archivo?';
  document.getElementById('confirmDesc').textContent = 'Esta acción eliminará el archivo permanentemente.';
  document.getElementById('confirmDelete').dataset.fileId = id;
  openModal('confirmModal');
}

async function deleteFile(id) {
  closeModal('confirmModal');

  try {
    await Crud.deleteFile(id);
    showToast('Archivo eliminado correctamente', 'success');
    await renderFilesForWeek(Crud.currentFilter.unit, Crud.currentFilter.week);

    const count = await Crud.getFileCount();
    document.getElementById('fileCountStat').textContent = count;
  } catch (err) {
    showToast('Error al eliminar el archivo: ' + err.message, 'error');
    console.error(err);
  }
}

async function searchFiles(query) {
  try {
    const results = await Crud.searchFiles(query);
    renderFiles(results);
  } catch (err) {
    console.error(err);
  }
}

// ============================================
// HELPERS
// ============================================

function showFilePreview(file) {
  document.getElementById('fileDropzone').style.display = 'none';
  const preview = document.getElementById('filePreview');
  preview.style.display = 'flex';
  document.getElementById('filePreviewName').textContent = file.name;
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return 'Desconocido';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// EXPOSER GLOBALES para onclick en HTML
// ============================================
window.loadUnit = loadUnit;
window.loadWeek = loadWeek;
window.editFile = editFile;
window.confirmDeleteFile = confirmDeleteFile;
