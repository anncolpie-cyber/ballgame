import { Ball } from '../entities/Ball.js';

export class GrannyBall extends Ball {
  static type = 'GRANNY';

  constructor(options) {
    super(options);
    this.shield = 0;
    this.stunnedUntil = 0;
    this.rushUntil = 0;
    this.rushTriggered = false;
    this.rushChargeUntil = 0;
    this.rushSwingUntil = 0;
    this.rushParticleNext = 0;
    this.moveSpeedMultiplier = 1;
    this.slipperCooldownReduction = 0;
    this.slipperHitCount = 0;
    this.slipperDamageBonus = 0;
  }

  takeDamage(amount) {
    const blocked = Math.min(this.shield, amount);
    this.shield -= blocked;
    this.hp -= amount - blocked;
    return this.hp <= 0;
  }

  addShield(amount) {
    this.shield = Math.min(30, this.shield + amount);
  }

  heal(amount) {
    this.hp = this.maxHp === Infinity ? this.hp + amount : Math.min(this.maxHp, this.hp + amount);
  }
}
