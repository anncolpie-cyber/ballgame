export class EffectManager {
  constructor(arena) {
    this.arena = arena;
    this.effects = [];
  }

  el(cls, text = '') {
    const node = document.createElement('div');
    node.className = cls;
    node.textContent = text;
    this.arena.appendChild(node);
    return node;
  }

  add(effect) {
    this.effects.push(effect);
    return effect;
  }

  remove(effect) {
    if (typeof effect.remove === 'function') effect.remove();
    else if (effect.node) effect.node.remove();
    const i = this.effects.indexOf(effect);
    if (i >= 0) this.effects.splice(i, 1);
  }

  update(dt) {
    for (const effect of [...this.effects]) {
      if (effect.update) effect.update(dt);
      if (effect.life <= 0) this.remove(effect);
    }
  }

  floatText(x, y, text, cls = '', duration = 700) {
    const node = this.el(`floatText ${cls}`.trim(), text);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.animationDuration = `${duration / 1000}s`;
    setTimeout(() => node.remove(), duration + 120);
    return node;
  }

  makeParticles(x, y, type, count = 14, baseAngle = Math.random() * Math.PI * 2) {
    for (let i = 0; i < count; i++) {
      const node = this.el(`particle ${type}`);
      const angle = baseAngle + (Math.random() - 0.5) * 1.8;
      const speed = type === 'blood' ? 2.5 + Math.random() * 3.2 : 1.2 + Math.random() * 3.0;
      const life = 0.25 + Math.random() * 0.35;
      const effect = {
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'harvest' ? 1.2 : 0.3),
        life,
        maxLife: life,
        node,
        update(dt) {
          this.life -= dt;
          this.x += this.vx;
          this.y += this.vy;
          this.vy += type === 'blood' ? 0.18 : 0.12;
          this.node.style.left = `${this.x}px`;
          this.node.style.top = `${this.y}px`;
          this.node.style.opacity = `${Math.max(0, this.life / this.maxLife)}`;
        },
        remove() { this.node.remove(); }
      };
      node.style.left = `${effect.x}px`;
      node.style.top = `${effect.y}px`;
      node.style.opacity = '1';
      this.add(effect);
    }
  }

  burstBall(ball) {
    const cx = ball.x + ball.radius;
    const cy = ball.y + ball.radius;
    const type = ball.kind === 'red' ? 'deathRed' : 'deathWhite';
    for (let i = 0; i < 34; i++) {
      const node = this.el(`particle ${type}`);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.4 + Math.random() * 5.4;
      const life = 0.55 + Math.random() * 0.45;
      const size = 6 + Math.random() * 8;
      const effect = {
        x: cx + (Math.random() - 0.5) * 18,
        y: cy + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        node,
        update(dt) {
          this.life -= dt;
          this.vx *= 0.985;
          this.vy = this.vy * 0.985 + 0.18;
          this.x += this.vx;
          this.y += this.vy;
          const p = Math.max(0, this.life / this.maxLife);
          this.node.style.left = `${this.x}px`;
          this.node.style.top = `${this.y}px`;
          this.node.style.opacity = `${p}`;
          this.node.style.transform = `rotate(${(1 - p) * 540}deg) scale(${0.75 + p * 0.55})`;
        },
        remove() { this.node.remove(); }
      };
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      node.style.left = `${effect.x}px`;
      node.style.top = `${effect.y}px`;
      this.add(effect);
    }
  }

  showVictory(text) {
    const node = this.el('victoryText', text);
    node.style.top = '45%';
    return node;
  }
}
