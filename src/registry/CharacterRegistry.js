import { PvpPlayerBall } from '../characters/PvpPlayerBall.js';
import { FarmerBall } from '../characters/FarmerBall.js';
import { GrannyBall } from '../characters/GrannyBall.js';

class Registry {
  constructor() {
    this.characters = new Map();
  }

  register(id, CharacterClass) {
    this.characters.set(id, CharacterClass);
  }

  create(id, options) {
    const CharacterClass = this.characters.get(id);
    if (!CharacterClass) throw new Error(`Unknown character: ${id}`);
    return new CharacterClass(options);
  }
}

export const CharacterRegistry = new Registry();
CharacterRegistry.register('PVP_PLAYER', PvpPlayerBall);
CharacterRegistry.register('FARMER', FarmerBall);
CharacterRegistry.register('GRANNY', GrannyBall);
