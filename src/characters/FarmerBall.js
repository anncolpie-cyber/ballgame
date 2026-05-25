import { Ball } from '../entities/Ball.js';

export class FarmerBall extends Ball {
  static type = 'FARMER';

  constructor(options) {
    super(options);
    this.wheatEnergy = 0;
  }

  addWheat(amount = 1) {
    const before = this.wheatEnergy;
    this.wheatEnergy = Math.min(10, this.wheatEnergy + amount);
    return { before, current: this.wheatEnergy, ready: before < 10 && this.wheatEnergy >= 10 };
  }

  spendWheat(amount = 10) {
    if (this.wheatEnergy < amount) return false;
    this.wheatEnergy -= amount;
    return true;
  }
}
