// ============================================
// HERO ANIMATION - Topología de Red
// Animación tipo "Arquitectura de Software"
// con nodos, conexiones y partículas
// ============================================

class NetworkTopology {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nodes = [];
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };
    this.animationId = null;

    this.NODE_COUNT = 45;
    this.PARTICLE_COUNT = 20;
    this.CONNECTION_DIST = 180;
    this.NODE_BASE_RADIUS = 2.5;

    this.colors = {
      node: 'rgba(201, 164, 74, {{opacity}})',
      nodeCore: 'rgba(201, 164, 74, {{opacity}})',
      connection: 'rgba(201, 164, 74, {{opacity}})',
      particle: 'rgba(201, 164, 74, {{opacity}})',
      glow: 'rgba(201, 164, 74, {{opacity}})'
    };

    this.resize();
    this.initNodes();
    this.initParticles();
    this.bindEvents();
    this.animate();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });
  }

  initNodes() {
    this.nodes = [];
    for (let i = 0; i < this.NODE_COUNT; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: this.NODE_BASE_RADIUS + Math.random() * 2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        isHub: Math.random() < 0.12,
        connections: []
      });
    }
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        life: 1,
        size: 1 + Math.random() * 1.5,
        trail: []
      });
    }
  }

  updateNodes() {
    for (const node of this.nodes) {
      node.x += node.vx;
      node.y += node.vy;
      node.pulse += node.pulseSpeed;

      if (node.x < 0 || node.x > this.width) node.vx *= -1;
      if (node.y < 0 || node.y > this.height) node.vy *= -1;

      node.x = Math.max(0, Math.min(this.width, node.x));
      node.y = Math.max(0, Math.min(this.height, node.y));
    }
  }

  updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.003;

      if (p.life <= 0 || p.x < 0 || p.x > this.width || p.y < 0 || p.y > this.height) {
        p.x = Math.random() * this.width;
        p.y = Math.random() * this.height;
        p.vx = (Math.random() - 0.5) * 0.8;
        p.vy = (Math.random() - 0.5) * 0.8;
        p.life = 1;
      }
    }
  }

  drawConnections(ctx, isLight) {
    const baseOpacity = isLight ? 0.12 : 0.08;

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.CONNECTION_DIST) {
          const opacity = baseOpacity * (1 - dist / this.CONNECTION_DIST);

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(201, 164, 74, ${opacity})`;
          ctx.lineWidth = 0.5 + (1 - dist / this.CONNECTION_DIST) * 0.8;
          ctx.stroke();
        }
      }
    }
  }

  drawNodes(ctx, isLight) {
    for (const node of this.nodes) {
      const pulseFactor = 0.7 + 0.3 * Math.sin(node.pulse);
      const r = node.radius * pulseFactor;

      const nodeOpacity = isLight ? 0.3 : 0.25;
      const hubOpacity = isLight ? 0.5 : 0.4;

      const opacity = node.isHub ? hubOpacity : nodeOpacity;

      // Glow
      if (node.isHub) {
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 6);
        gradient.addColorStop(0, `rgba(201, 164, 74, ${isLight ? 0.08 : 0.05})`);
        gradient.addColorStop(1, 'rgba(201, 164, 74, 0)');
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 6, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Main circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201, 164, 74, ${opacity})`;
      ctx.fill();

      // Core highlight
      if (node.radius > 3) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${isLight ? 0.15 : 0.08})`;
        ctx.fill();
      }
    }
  }

  drawParticles(ctx, isLight) {
    for (const p of this.particles) {
      const opacity = p.life * (isLight ? 0.2 : 0.15);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201, 164, 74, ${opacity})`;
      ctx.fill();
    }
  }

  drawMouseConnection(ctx) {
    const nearby = this.nodes.filter(n => {
      const dx = n.x - this.mouse.x;
      const dy = n.y - this.mouse.y;
      return Math.sqrt(dx * dx + dy * dy) < this.CONNECTION_DIST;
    });

    for (const node of nearby) {
      const dx = node.x - this.mouse.x;
      const dy = node.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const opacity = 0.15 * (1 - dist / this.CONNECTION_DIST);

      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(this.mouse.x, this.mouse.y);
      ctx.strokeStyle = `rgba(201, 164, 74, ${opacity})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  animate() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.updateNodes();
    this.updateParticles();

    this.drawConnections(this.ctx, isLight);
    this.drawParticles(this.ctx, isLight);
    this.drawNodes(this.ctx, isLight);
    this.drawMouseConnection(this.ctx);

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('heroCanvas');
  if (canvas) {
    const topology = new NetworkTopology(canvas);

    // Reiniciar animación al cambiar tema (para actualizar colores)
    const observer = new MutationObserver(() => {
      // No necesitamos reiniciar, el ciclo de animación ya verifica el tema
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }
});
