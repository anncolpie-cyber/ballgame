export class Projectile {
  constructor({ x, y, vx, vy, dmg, owner, node, life = 3, angle = 0 }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.dmg = dmg;
    this.owner = owner;
    this.node = node;
    this.life = life;
    this.angle = angle;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx;
    this.y += this.vy;
    if (!this.node) return;
    this.node.style.left = `${this.x}px`;
    this.node.style.top = `${this.y}px`;
    this.node.style.transform = `rotate(${this.angle}rad)`;
  }

  remove() {
    if (this.node) this.node.remove();
  }
}
