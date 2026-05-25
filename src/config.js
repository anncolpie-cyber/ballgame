export const CONFIG = {
  ballRadius: 28,
  golemRadius: 28,
  golemAttackPadding: 2,
  golemAttackCooldown: 0.8,
  debugGolemHitbox: false,
  minBallSpeed: 1.8,
  maxBallSpeed: 3.0,
  minArrowCooldown: 1.3,
  redBleedDps: 2,
  redBleedDuration: 5,
  bowAimOffset: Math.atan2(-34, -69),
  skillCastLock: {
    hook: 0.35,
    sword: 0.45,
    bow: 0.34,
    turret: 0.25,
    fork: 0.24,
    wheat: 0.25,
    hoe: 0.34,
    golem: 0.35
  }
};

export const ASSETS = {
  redSword: './assets/red-w-sword.png',
  redRod: './assets/red-q-fishing-rod.webp',
  redBobber: './assets/red-q-bobber.png',
  redBow: './assets/red-e-bow.png',
  redArrow: './assets/red-projectile-arrow.png',
  redTurret: './assets/red-r-turret.png',
  wheatMature: './assets/white-w-wheat-mature.png',
  wheatSeed: './assets/white-w-wheat-seed.png',
  whiteFork: './assets/white-q-fork.png',
  whiteHoe: './assets/white-e-hoe.png',
  whiteGolem: './assets/white-r-golem.png',
  grannyTrap: './assets/granny-e-trap-cutout.png',
  grannyRushIcon: './assets/granny-r-rush-cutout.png',
  grannyRushStick: './assets/granny-r-stick.webp'
};

export const SFX_SRC = {
  bow: './assets/sfx/bow.mp3',
  fishing: './assets/sfx/fishing.mp3',
  grass: './assets/sfx/grass.mp3',
  hit: './assets/sfx/hit.mp3',
  ironHurt: './assets/sfx/iron_hurt.mp3',
  ironDie: './assets/sfx/iron_die.mp3',
  planting: './assets/sfx/planting.mp3',
  sword: './assets/sfx/sword.mp3',
  victory: './assets/sfx/victory.mp3',
  grannyDrink: './assets/sfx/granny_drink.mp3',
  grannyTrap: './assets/sfx/granny_trap.mp3',
  grannyRush: './assets/sfx/granny_rush.mp3',
  grannyBoom: './assets/sfx/granny_boom.mp3',
  grannyRiser: './assets/sfx/granny_riser.mp3'
};

export const SFX_VOLUME = {
  sword: 0.38,
  grass: 1,
  grannyDrink: 0.85,
  grannyTrap: 0.85,
  grannyRush: 0.8,
  grannyBoom: 0.95,
  grannyRiser: 0.8
};
