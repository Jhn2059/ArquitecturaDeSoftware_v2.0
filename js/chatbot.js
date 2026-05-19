// ============================================
// CHATBOT - Asistente con IA
// ============================================

const Chatbot = {
  isOpen: false,
  isTyping: false,
  sessionId: null,

  init() {
    this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this._bindUI();
  },

  _bindUI() {
    const fab = document.getElementById('chatbotFab');
    const container = document.getElementById('chatbotContainer');
    const close = document.getElementById('chatbotClose');
    const send = document.getElementById('chatbotSend');
    const input = document.getElementById('chatbotInput');

    fab.addEventListener('click', () => this.toggle());
    close.addEventListener('click', () => this.close());
    send.addEventListener('click', () => this.sendMessage());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    document.getElementById('chatbotContainer').classList.add('open');
    document.getElementById('chatbotFab').style.display = 'none';
    document.getElementById('chatbotInput').focus();
  },

  close() {
    this.isOpen = false;
    document.getElementById('chatbotContainer').classList.remove('open');
    document.getElementById('chatbotFab').style.display = 'flex';
  },

  async sendMessage() {
    const input = document.getElementById('chatbotInput');
    const text = input.value.trim();

    if (!text || this.isTyping) return;

    input.value = '';
    this._addMessage(text, 'user');
    this._showTyping();

    try {
      const response = await this._queryAI(text);
      this._hideTyping();
      this._addMessage(response, 'assistant');
    } catch (err) {
      this._hideTyping();
      this._addMessage(
        'Lo siento, ocurrió un error al procesar tu pregunta. Verifica que el servidor del chatbot esté configurado correctamente.',
        'assistant'
      );
      console.error('Chatbot error:', err);
    }
  },

  _addMessage(text, role) {
    const container = document.getElementById('chatbotMessages');
    const msg = document.createElement('div');
    msg.className = `message ${role}`;

    const content = document.createElement('div');
    content.className = 'message-content';

    if (role === 'assistant') {
      content.innerHTML = marked.parse(text);
    } else {
      content.textContent = text;
    }

    msg.appendChild(content);
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  },

  _showTyping() {
    this.isTyping = true;
    const container = document.getElementById('chatbotMessages');
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'typingIndicator';
    div.innerHTML = `
      <div class="message-content">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  _hideTyping() {
    this.isTyping = false;
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  },

  async _queryAI(message) {
    // Intentar llamar a la función serverless
    const endpoint = CONFIG.CHATBOT_ENDPOINT;
    const sbUrl = CONFIG.SUPABASE_URL;

    // Intentar con Edge Function de Supabase primero
    if (sbUrl && !sbUrl.includes('tu-proyecto')) {
      try {
        const sb = await initSupabase();
        if (!sb) throw new Error('Sin conexión');
        const { data, error } = await sb.functions.invoke('chatbot', {
          body: {
            message,
            sessionId: this.sessionId,
            unit: Crud.currentFilter?.unit || null,
            week: Crud.currentFilter?.week || null
          }
        });

        if (!error && data?.reply) {
          return data.reply;
        }
      } catch (e) {
        // Fall through to next method
      }
    }

    // Fallback: llamar al endpoint Netlify/Vercel
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: this.sessionId,
          unit: Crud.currentFilter?.unit || null,
          week: Crud.currentFilter?.week || null
        })
      });

      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      return data.reply || data.message || 'No se pudo obtener respuesta.';
    } catch (e) {
      // Si todo falla, dar una respuesta local con contexto básico
      return this._localFallback(message);
    }
  },

  _localFallback(message) {
    const q = message.toLowerCase();
    const files = Crud.files || [];
    const answers = [];

    if (q.includes('archivo') || q.includes('archivos') || q.includes('material')) {
      const total = files.length;
      if (total > 0) {
        answers.push(`Actualmente hay **${total} archivo(s)** en la semana seleccionada.`);
        const names = files.slice(0, 5).map(f => `- ${f.name}`);
        if (names.length) answers.push('Algunos archivos:\n' + names.join('\n'));
      } else {
        answers.push('No hay archivos en esta semana aún.');
      }
    }

    if (q.includes('unidad') || q.includes('unidades')) {
      answers.push('El curso tiene **4 unidades**:\n1. Fundamentos de Arquitectura\n2. Patrones de Diseño\n3. Arquitectura Avanzada\n4. Proyecto Final');
    }

    if (q.includes('semana') || q.includes('semanas')) {
      answers.push('El curso está organizado en **16 semanas**, 4 semanas por cada unidad.');
    }

    if (q.includes('hola') || q.includes('buenas') || q.includes('saludos')) {
      answers.push('¡Hola! Soy el asistente virtual de este portafolio. Puedo ayudarte con información sobre las unidades, semanas y archivos del curso. ¿Qué deseas saber?');
    }

    if (q.includes('quiénes') || q.includes('quien') || q.includes('autor') || q.includes('creó') || q.includes('jhon')) {
      answers.push('Este portafolio fue creado por **Jhon Taipe Chavez**, estudiante del curso de Arquitectura de Software.');
    }

    if (answers.length > 0) {
      return answers.join('\n\n');
    }

    return 'No tengo información específica sobre eso. Puedes preguntarme sobre las **unidades**, **semanas**, o los **archivos** disponibles. Si el chatbot con IA está configurado, podré responder con más detalle.';
  }
};
