export class Ball {
  constructor({ kind, team, displayName, color, x, y, vx, vy, hp, maxHp, radius, node }) {
    this.kind = kind;
    this.team = team;
    this.displayName = displayName;
    this.color = color;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.hp = hp;
    this.maxHp = maxHp;
    this.radius = radius;
    this.node = node;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    if (!this.node) return;
    this.node.style.transform = `translate(${this.x}px, ${this.y}px)`;
    this.drawHpText();
  }

  drawHpText() {
    if (this.node) this.node.textContent = Math.max(0, Math.ceil(this.hp));
  }

  takeDamage(amount) {
    this.hp -= amount;
    return this.hp <= 0;
  }

  die() {
    if (this.node) {
      this.node.remove();
      this.node = null;
    }
  }

  onCollision() {}
}
