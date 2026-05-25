import { Ball } from '../entities/Ball.js';

export class PvpPlayerBall extends Ball {
  static type = 'PVP_PLAYER';

  get hpRatio() {
    return this.maxHp ? Math.max(0, Math.min(1, this.hp / this.maxHp)) : 1;
  }

  get arrowCooldown() {
    const ratio = this.hpRatio;
    if (ratio <= 0.15) return 1.3;
    if (ratio <= 0.30) return 2.0;
    if (ratio <= 0.50) return 3.0;
    if (ratio <= 0.70) return 4.0;
    return 5.0;
  }

  get isRage() {
    return this.hpRatio <= 0.30 && this.hpRatio > 0.15;
  }

  get isLastStand() {
    return this.hpRatio <= 0.15;
  }

  draw() {
    super.draw();
    if (this.node) this.node.classList.toggle('lastStandGlow', this.isLastStand);
  }
}
