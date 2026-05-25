import { CONFIG, ASSETS, SFX_SRC, SFX_VOLUME } from '../config.js?v=granny-sfx-2';
import {
  angleTo,
  bounceBody as physicsBounceBody,
  circleHitsSegment,
  clamp,
  distance as dist,
  localPointToWorld,
  normalizeSpeed,
  randVelocity,
  rotatePointAround
} from './Physics.js';
import { SoundManager } from './SoundManager.js?v=granny-sfx-2';
import { EffectManager } from './EffectManager.js';
import { Projectile } from '../entities/Projectile.js';
import { CharacterRegistry } from '../registry/CharacterRegistry.js';

const DEFAULT_BATTLE = {
  id: 'default-three-way',
  title: [
    { label: 'PVP PLAYER', className: 'redText' },
    { label: 'Farmer', className: 'farmerText' },
    { label: 'Granny', className: 'grannyText' }
  ],
  activeSkillBars: ['red', 'white', 'granny'],
  fighters: [
    { slot: 'red', kind: 'red', hp: 160, spawn: () => ({ x: 72, y: 95 }) },
    { slot: 'white', kind: 'white', hp: 150, spawn: ({ arenaSize }) => ({ x: arenaSize - 110, y: arenaSize - 110 }) },
    { slot: 'granny', kind: 'granny', hp: 150, spawn: ({ arenaSize }) => ({ x: arenaSize - 98, y: 70 }) }
  ]
};

export class Game {
  constructor(options = {}) {
    this.options = options;
    this.runtime = null;
  }

  start() {
    if (!this.runtime) this.runtime = createGameRuntime(this.options);
    return this.runtime;
  }
}

function createGameRuntime(options = {}) {
  const arena = options.arena || document.getElementById('arena');
  const pauseBtn = options.pauseBtn || document.getElementById('pauseBtn');
  const resetBtn = options.resetBtn || document.getElementById('resetBtn');
  const golemText = document.getElementById('golemText');
  const effectManager = new EffectManager(arena);
  const battle = options.battle || DEFAULT_BATTLE;

  const BALL_R = CONFIG.ballRadius;
  const GOLEM_R = CONFIG.golemRadius;
  const GOLEM_ATTACK_PADDING = CONFIG.golemAttackPadding;
  const GOLEM_ATTACK_COOLDOWN = CONFIG.golemAttackCooldown;
  const DEBUG_GOLEM_HITBOX = CONFIG.debugGolemHitbox;
  const OLD_GRANNY_RUSH_MIN_SPEED = 3.8;
  const OLD_GRANNY_RUSH_MAX_SPEED = 4.8;
  const GRANNY_RUSH_MIN_SPEED = OLD_GRANNY_RUSH_MIN_SPEED * 2;
  const GRANNY_RUSH_MAX_SPEED = OLD_GRANNY_RUSH_MAX_SPEED * 2;
  const GRANNY_RUSH_IMPULSE = 3.2 * 2;
  const GRANNY_RUSH_CLONE_SPEED = 4.3 * 2;
  const MIN_BALL_SPEED = Math.max(CONFIG.minBallSpeed, OLD_GRANNY_RUSH_MIN_SPEED * .75);
  const MAX_BALL_SPEED = Math.max(CONFIG.maxBallSpeed, MIN_BALL_SPEED + .15);
  const MIN_ARROW_COOLDOWN = CONFIG.minArrowCooldown;
  const ANGRY_SLIPPER_BASE_COOLDOWN = .5;
  const ANGRY_SLIPPER_HIT_REDUCTION = .05;
  const ANGRY_SLIPPER_MIN_COOLDOWN = .2;
  const ANGRY_SLIPPER_MAX_REDUCTION = ANGRY_SLIPPER_BASE_COOLDOWN - ANGRY_SLIPPER_MIN_COOLDOWN;
  const FARMER_AWAKENED_WHEAT_BASE_CD = 2.5;
  const FARMER_WHEAT_CD_STEP = 5;
  const FARMER_WHEAT_CD_REDUCTION = .25;
  const FARMER_WHEAT_MIN_CD = .5;
  const FARMER_GOLEM_HP_STEP = 10;
  const FARMER_GOLEM_HP_BONUS = 20;
  const SUPER_GOLEM_PROGRESS_SHOW_AT = 40;
  const SUPER_GOLEM_WHEAT_GOAL = 50;
  const SUPER_GOLEM_HP = 400;
  const SUPER_GOLEM_DAMAGE = 40;
  const SUPER_GOLEM_SCALE = 2;
  const RED_BLEED_DPS = CONFIG.redBleedDps;
  const RED_BLEED_DURATION = CONFIG.redBleedDuration;
  const BOW_AIM_OFFSET = CONFIG.bowAimOffset;
  const SKILL_CAST_LOCK = CONFIG.skillCastLock;
  const FALLBACK_RED_SWORD_SRC = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" shape-rendering="crispEdges"%3E%3Crect width="128" height="128" fill="none"/%3E%3Crect x="74" y="0" width="10" height="10" fill="%23f6f6f6"/%3E%3Crect x="64" y="10" width="20" height="10" fill="%23d6d6d6"/%3E%3Crect x="74" y="10" width="10" height="10" fill="%23ffffff"/%3E%3Crect x="54" y="20" width="20" height="10" fill="%23bdbdbd"/%3E%3Crect x="64" y="20" width="20" height="10" fill="%23eeeeee"/%3E%3Crect x="74" y="20" width="10" height="10" fill="%23ffffff"/%3E%3Crect x="44" y="30" width="20" height="10" fill="%23a6a6a6"/%3E%3Crect x="54" y="30" width="20" height="10" fill="%23dedede"/%3E%3Crect x="64" y="30" width="10" height="10" fill="%23ffffff"/%3E%3Crect x="34" y="40" width="20" height="10" fill="%238e8e8e"/%3E%3Crect x="44" y="40" width="20" height="10" fill="%23d2d2d2"/%3E%3Crect x="54" y="40" width="10" height="10" fill="%23f7f7f7"/%3E%3Crect x="24" y="50" width="20" height="10" fill="%23757575"/%3E%3Crect x="34" y="50" width="20" height="10" fill="%23c2c2c2"/%3E%3Crect x="44" y="50" width="10" height="10" fill="%23efefef"/%3E%3Crect x="14" y="60" width="20" height="10" fill="%23636363"/%3E%3Crect x="24" y="60" width="20" height="10" fill="%23b0b0b0"/%3E%3Crect x="34" y="60" width="10" height="10" fill="%23e6e6e6"/%3E%3Crect x="20" y="66" width="28" height="12" fill="%23505050"/%3E%3Crect x="0" y="60" width="20" height="18" fill="%23646464"/%3E%3Crect x="28" y="72" width="14" height="14" fill="%23603805"/%3E%3Crect x="18" y="82" width="14" height="14" fill="%239a6a12"/%3E%3Crect x="8" y="92" width="14" height="14" fill="%235d3a08"/%3E%3Crect x="0" y="106" width="20" height="10" fill="%23656565"/%3E%3C/svg%3E';
  const redSwordIcon = document.querySelector('#rSword .pixelSwordIcon');
  const RED_SWORD_SRC = redSwordIcon.getAttribute('src');
  redSwordIcon.addEventListener('error', () => {
    redSwordIcon.src = FALLBACK_RED_SWORD_SRC;
  }, { once: true });
  const redRodIcon = document.querySelector('#rHook .pixelRodIcon');
  const RED_ROD_SRC = redRodIcon.getAttribute('src');
  const RED_BOBBER_SRC = ASSETS.redBobber;
  const redBowIcon = document.querySelector('#rBow .pixelBowIcon');
  const RED_BOW_SRC = redBowIcon.getAttribute('src');
  const whiteWheatIcon = document.querySelector('#wWheat .pixelWheatIcon');
  const WHITE_WHEAT_MATURE_SRC = whiteWheatIcon.getAttribute('src');
  const WHITE_WHEAT_SEED_SRC = ASSETS.wheatSeed;
  const whiteForkIcon = document.querySelector('#wFork .pixelForkIcon');
  const WHITE_FORK_SRC = whiteForkIcon.getAttribute('src');
  const whiteHoeIcon = document.querySelector('#wHoe .pixelHoeIcon');
  const WHITE_HOE_SRC = whiteHoeIcon.getAttribute('src');
  const whiteGolemIcon = document.querySelector('#wGolem .pixelGolemIcon');
  const WHITE_GOLEM_SRC = whiteGolemIcon.getAttribute('src');
  const GRANNY_TRAP_SRC = './assets/granny-e-trap-cutout.png';
  const GRANNY_RUSH_ICON_SRC = ASSETS.grannyRushIcon || './assets/granny-r-rush-cutout.png';
  const GRANNY_RUSH_STICK_SRC = ASSETS.grannyRushStick || './assets/granny-r-stick.webp';

  function redSwordSrc() {
    return redSwordIcon.currentSrc || redSwordIcon.src || RED_SWORD_SRC || FALLBACK_RED_SWORD_SRC;
  }

  function redRodSrc() {
    return redRodIcon.currentSrc || redRodIcon.src || RED_ROD_SRC;
  }

  function redBobberSrc() {
    return RED_BOBBER_SRC;
  }

  function redBowSrc() {
    return redBowIcon.currentSrc || redBowIcon.src || RED_BOW_SRC;
  }

  function whiteWheatMatureSrc() {
    return whiteWheatIcon.currentSrc || whiteWheatIcon.src || WHITE_WHEAT_MATURE_SRC;
  }

  function whiteForkSrc() {
    return whiteForkIcon.currentSrc || whiteForkIcon.src || WHITE_FORK_SRC;
  }

  function whiteHoeSrc() {
    return whiteHoeIcon.currentSrc || whiteHoeIcon.src || WHITE_HOE_SRC;
  }

  function whiteGolemSrc() {
    return whiteGolemIcon.currentSrc || whiteGolemIcon.src || WHITE_GOLEM_SRC;
  }

  function grannyTrapSrc() {
    return GRANNY_TRAP_SRC;
  }

  function grannyRushStickSrc() {
    return GRANNY_RUSH_STICK_SRC;
  }

  function grannyRushIconSrc() {
    return GRANNY_RUSH_ICON_SRC;
  }

  const soundManager = new SoundManager(SFX_SRC, SFX_VOLUME);
  soundManager.setCooldown('hit', .04);
  soundManager.setCooldown('grass', .08);
  soundManager.attachUnlock(window);

  function playSound(name) {
    soundManager.play(name);
  }

  function playLoopSound(name) {
    soundManager.playLoop(name);
  }

  function stopSound(name) {
    soundManager.stop(name);
  }

  const redSkillUI = {
    hook: document.getElementById('rHook'),
    sword: document.getElementById('rSword'),
    bow: document.getElementById('rBow'),
    turret: document.getElementById('rTurret')
  };
  const whiteSkillUI = {
    fork: document.getElementById('wFork'),
    wheat: document.getElementById('wWheat'),
    hoe: document.getElementById('wHoe'),
    golem: document.getElementById('wGolem')
  };
  const grannySkillUI = {
    slipper: document.getElementById('gSlipper'),
    soup: document.getElementById('gSoup'),
    trap: document.getElementById('gTrap'),
    rush: document.getElementById('gRush')
  };

  const redSkills = {
    hook: { cd: 7, last: -999 },
    sword: { cd: 2, last: -999 },
    bow: { cd: 5, last: -999 },
    turret: { cd: 20, last: -999 }
  };
  const whiteSkills = {
    fork: { cd: 2, last: -999 },
    wheat: { cd: 5, last: -999 },
    hoe: { cd: 5, last: -999 },
    golem: { cd: 20, last: -999 }
  };
  const grannySkills = {
    slipper: { cd: 3, last: -999 },
    soup: { cd: 5, last: -999 },
    trap: { cd: 8, last: -999 },
    rush: { cd: 14, last: -999 }
  };
  const skillBars = {
    red: document.querySelector('.redSkills'),
    white: document.querySelector('.whiteSkills'),
    granny: document.querySelector('.grannySkills')
  };
  const skillGroups = {
    red: { skills: redSkills, ui: redSkillUI },
    white: { skills: whiteSkills, ui: whiteSkillUI },
    granny: { skills: grannySkills, ui: grannySkillUI }
  };
  const titleRow = document.querySelector('.titleRow');
  const activeSkillBars = new Set(battle.activeSkillBars || Object.keys(skillBars));

  function applyBattleUI() {
    for (const [slot, node] of Object.entries(skillBars)) {
      if (node) node.style.display = activeSkillBars.has(slot) ? '' : 'none';
    }

    if (!titleRow || !Array.isArray(battle.title)) return;
    titleRow.textContent = '';
    battle.title.forEach((entry, index) => {
      if (index > 0) {
        const vs = document.createElement('span');
        vs.className = 'vs';
        vs.textContent = 'VS';
        titleRow.appendChild(vs);
      }
      const label = document.createElement('span');
      label.className = entry.className || '';
      label.textContent = entry.label;
      titleRow.appendChild(label);
    });
  }

  const state = {
    paused: false,
    over: false,
    lastReal: performance.now() / 1000,
    gameTime: 0,
    hitStopUntil: 0,
    redBleedUntil: 0,
    redBleedNextTick: 0,
    skillLockUntil: 0,
    red: null,
    white: null,
    granny: null,
    redStatus: null,
    grannyShield: null,
    superGolemProgress: null,
    winner: null,
    farmerAwakened: false,
    grannyAwakened: false,
    lastHarvestAnnounced: false,
    angryGrandmaAnnounced: false,
    lastHarvestWheatEaten: 0,
    lastHarvestWheatForCooldown: 0,
    farmerWheatCooldownReduction: 0,
    farmerGolemHpHarvested: 0,
    farmerGolemHpBonus: 0,
    energy: 0,
    projectiles: [],
    turrets: [],
    wheats: [],
    golems: [],
    traps: [],
    rushClones: [],
    effects: effectManager.effects
  };

  function startAllSkillsOnCooldown() {
    Object.values(redSkills).forEach(s => s.last = state.gameTime);
    Object.values(whiteSkills).forEach(s => s.last = state.gameTime);
    Object.values(grannySkills).forEach(s => s.last = state.gameTime);
  }

  function redHpRatio() {
    if (!state.red || !state.red.maxHp) return 1;
    return clamp(state.red.hp / state.red.maxHp, 0, 1);
  }

  function hpRatio(ball) {
    if (!ball || !ball.maxHp) return 1;
    return clamp(ball.hp / ball.maxHp, 0, 1);
  }

  function isFarmerAwakened() {
    return state.white && state.white.node && (state.farmerAwakened || hpRatio(state.white) <= .3);
  }

  function isGrannyAwakened() {
    return state.granny && state.granny.node && (state.grannyAwakened || hpRatio(state.granny) <= .3);
  }

  function farmerWheatHeal() {
    return isFarmerAwakened() ? 4 : 2;
  }

  function farmerWheatMatureTime() {
    return isFarmerAwakened() ? 3.5 : 5;
  }

  function farmerWheatCooldown() {
    return isFarmerAwakened()
      ? Math.max(FARMER_WHEAT_MIN_CD, FARMER_AWAKENED_WHEAT_BASE_CD - state.farmerWheatCooldownReduction)
      : 5;
  }

  function farmerGolemCost() {
    return isFarmerAwakened() ? 8 : 10;
  }

  function farmerGolemStats() {
    const hpBonus = state.farmerGolemHpBonus || 0;
    return isFarmerAwakened()
      ? { hp: 120 + hpBonus, life: 18, upgraded: true }
      : { hp: 90 + hpBonus, life: 16, upgraded: false };
  }

  function grannySlipperSpeed() {
    return isGrannyAwakened() ? 5.2 : 3.6;
  }

  function grannySlipperCooldown() {
    const reduction = Math.min(state.granny?.slipperCooldownReduction || 0, ANGRY_SLIPPER_MAX_REDUCTION);
    return isGrannyAwakened()
      ? Math.max(ANGRY_SLIPPER_MIN_COOLDOWN, ANGRY_SLIPPER_BASE_COOLDOWN - reduction)
      : 3;
  }

  function grannySlipperInterval() {
    return isGrannyAwakened() ? grannySlipperCooldown() : .5;
  }

  function grannySlipperShotCount() {
    return isGrannyAwakened() ? 1 : 4;
  }

  function grannySlipperDamage() {
    return 5 + (isGrannyAwakened() ? (state.granny?.slipperDamageBonus || 0) : 0);
  }

  function grannyMoveSpeedMultiplier() {
    return state.granny?.moveSpeedMultiplier || 1;
  }

  function redArrowCooldownForRatio(hpRatio) {
    hpRatio = clamp(hpRatio, 0, 1);
    if (hpRatio <= .15) return MIN_ARROW_COOLDOWN;
    if (hpRatio <= .30) return 2.0;
    if (hpRatio <= .50) return 3.0;
    if (hpRatio <= .70) return 4.0;
    return 5.0;
  }

  function redArrowCooldown() {
    if (state.red && typeof state.red.arrowCooldown === 'number') return state.red.arrowCooldown;
    return redArrowCooldownForRatio(redHpRatio());
  }

  function updateRedArrowCooldown() {
    redSkills.bow.cd = Math.max(MIN_ARROW_COOLDOWN, redArrowCooldown());
  }

  function updateAwakenedSkillValues() {
    if (state.white?.node && hpRatio(state.white) <= .3) state.farmerAwakened = true;
    if (state.granny?.node && hpRatio(state.granny) <= .3) state.grannyAwakened = true;
    if (state.farmerAwakened && state.white?.node) state.white.maxHp = Infinity;
    if (state.grannyAwakened && state.granny?.node) state.granny.maxHp = Infinity;

    whiteSkills.wheat.cd = farmerWheatCooldown();
    grannySkills.slipper.cd = grannySlipperCooldown();

    if (isFarmerAwakened() && !state.lastHarvestAnnounced) {
      state.lastHarvestAnnounced = true;
      if (state.white?.node) floatText(state.white.x - 32, state.white.y - 48, 'LAST HARVEST!', 'awakeningText', 1400);
    }

    if (isGrannyAwakened() && !state.angryGrandmaAnnounced) {
      state.angryGrandmaAnnounced = true;
      if (state.granny?.node) floatText(state.granny.x - 38, state.granny.y - 48, 'ANGRY GRANDMA!', 'awakeningText angryText', 1400);
    }
  }

  const now = () => performance.now() / 1000;
  const arenaSize = () => arena.clientWidth;

  function wheatCenter(crop) {
    return { x: crop.x + 18, y: crop.y + 18 };
  }

  function el(cls, text = '') {
    return effectManager.el(cls, text);
  }

  const randVel = randVelocity;

  function clearArena() {
    [...arena.children].forEach(child => {
      if (!child.classList.contains('watermark')) child.remove();
    });
  }

  function makeBall(kind, x, y, hp) {
    const isRed = kind === 'red';
    const isGranny = kind === 'granny';
    const v = randVel(isRed ? 1.9 : isGranny ? 2.05 : 2.0);
    const characterId = isRed ? 'PVP_PLAYER' : isGranny ? 'GRANNY' : 'FARMER';
    return CharacterRegistry.create(characterId, {
      kind,
      team: isRed ? 'pvp' : isGranny ? 'granny' : 'farmer',
      displayName: isRed ? 'PVP PLAYER' : isGranny ? 'Granny' : 'Farmer',
      color: isRed ? '#ff3030' : isGranny ? '#b58cff' : '#ffffff',
      x, y,
      vx: isRed ? Math.abs(v.vx) : -Math.abs(v.vx),
      vy: isRed || isGranny ? Math.abs(v.vy) : -Math.abs(v.vy),
      hp,
      maxHp: isRed ? 160 : 150,
      radius: BALL_R,
      node: el(`ball ${isRed ? 'redBall' : isGranny ? 'grannyBall' : 'whiteBall'}`, String(hp))
    });
  }

  function spawnBattleBalls() {
    const context = { arenaSize: arenaSize(), ballRadius: BALL_R };
    state.red = null;
    state.white = null;
    state.granny = null;

    for (const fighter of battle.fighters || DEFAULT_BATTLE.fighters) {
      const spawn = typeof fighter.spawn === 'function'
        ? fighter.spawn(context)
        : { x: fighter.x || 0, y: fighter.y || 0 };
      state[fighter.slot] = makeBall(fighter.kind, spawn.x, spawn.y, fighter.hp);
    }
  }

  function makeRedStatus() {
    const node = el('redStatus');
    const mode = document.createElement('div');
    const cd = document.createElement('div');
    const cdLabel = document.createElement('span');
    const cdValue = document.createElement('span');
    mode.className = 'redModeText';
    cd.className = 'arrowCdText';
    cdLabel.textContent = 'Arrow CD:';
    cdValue.className = 'arrowCdValue';
    cd.appendChild(cdLabel);
    cd.appendChild(cdValue);
    node.appendChild(mode);
    node.appendChild(cd);
    return { node, mode, cd, cdValue };
  }

  function makeGrannyShieldStatus() {
    const node = el('grannyShield');
    node.style.display = 'none';
    return { node };
  }

  function makeSuperGolemProgressStatus() {
    const node = el('superGolemProgress');
    node.style.display = 'none';
    return { node };
  }

  function reset() {
    applyBattleUI();
    clearArena();
    state.paused = false;
    state.over = false;
    state.lastReal = now();
    state.gameTime = 0;
    state.hitStopUntil = 0;
    state.skillLockUntil = 0;
    state.redBleedUntil = 0;
    state.redBleedNextTick = 0;
    state.winner = null;
    stopSound('grannyRush');
    state.farmerAwakened = false;
    state.grannyAwakened = false;
    state.lastHarvestAnnounced = false;
    state.angryGrandmaAnnounced = false;
    state.lastHarvestWheatEaten = 0;
    state.lastHarvestWheatForCooldown = 0;
    state.farmerWheatCooldownReduction = 0;
    state.farmerGolemHpHarvested = 0;
    state.farmerGolemHpBonus = 0;
    state.energy = 0;
    spawnBattleBalls();
    state.redStatus = state.red ? makeRedStatus() : null;
    state.grannyShield = state.granny ? makeGrannyShieldStatus() : null;
    state.superGolemProgress = state.white ? makeSuperGolemProgressStatus() : null;
    state.projectiles = [];
    state.turrets = [];
    state.wheats = [];
    state.golems = [];
    state.traps = [];
    state.rushClones = [];
    state.effects.length = 0;
    updateRedArrowCooldown();
    startAllSkillsOnCooldown();
    pauseBtn.textContent = '暫停';
  }

  function bounceBody(body, radius) {
    physicsBounceBody(body, radius, arenaSize());
  }

  function floatText(x, y, text, cls = '', duration = 700) {
    const node = el(`floatText ${cls}`.trim(), text);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.animationDuration = `${duration / 1000}s`;
    setTimeout(() => node.remove(), duration + 120);
  }

  function farmerFloat(text, cls = 'healText', offset = 0) {
    if (!state.white || !state.white.node) return;
    floatText(state.white.x + 2, state.white.y - 24 - offset, text, cls, 1000);
  }

  function liveBalls() {
    return [state.red, state.white, state.granny].filter(ball => ball && ball.node && ball.hp > 0);
  }

  function ballCenter(ball) {
    return { x: ball.x + ball.radius, y: ball.y + ball.radius };
  }

  function golemRadius(golem) {
    return golem?.radius || GOLEM_R;
  }

  function golemCenter(golem) {
    const radius = golemRadius(golem);
    return { x: golem.x + radius, y: golem.y + radius };
  }

  function isStunned(ball) {
    return ball && ball.stunnedUntil && state.gameTime < ball.stunnedUntil;
  }

  function aliveGolems() {
    return state.golems.filter(g => g && g.node && g.hp > 0);
  }

  function isFarmerProtectedByGolems() {
    return Boolean(state.white && state.white.node && state.white.hp < 30 && aliveGolems().length > 0);
  }

  function isBallUntargetable(ball) {
    return ball === state.white && isFarmerProtectedByGolems();
  }

  function isGrannyRushing(granny = state.granny) {
    return granny && !granny.rushTriggered && state.gameTime < (granny.rushUntil || 0);
  }

  function isGrannyCharging(granny = state.granny) {
    return granny && state.gameTime < (granny.rushChargeUntil || 0);
  }

  function isGrannySwinging(granny = state.granny) {
    return granny && state.gameTime < (granny.rushSwingUntil || 0);
  }

  function isGrannyRushDefending(granny = state.granny) {
    if (granny === state.granny && state.rushClones.some(clone => isGrannyRushing(clone) || isGrannyCharging(clone) || isGrannySwinging(clone))) return true;
    return isGrannyRushing(granny) || isGrannyCharging(granny) || isGrannySwinging(granny);
  }

  function isGrannyLocked(granny = state.granny) {
    return isGrannyCharging(granny) || isGrannySwinging(granny);
  }

  function applyStun(ball, seconds) {
    if (!ball || !ball.node) return;
    ball.stunnedUntil = Math.max(ball.stunnedUntil || 0, state.gameTime + seconds);
    ball.node.classList.add('stunned');
    floatText(ball.x + 4, ball.y - 30, 'STUN', 'readyText', 900);
  }

  function enemyBallTargets(actor) {
    return liveBalls()
      .filter(ball => ball !== actor)
      .filter(ball => !isBallUntargetable(ball))
      .map(ball => {
        const center = ballCenter(ball);
        return { type: ball.kind, ref: ball, x: center.x, y: center.y, radius: ball.radius };
      });
  }

  function nearestEnemyBall(actor) {
    if (!actor || !actor.node) return null;
    const center = ballCenter(actor);
    return enemyBallTargets(actor).reduce((best, cur) => {
      if (!best) return cur;
      return dist(center.x, center.y, cur.x, cur.y) < dist(center.x, center.y, best.x, best.y) ? cur : best;
    }, null);
  }

  function golemTargets() {
    return state.golems
      .filter(g => g && g.node && g.hp > 0)
      .map(g => {
        const center = golemCenter(g);
        return { type: 'golem', ref: g, x: center.x, y: center.y, radius: golemRadius(g) };
      });
  }

  function grannyTargets() {
    if (!state.granny || !state.granny.node) return [];
    return [...enemyBallTargets(state.granny), ...golemTargets()];
  }

  function targetCenter(target) {
    if (!target || !target.ref) return null;
    if (target.type === 'golem') return golemCenter(target.ref);
    return { x: target.ref.x + target.ref.radius, y: target.ref.y + target.ref.radius };
  }

  function refreshTarget(target) {
    if (!target || !target.ref || !target.ref.node || target.ref.hp <= 0) return null;
    if (isBallUntargetable(target.ref)) return null;
    const center = targetCenter(target);
    if (!center) return null;
    return {
      type: target.type,
      ref: target.ref,
      x: center.x,
      y: center.y,
      radius: target.type === 'golem' ? golemRadius(target.ref) : target.ref.radius
    };
  }

  function markTrapCombo(target) {
    const liveTarget = refreshTarget(target);
    if (!liveTarget) return;
    liveTarget.ref.trapComboUntil = state.gameTime + 2;
  }

  function hasTrapCombo(target) {
    return Boolean(target && target.ref && (target.ref.trapComboUntil || 0) > state.gameTime);
  }

  function clearTrapCombo(target) {
    if (target && target.ref) target.ref.trapComboUntil = 0;
  }

  function targetFloatPos(target) {
    if (!target || !target.ref) return { x: 12, y: 12 };
    if (target.type === 'golem') return { x: target.ref.x - 8, y: target.ref.y - 30 };
    return { x: target.ref.x - 4, y: target.ref.y - 42 };
  }

  function nearestGrannyTarget() {
    return nearestGrannyTargetFrom(state.granny);
  }

  function nearestGrannyTargetFrom(actor) {
    if (!actor || !actor.node || !state.granny || !state.granny.node) return null;
    const center = ballCenter(actor);
    return grannyTargets().reduce((best, cur) => {
      if (!best) return cur;
      return dist(center.x, center.y, cur.x, cur.y) < dist(center.x, center.y, best.x, best.y) ? cur : best;
    }, null);
  }

  function damageGrannyTarget(target, dmg, fromX, fromY, knock, stop, damageTextClass = '') {
    const liveTarget = refreshTarget(target);
    if (!liveTarget) return null;
    if (liveTarget.type === 'golem') damageGolem(liveTarget.ref, dmg, fromX, fromY, knock, stop, damageTextClass);
    else damageBall(liveTarget.ref, dmg, fromX, fromY, knock, stop, damageTextClass);
    return liveTarget;
  }

  function reduceGrannyRushCooldown(seconds) {
    const skill = grannySkills.rush;
    const remaining = skill.cd - (state.gameTime - skill.last);
    if (remaining <= 0) return;
    skill.last -= seconds;
    if (state.granny?.node) floatText(state.granny.x + 2, state.granny.y - 52, 'R CD -0.5s', 'readyText', 700);
  }

  function reduceAngrySlipperCooldown() {
    if (!state.granny?.node || !isGrannyAwakened()) return;
    const before = grannySlipperCooldown();
    const nextReduction = Math.round(((state.granny.slipperCooldownReduction || 0) + ANGRY_SLIPPER_HIT_REDUCTION) * 100) / 100;
    state.granny.slipperCooldownReduction = Math.min(ANGRY_SLIPPER_MAX_REDUCTION, nextReduction);
    const after = grannySlipperCooldown();
    if (after < before) floatText(state.granny.x + 2, state.granny.y - 86, `Q CD ${after.toFixed(2)}s`, 'angrySpeedText', 800);
  }

  function trackAngrySlipperDamageGrowth() {
    if (!state.granny?.node || !isGrannyAwakened()) return;
    state.granny.slipperHitCount = (state.granny.slipperHitCount || 0) + 1;
    if (state.granny.slipperHitCount % 10 !== 0) return;
    state.granny.slipperDamageBonus = (state.granny.slipperDamageBonus || 0) + 1;
    floatText(state.granny.x + 2, state.granny.y - 104, `Q DMG +${state.granny.slipperDamageBonus}`, 'readyText', 900);
  }

  function healGrannyFromSlipperHit() {
    if (!state.granny?.node || !isGrannyAwakened()) return;
    const before = state.granny.hp;
    state.granny.heal(2);
    if (state.granny.hp > before) floatText(state.granny.x + 2, state.granny.y - 68, '+2 HP', 'healText', 800);
  }

  function reduceFarmerGolemCooldown(seconds) {
    const skill = whiteSkills.golem;
    const remaining = skill.cd - (state.gameTime - skill.last);
    if (remaining <= .05) return 0;
    const reduced = Math.min(seconds, remaining);
    skill.last -= reduced;
    return reduced;
  }

  function makeParticles(x, y, type, count = 14, baseAngle = Math.random() * Math.PI * 2) {
    for (let i = 0; i < count; i++) {
      const node = el(`particle ${type}`);
      const a = baseAngle + (Math.random() - .5) * 1.8;
      const speed = type === 'blood' ? 2.5 + Math.random() * 3.2 : 1.2 + Math.random() * 3.0;
      const life = .25 + Math.random() * .35;
      const obj = {
        x: x + (Math.random() - .5) * 20,
        y: y + (Math.random() - .5) * 20,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - (type === 'harvest' ? 1.2 : .3),
        life,
        maxLife: life,
        node,
        update(dt) {
          this.life -= dt;
          this.x += this.vx;
          this.y += this.vy;
          this.vy += type === 'blood' ? .18 : .12;
          this.node.style.left = `${this.x}px`;
          this.node.style.top = `${this.y}px`;
          this.node.style.opacity = `${Math.max(0, this.life / this.maxLife)}`;
        },
        remove() { this.node.remove(); }
      };
      node.style.left = `${obj.x}px`;
      node.style.top = `${obj.y}px`;
      node.style.opacity = '1';
      state.effects.push(obj);
    }
  }

  function makeRushParticles(granny) {
    if (!granny || !granny.node || state.gameTime < (granny.rushParticleNext || 0)) return;
    granny.rushParticleNext = state.gameTime + .055;
    const cx = granny.x + granny.radius;
    const cy = granny.y + granny.radius;
    for (let i = 0; i < 3; i++) {
      const node = el('particle rushBlack');
      const a = Math.random() * Math.PI * 2;
      const speed = .8 + Math.random() * 1.7;
      const life = .22 + Math.random() * .18;
      const size = 5 + Math.random() * 7;
      const obj = {
        x: cx + (Math.random() - .5) * 42,
        y: cy + (Math.random() - .5) * 42,
        vx: Math.cos(a) * speed - granny.vx * .25,
        vy: Math.sin(a) * speed - granny.vy * .25,
        life,
        maxLife: life,
        node,
        update(dt) {
          this.life -= dt;
          this.x += this.vx;
          this.y += this.vy;
          const p = Math.max(0, this.life / this.maxLife);
          this.node.style.left = `${this.x}px`;
          this.node.style.top = `${this.y}px`;
          this.node.style.opacity = `${p}`;
          this.node.style.transform = `scale(${.6 + p * .7})`;
        },
        remove() { this.node.remove(); }
      };
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      node.style.left = `${obj.x}px`;
      node.style.top = `${obj.y}px`;
      state.effects.push(obj);
    }
  }

  function makeChargeParticles(granny) {
    if (!granny || !granny.node) return;
    const cx = granny.x + granny.radius;
    const cy = granny.y + granny.radius;
    for (let i = 0; i < 4; i++) {
      const node = el('particle chargeBlack');
      const a = Math.random() * Math.PI * 2;
      const orbit = granny.radius + 12 + Math.random() * 16;
      const life = .28 + Math.random() * .2;
      const size = 6 + Math.random() * 8;
      const startX = cx + Math.cos(a) * orbit;
      const startY = cy + Math.sin(a) * orbit;
      const obj = {
        x: startX,
        y: startY,
        vx: (cx - startX) * .045,
        vy: (cy - startY) * .045,
        spin: Math.random() * 80,
        life,
        maxLife: life,
        node,
        update(dt) {
          this.life -= dt;
          this.x += this.vx;
          this.y += this.vy;
          this.spin += 10;
          const p = Math.max(0, this.life / this.maxLife);
          this.node.style.left = `${this.x}px`;
          this.node.style.top = `${this.y}px`;
          this.node.style.opacity = `${p}`;
          this.node.style.transform = `rotate(${this.spin}deg) scale(${.55 + p * .75})`;
        },
        remove() { this.node.remove(); }
      };
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      node.style.left = `${obj.x}px`;
      node.style.top = `${obj.y}px`;
      state.effects.push(obj);
    }
  }

  function makeSlipperImpactParticles(x, y) {
    for (let i = 0; i < 26; i++) {
      const node = el(`particle ${i % 3 === 0 ? 'rushBlack' : 'slipperDust'}`);
      const a = Math.random() * Math.PI * 2;
      const edge = 34 + Math.random() * 34;
      const speed = 1.8 + Math.random() * 3.6;
      const life = .32 + Math.random() * .28;
      const size = 6 + Math.random() * 9;
      const obj = {
        x: x + Math.cos(a) * edge,
        y: y - 6 + Math.sin(a) * edge * .55,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 1.3,
        life,
        maxLife: life,
        node,
        update(dt) {
          this.life -= dt;
          this.vx *= .97;
          this.vy = this.vy * .97 + .16;
          this.x += this.vx;
          this.y += this.vy;
          const p = Math.max(0, this.life / this.maxLife);
          this.node.style.left = `${this.x}px`;
          this.node.style.top = `${this.y}px`;
          this.node.style.opacity = `${p}`;
          this.node.style.transform = `scale(${.55 + p * .85})`;
        },
        remove() { this.node.remove(); }
      };
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      node.style.left = `${obj.x}px`;
      node.style.top = `${obj.y}px`;
      state.effects.push(obj);
    }
  }

  function makeStickAfterimage(x, y, angle) {
    const ghost = el('grannyRushAfterimage');
    const frame = document.createElement('img');
    frame.className = 'grannyRushStickFrame';
    frame.src = grannyRushStickSrc();
    frame.alt = '';
    frame.draggable = false;
    ghost.appendChild(frame);
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
    ghost.style.transform = `rotate(${angle}rad)`;
    startEffect(ghost, .18, function(dt) {
      this.life -= dt;
      const p = Math.max(0, this.life / this.maxLife);
      ghost.style.opacity = `${p * .45}`;
      ghost.style.transform = `rotate(${angle}rad) scale(${1 + (1 - p) * .04})`;
    });
  }

  function clearRushParticles() {
    for (const fx of [...state.effects]) {
      if (fx.node && fx.node.classList && fx.node.classList.contains('rushBlack')) removeFrom(state.effects, fx);
    }
  }

  function burstBall(ball) {
    const cx = ball.x + ball.radius;
    const cy = ball.y + ball.radius;
    const type = ball.kind === 'red' ? 'deathRed' : 'deathWhite';
    for (let i = 0; i < 34; i++) {
      const node = el(`particle ${type}`);
      const a = Math.random() * Math.PI * 2;
      const speed = 2.4 + Math.random() * 5.4;
      const life = .55 + Math.random() * .45;
      const size = 6 + Math.random() * 8;
      const obj = {
        x: cx + (Math.random() - .5) * 18,
        y: cy + (Math.random() - .5) * 18,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life,
        maxLife: life,
        node,
        update(dt) {
          this.life -= dt;
          this.vx *= .985;
          this.vy = this.vy * .985 + .18;
          this.x += this.vx;
          this.y += this.vy;
          const p = Math.max(0, this.life / this.maxLife);
          this.node.style.left = `${this.x}px`;
          this.node.style.top = `${this.y}px`;
          this.node.style.opacity = `${p}`;
          this.node.style.transform = `rotate(${(1 - p) * 540}deg) scale(${.75 + p * .55})`;
        },
        remove() { this.node.remove(); }
      };
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      node.style.left = `${obj.x}px`;
      node.style.top = `${obj.y}px`;
      state.effects.push(obj);
    }
  }

  function hurtVisual(target, fromX, fromY, radius = target.radius, particleCount = 14) {
    const cx = target.x + radius;
    const cy = target.y + radius;
    target.node.classList.remove('hurtFlash');
    void target.node.offsetWidth;
    target.node.classList.add('hurtFlash');
    setTimeout(() => target.node && target.node.classList.remove('hurtFlash'), 180);
    makeParticles(cx, cy, 'blood', particleCount, angleTo(fromX, fromY, cx, cy));
  }

  function hitStop(seconds) {
    state.hitStopUntil = Math.max(state.hitStopUntil, now() + seconds);
  }

  function applyDamageMotion(body, dmg, fromX, fromY, radius, knock, pushScale, stop, particleCount, damageTextClass = '') {
    const cx = body.x + radius;
    const cy = body.y + radius;
    const a = angleTo(fromX, fromY, cx, cy);
    if (typeof body.takeDamage === 'function') body.takeDamage(dmg);
    else body.hp -= dmg;
    body.vx += Math.cos(a) * knock;
    body.vy += Math.sin(a) * knock;
    body.x += Math.cos(a) * knock * pushScale;
    body.y += Math.sin(a) * knock * pushScale;
    hurtVisual(body, fromX, fromY, radius, particleCount);
    hitStop(stop);
    const shownDmg = Number.isInteger(dmg) ? String(dmg) : dmg.toFixed(1);
    floatText(body.x + 8, body.y - 14, `-${shownDmg}`, damageTextClass);
  }

  function damageBall(ball, dmg, fromX, fromY, knock = 5, stop = .18, damageTextClass = '') {
    if (state.over || !ball || !ball.node) return;
    if (isBallUntargetable(ball)) return;
    const reduced = ball.kind === 'granny' && isGrannyRushDefending(ball);
    const effectiveDmg = reduced ? dmg * .5 : dmg;
    applyDamageMotion(ball, effectiveDmg, fromX, fromY, ball.radius, 0, 0, stop, 14, damageTextClass);
    if (reduced) floatText(ball.x + 2, ball.y - 34, '50% DMG', 'angrySpeedText', 650);
    playSound('hit');
    if (ball.hp <= 0) handleBallDeath(ball);
  }

  function applyBleedToRed() {
    if (!state.red || !state.red.node) return;
    if (state.gameTime >= state.redBleedUntil) state.redBleedNextTick = state.gameTime + 1;
    state.redBleedUntil = Math.max(state.redBleedUntil, state.gameTime + RED_BLEED_DURATION);
    floatText(state.red.x + 6, state.red.y - 30, 'BLEED');
  }

  function updateBleed() {
    if (!state.red || !state.red.node) return;
    if (state.gameTime >= state.redBleedUntil) return;
    while (state.gameTime >= state.redBleedNextTick && state.redBleedNextTick <= state.redBleedUntil) {
      if (state.over || !state.red?.node) return;
      state.red.hp -= RED_BLEED_DPS;
      const source = state.white?.node ? state.white : state.red;
      hurtVisual(state.red, source.x + source.radius, source.y + source.radius, state.red.radius, 6);
      playSound('hit');
      floatText(state.red.x + 8, state.red.y - 14, `-${RED_BLEED_DPS}`);
      if (state.red.hp <= 0) {
        handleBallDeath(state.red);
        return;
      }
      state.redBleedNextTick += 1;
    }
  }

  function damageGolem(g, dmg, fromX, fromY, knock = 4.5, stop = .16, damageTextClass = '') {
    if (state.over) return;
    if (g.hp <= 0) return;
    const knockbackTaken = g.knockbackTaken ?? 1;
    applyDamageMotion(g, dmg, fromX, fromY, golemRadius(g), knock * knockbackTaken, .55, 0, 12, damageTextClass);
    g.knockbackUntil = Math.max(g.knockbackUntil || 0, state.gameTime + .35 * knockbackTaken);
    g.hpText.textContent = Math.max(0, Math.ceil(g.hp));
    playSound(g.hp <= 0 ? 'ironDie' : 'ironHurt');
    if (g.hp <= 0) removeFrom(state.golems, g);
  }

  function redTargets() {
    const list = [];
    if (state.white && state.white.node && !isBallUntargetable(state.white)) list.push({ type: 'white', ref: state.white, x: state.white.x + BALL_R, y: state.white.y + BALL_R, radius: BALL_R });
    if (state.granny && state.granny.node) list.push({ type: 'granny', ref: state.granny, x: state.granny.x + BALL_R, y: state.granny.y + BALL_R, radius: BALL_R });
    state.golems.forEach(g => {
      if (g.hp > 0) {
        const center = golemCenter(g);
        list.push({ type: 'golem', ref: g, x: center.x, y: center.y, radius: golemRadius(g) });
      }
    });
    return list;
  }

  function whiteOnlyTarget() {
    if (state.white && state.white.node && !isBallUntargetable(state.white)) return { type: 'white', ref: state.white, x: state.white.x + BALL_R, y: state.white.y + BALL_R, radius: BALL_R };
    if (state.granny && state.granny.node) return { type: 'granny', ref: state.granny, x: state.granny.x + BALL_R, y: state.granny.y + BALL_R, radius: BALL_R };
    return null;
  }

  function nearestRedTarget() {
    if (!state.red || !state.red.node) return null;
    const rx = state.red.x + BALL_R;
    const ry = state.red.y + BALL_R;
    return redTargets().reduce((best, cur) => {
      if (!best) return cur;
      return dist(rx, ry, cur.x, cur.y) < dist(rx, ry, best.x, best.y) ? cur : best;
    }, null);
  }

  function damageRedTarget(target, dmg, fromX, fromY, knock, stop) {
    if (state.over) return;
    if (!target) return;
    if (target.type === 'white') damageBall(target.ref, dmg, fromX, fromY, knock, stop);
    if (target.type === 'granny') damageBall(target.ref, dmg, fromX, fromY, knock, stop);
    if (target.type === 'golem' && target.ref.hp > 0) damageGolem(target.ref, dmg, fromX, fromY, knock, stop);
  }

  function canUse(skill) {
    return state.gameTime >= state.skillLockUntil && state.gameTime - skill.last >= skill.cd && !state.over;
  }

  function canUseGrannySkill(name, skill) {
    if (name === 'slipper' && isGrannyAwakened()) {
      return state.gameTime - skill.last >= skill.cd && !state.over;
    }
    return canUse(skill);
  }

  function canUseFarmerSkill(name, skill) {
    if (name === 'wheat' && isFarmerAwakened()) {
      return state.gameTime - skill.last >= skill.cd && !state.over;
    }
    return canUse(skill);
  }

  function lockSkills(name) {
    state.skillLockUntil = Math.max(state.skillLockUntil, state.gameTime + (SKILL_CAST_LOCK[name] || .25));
  }

  function startEffect(node, life, update) {
    const obj = { node, life, maxLife: life, update, remove() { this.node.remove(); } };
    state.effects.push(obj);
    return obj;
  }

  function redUse(name) {
    if (!state.red || !state.red.node) return false;
    const skill = redSkills[name];
    if (!canUse(skill)) return false;
    const target = name === 'hook' ? whiteOnlyTarget() : nearestRedTarget();
    if (!target) return false;
    skill.last = state.gameTime;
    lockSkills(name);

    const rx = state.red.x + BALL_R;
    const ry = state.red.y + BALL_R;
    const a = angleTo(rx, ry, target.x, target.y);

    if (name === 'sword') {
      playSound('sword');
      const node = el('swordCast');
      const swordFrame = document.createElement('img');
      swordFrame.className = 'swordFrame';
      swordFrame.src = redSwordSrc();
      swordFrame.addEventListener('error', () => {
        swordFrame.src = FALLBACK_RED_SWORD_SRC;
      }, { once: true });
      swordFrame.alt = '';
      swordFrame.draggable = false;
      node.appendChild(swordFrame);
      const hitTargets = new Set();
      startEffect(node, .45, function(dt) {
        this.life -= dt;
        const p = 1 - this.life / this.maxLife;
        const ballX = state.red.x + BALL_R;
        const ballY = state.red.y + BALL_R;
        const swordAngle = a - 1.25 + p * 2.5;
        const bladeDir = swordAngle + Math.atan2(-46, 34);
        const swordX = ballX + Math.cos(bladeDir) * (BALL_R + 1);
        const swordY = ballY + Math.sin(bladeDir) * (BALL_R + 1);
        const bladeA = rotatePointAround(swordX + 22, swordY - 13, swordX, swordY, swordAngle);
        const bladeB = rotatePointAround(swordX + 50, swordY - 46, swordX, swordY, swordAngle);
        node.style.left = `${swordX - 15}px`;
        node.style.top = `${swordY - 50}px`;
        node.style.transform = `rotate(${swordAngle}rad)`;
        node.style.opacity = '1';

        for (const cur of redTargets()) {
          if (hitTargets.has(cur.ref)) continue;
          if (circleHitsSegment(cur.x, cur.y, cur.radius, bladeA.x, bladeA.y, bladeB.x, bladeB.y, 7)) {
            hitTargets.add(cur.ref);
            damageRedTarget(cur, 16, swordX, swordY, 6.8, .22);
          }
        }
      });
    }

    if (name === 'hook') {
      playSound('fishing');
      const rod = el('rodCast');
      const rodFrame = document.createElement('img');
      rodFrame.className = 'rodFrame';
      rodFrame.src = redRodSrc();
      rodFrame.alt = '';
      rodFrame.draggable = false;
      rod.appendChild(rodFrame);
      const line = el('pullLine');
      const bobber = el('bobberCast');
      const bobberFrame = document.createElement('img');
      bobberFrame.className = 'bobberFrame';
      bobberFrame.src = redBobberSrc();
      bobberFrame.alt = '';
      bobberFrame.draggable = false;
      bobber.appendChild(bobberFrame);
      const castAngle = a;
      const castDistance = Math.min(arenaSize() * 1.25, dist(rx, ry, target.x, target.y) + 58);
      let hooked = false;
      const fx = {
        node: rod,
        life: .95,
        maxLife: .95,
        update(dt) {
          this.life -= dt;
          const p = 1 - this.life / this.maxLife;
          const cast = Math.min(1, p / .42);
          const pull = Math.max(0, (p - .42) / .58);
          const rcx = state.red.x + BALL_R;
          const rcy = state.red.y + BALL_R;
          const tx = target.ref.x + BALL_R;
          const ty = target.ref.y + BALL_R;
          let bx = rcx + Math.cos(castAngle) * castDistance * cast;
          let by = rcy + Math.sin(castAngle) * castDistance * cast;

          if (!hooked && dist(bx, by, tx, ty) <= BALL_R + 12) hooked = true;
          if (hooked) {
            bx = tx;
            by = ty;
          }

          rod.style.left = `${rcx - 8}px`;
          rod.style.top = `${rcy - 59}px`;
          rod.style.transform = `rotate(${castAngle + .75 + Math.sin(p * Math.PI * 3) * .10}rad)`;
          rod.style.opacity = `${1 - Math.max(0, p - .82) * 5}`;

          line.style.left = `${rcx}px`;
          line.style.top = `${rcy}px`;
          line.style.width = `${dist(rcx, rcy, bx, by)}px`;
          line.style.transform = `rotate(${angleTo(rcx, rcy, bx, by)}rad)`;
          line.style.opacity = `${1 - Math.max(0, p - .86) * 7}`;

          bobber.style.left = `${bx - 12}px`;
          bobber.style.top = `${by - 12}px`;
          bobber.style.transform = `rotate(${p * Math.PI * 8}rad)`;
          bobber.style.opacity = `${1 - Math.max(0, p - .86) * 7}`;

          if (hooked) {
            const dx = rcx - tx;
            const dy = rcy - ty;
            const d = Math.max(1, Math.hypot(dx, dy));
            target.ref.vx += dx / d * (.72 + pull * .95);
            target.ref.vy += dy / d * (.72 + pull * .95);
            target.ref.x += dx / d * (.85 + pull * 1.55);
            target.ref.y += dy / d * (.85 + pull * 1.55);
          }
        },
        remove() {
          rod.remove();
          line.remove();
          bobber.remove();
        }
      };
      state.effects.push(fx);
      fx.update(0);
    }

    if (name === 'bow') {
      playSound('bow');
      const node = el('bowPose');
      const bowFrame = document.createElement('img');
      bowFrame.className = 'bowFrame';
      bowFrame.src = redBowSrc();
      bowFrame.alt = '';
      bowFrame.draggable = false;
      node.appendChild(bowFrame);
      const obj = startEffect(node, .34, function(dt) {
        this.life -= dt;
        const p = 1 - this.life / this.maxLife;
        const rcx = state.red.x + BALL_R;
        const rcy = state.red.y + BALL_R;
        const liveTarget = target.type === 'golem' && target.ref.hp <= 0 ? nearestRedTarget() : target;
        if (!liveTarget) return;
        const liveCenter = targetCenter(liveTarget);
        if (!liveCenter) return;
        const tx = liveCenter.x;
        const ty = liveCenter.y;
        const aim = angleTo(rcx, rcy, tx, ty);
        node.style.left = `${rcx - 18 - Math.sin(p * Math.PI) * 8}px`;
        node.style.top = `${rcy - 43}px`;
        node.style.transform = `rotate(${aim - BOW_AIM_OFFSET}rad)`;
        node.style.opacity = `${1 - Math.max(0, p - .75) * 4}`;
        if (!this.fired && p >= .55) {
          shootProjectile(rcx, rcy, tx, ty, 18, 'red');
          this.fired = true;
        }
      });
      obj.fired = false;
    }

    if (name === 'turret') {
      const node = el('turret');
      const x = clamp(state.red.x + 10, 4, arenaSize() - 40);
      const y = clamp(state.red.y + 62, 4, arenaSize() - 40);
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      state.turrets.push({ x: x + 21, y: y + 21, node, born: state.gameTime, lastShot: state.gameTime - 2.8, life: 10 });
    }
    return true;
  }

  function whiteUse(name) {
    if (!state.white || !state.white.node) return false;
    const skill = whiteSkills[name];
    const awakenedWheat = name === 'wheat' && isFarmerAwakened();
    if (!canUseFarmerSkill(name, skill)) return false;
    if (name === 'golem' && state.energy < farmerGolemCost()) return false;
    skill.last = state.gameTime;
    if (!awakenedWheat) lockSkills(name);

    const w = state.white;
    const wx = w.x + BALL_R;
    const wy = w.y + BALL_R;
    const target = nearestEnemyBall(w);
    const rx = target ? target.x : wx + 1;
    const ry = target ? target.y : wy;
    const a = angleTo(wx, wy, rx, ry);

    if (name === 'fork') {
      playSound('sword');
      const node = el('pitchfork');
      const forkFrame = document.createElement('img');
      forkFrame.className = 'forkFrame';
      forkFrame.src = whiteForkSrc();
      forkFrame.alt = '';
      forkFrame.draggable = false;
      node.appendChild(forkFrame);
      startEffect(node, .24, function(dt) {
        this.life -= dt;
        const p = 1 - this.life / this.maxLife;
        const lunge = Math.sin(p * Math.PI) * 30;
        node.style.left = `${w.x + BALL_R - 52 + Math.cos(a) * lunge}px`;
        node.style.top = `${w.y + BALL_R - 78 + Math.sin(a) * lunge}px`;
        node.style.transform = `rotate(${a + 1.95}rad)`;
        node.style.opacity = `${1 - Math.max(0, p - .75) * 4}`;
      });
      if (target && dist(wx, wy, rx, ry) < 135) damageBall(target.ref, 10, wx, wy, 5.8, .18);
    }

    if (name === 'wheat') {
      playSound('planting');
      for (let i = 0; i < 4; i++) schedule(i * .5, () => plantWheat());
    }

    if (name === 'hoe') {
      playSound('sword');
      const node = el('hoeSwing');
      const hoeFrame = document.createElement('img');
      hoeFrame.className = 'hoeFrame';
      hoeFrame.src = whiteHoeSrc();
      hoeFrame.alt = '';
      hoeFrame.draggable = false;
      node.appendChild(hoeFrame);
      const hoeScale = isFarmerAwakened() ? 1.5 : 1;
      const originX = 12;
      const originY = 52;
      const headVectorAngle = Math.atan2(-40, 28);
      let bleedApplied = false;
      let wheatHarvestedBySwing = false;
      startEffect(node, .34, function(dt) {
        this.life -= dt;
        const p = 1 - this.life / this.maxLife;
        const hoeAngle = a - headVectorAngle + 1.15 - p * 2.3;
        const headDir = hoeAngle + headVectorAngle;
        const pivotX = state.white.x + BALL_R + Math.cos(headDir) * (BALL_R + 1);
        const pivotY = state.white.y + BALL_R + Math.sin(headDir) * (BALL_R + 1);
        const scaledPoint = (localX, localY) => localPointToWorld(
          pivotX,
          pivotY,
          originX,
          originY,
          originX + (localX - originX) * hoeScale,
          originY + (localY - originY) * hoeScale,
          hoeAngle
        );
        const headA = scaledPoint(20, 8);
        const headB = scaledPoint(52, 15);
        const handleA = scaledPoint(10, 58);
        const handleB = scaledPoint(43, 23);

        node.style.left = `${pivotX - originX}px`;
        node.style.top = `${pivotY - originY}px`;
        node.style.transform = `rotate(${hoeAngle}rad) scale(${hoeScale})`;
        node.style.opacity = `${1 - Math.max(0, p - .78) * 4}`;

        if (isFarmerAwakened() && !wheatHarvestedBySwing) {
          const harvestedBefore = state.wheats.length;
          harvestWheat(crop => {
            if (!crop.mature) return false;
            const center = wheatCenter(crop);
            return circleHitsSegment(center.x, center.y, 18, headA.x, headA.y, headB.x, headB.y, 14)
              || circleHitsSegment(center.x, center.y, 18, handleA.x, handleA.y, handleB.x, handleB.y, 8);
          });
          if (state.wheats.length < harvestedBefore) wheatHarvestedBySwing = true;
        }

        if (!bleedApplied) {
          const liveTarget = target && target.ref.node ? target : nearestEnemyBall(w);
          if (!liveTarget) return;
          const redX = liveTarget.ref.x + liveTarget.ref.radius;
          const redY = liveTarget.ref.y + liveTarget.ref.radius;
          const hit = circleHitsSegment(redX, redY, liveTarget.ref.radius, headA.x, headA.y, headB.x, headB.y, 10)
            || circleHitsSegment(redX, redY, liveTarget.ref.radius, handleA.x, handleA.y, handleB.x, handleB.y, 5);
          if (hit) {
            bleedApplied = true;
            if (liveTarget.ref === state.red) applyBleedToRed();
            else damageBall(liveTarget.ref, 8, wx, wy, 4.5, .16);
          }
        }
      });
    }

    if (name === 'golem') {
      const cost = farmerGolemCost();
      if (typeof state.white.spendWheat === 'function') {
        state.white.spendWheat(cost);
        state.energy = state.white.wheatEnergy;
      } else {
        state.energy -= cost;
      }
      spawnGolem();
    }
    return true;
  }

  function grannyUse(name) {
    const granny = state.granny;
    if (!granny || !granny.node || isStunned(granny)) return false;
    if (isGrannyRushing(granny) || isGrannyLocked(granny)) return false;
    const skill = grannySkills[name];
    const awakenedSlipper = name === 'slipper' && isGrannyAwakened();
    if (!canUseGrannySkill(name, skill)) return false;
    const target = nearestGrannyTarget();
    if (name !== 'soup' && !target) return false;

    skill.last = state.gameTime;
    if (!awakenedSlipper) lockSkills(name);
    const gc = ballCenter(granny);

    if (name === 'slipper') {
      playSound('sword');
      const shotCount = grannySlipperShotCount();
      for (let i = 0; i < shotCount; i++) {
        schedule(i * grannySlipperInterval(), () => {
          if (!granny.node) return;
          const liveTarget = nearestGrannyTarget();
          if (!liveTarget) return;
          const start = ballCenter(granny);
          shootProjectile(start.x, start.y, liveTarget.x, liveTarget.y, grannySlipperDamage(), 'granny', {
            className: 'slipperProjectile',
            text: '🩴',
            speed: grannySlipperSpeed(),
            offset: 21,
            angleOffset: 0,
            hitPadding: 5
          });
        });
      }
    }

    if (name === 'soup') {
      playSound('grannyDrink');
      granny.heal(5);
      granny.addShield(5);
      const aura = el('soupAura');
      startEffect(aura, .42, function(dt) {
        this.life -= dt;
        const p = 1 - this.life / this.maxLife;
        aura.style.left = `${granny.x + BALL_R - 39}px`;
        aura.style.top = `${granny.y + BALL_R - 39}px`;
        aura.style.opacity = `${1 - p}`;
        aura.style.transform = `scale(${.75 + p * .65})`;
      });
    }

    if (name === 'trap') {
      playSound('grannyTrap');
      const angle = target ? angleTo(gc.x, gc.y, target.x, target.y) : Math.random() * Math.PI * 2;
      const x = clamp(gc.x + Math.cos(angle) * 46, 18, arenaSize() - 18);
      const y = clamp(gc.y + Math.sin(angle) * 46, 18, arenaSize() - 18);
      const node = el('mouseTrap');
      const trapFrame = document.createElement('img');
      trapFrame.className = 'mouseTrapFrame';
      trapFrame.src = grannyTrapSrc();
      trapFrame.alt = '';
      trapFrame.draggable = false;
      node.appendChild(trapFrame);
      node.style.left = `${x - 17}px`;
      node.style.top = `${y - 17}px`;
      state.traps.push({ x, y, node, born: state.gameTime, armedAt: state.gameTime + .25, life: 14 });
    }

    if (name === 'rush') {
      if (isGrannyAwakened()) {
        granny.heal(30);
        spawnGrannyRushClone(granny, target);
        return true;
      }
      playLoopSound('grannyRush');
      granny.rushUntil = state.gameTime + 2;
      granny.rushTriggered = false;
      granny.rushChargeUntil = 0;
      granny.rushSwingUntil = 0;
      granny.rushParticleNext = state.gameTime;
      const angle = target ? angleTo(gc.x, gc.y, target.x, target.y) : Math.random() * Math.PI * 2;
      granny.vx += Math.cos(angle) * GRANNY_RUSH_IMPULSE;
      granny.vy += Math.sin(angle) * GRANNY_RUSH_IMPULSE;
    }
    return true;
  }

  function spawnGrannyRushClone(granny, target) {
    if (!granny || !granny.node || !target) return null;
    playLoopSound('grannyRush');
    const gc = ballCenter(granny);
    const angle = angleTo(gc.x, gc.y, target.x, target.y);
    const node = el('grannyRushClone');
    const frame = document.createElement('img');
    frame.className = 'grannyRushCloneFrame';
    frame.src = grannyRushIconSrc();
    frame.alt = '';
    frame.draggable = false;
    node.appendChild(frame);

    const clone = {
      kind: 'grannyClone',
      isRushClone: true,
      x: clamp(granny.x, 0, arenaSize() - granny.radius * 2),
      y: clamp(granny.y, 0, arenaSize() - granny.radius * 2),
      vx: Math.cos(angle) * GRANNY_RUSH_CLONE_SPEED,
      vy: Math.sin(angle) * GRANNY_RUSH_CLONE_SPEED,
      radius: granny.radius,
      node,
      rushUntil: state.gameTime + 2,
      rushTriggered: false,
      rushChargeUntil: 0,
      rushSwingUntil: 0,
      rushParticleNext: state.gameTime
    };

    node.style.left = '0px';
    node.style.top = '0px';
    node.style.transform = `translate(${clone.x}px, ${clone.y}px)`;
    state.rushClones.push(clone);
    return clone;
  }

  function removeGrannyRushClone(clone) {
    if (!clone) return;
    removeFrom(state.rushClones, clone);
    if (!isGrannyRushing(state.granny) && !isGrannyCharging(state.granny) && !state.rushClones.some(c => isGrannyRushing(c) || isGrannyCharging(c))) {
      stopSound('grannyRush');
    }
  }

  function triggerGrannyRushCollision(a, b) {
    const granny = a === state.granny ? a : b === state.granny ? b : null;
    if (!granny || !granny.node || granny.rushTriggered || isStunned(granny) || isGrannyLocked(granny)) return;
    if (state.gameTime >= (granny.rushUntil || 0)) return;
    const target = granny === a ? b : a;
    if (!target || !target.node) return;
    if (isBallUntargetable(target)) return;
    startGrannyRushCharge(granny, {
      type: target.kind,
      ref: target,
      x: target.x + target.radius,
      y: target.y + target.radius,
      radius: target.radius
    });
  }

  function triggerGrannyRushGolemCollision(g) {
    const granny = state.granny;
    if (!granny || !granny.node || granny.rushTriggered || isStunned(granny) || isGrannyLocked(granny)) return false;
    if (state.gameTime >= (granny.rushUntil || 0)) return false;
    if (!g || !g.node || g.hp <= 0) return false;
    const center = golemCenter(g);
    startGrannyRushCharge(granny, { type: 'golem', ref: g, x: center.x, y: center.y, radius: golemRadius(g) });
    return true;
  }

  function startGrannyRushCharge(granny, target) {
    const perfectBonk = hasTrapCombo(target);
    const chargeTime = perfectBonk ? .4 : .8;
    if (perfectBonk) clearTrapCombo(target);
    granny.rushTriggered = true;
    granny.rushUntil = 0;
    granny.rushChargeUntil = state.gameTime + chargeTime;
    granny.rushSwingUntil = 0;
    granny.vx = 0;
    granny.vy = 0;
    clearRushParticles();

    const gc = ballCenter(granny);
    const tc = targetCenter(target) || { x: target.x, y: target.y };
    const swingAngle = angleTo(gc.x, gc.y, tc.x, tc.y);
    const charge = el('grannyChargeAura');
    charge.style.left = `${granny.x + BALL_R - 47}px`;
    charge.style.top = `${granny.y + BALL_R - 47}px`;
    charge.style.opacity = '0';
    startEffect(charge, chargeTime, function(dt) {
      this.life -= dt;
      const p = 1 - this.life / this.maxLife;
      charge.style.left = `${granny.x + BALL_R - 47}px`;
      charge.style.top = `${granny.y + BALL_R - 47}px`;
      charge.style.opacity = `${1 - p * .35}`;
      charge.style.transform = `rotate(${p * 480}deg) scale(${.72 + p * .42})`;
      if (state.gameTime >= (this.nextParticleAt || 0)) {
        this.nextParticleAt = state.gameTime + .06;
        makeChargeParticles(granny);
      }
    });
    schedule(chargeTime, () => finishGrannyRushSwing(granny, target, swingAngle));
  }

  function finishGrannyRushSwing(granny, originalTarget, swingAngle) {
    if (state.over || !granny || !granny.node) return;
    stopSound('grannyRush');
    playSound('grannyRiser');
    granny.rushChargeUntil = 0;
    granny.rushSwingUntil = state.gameTime + 1;
    const node = el('grannyRushSwing');
    const stickFrame = document.createElement('img');
    stickFrame.className = 'grannyRushStickFrame';
    stickFrame.src = grannyRushStickSrc();
    stickFrame.alt = '';
    stickFrame.draggable = false;
    node.appendChild(stickFrame);
    node.style.left = `${granny.x + granny.radius - 22}px`;
    node.style.top = `${granny.y + granny.radius - 88}px`;
    node.style.opacity = '0';
    const hitTargets = new Set();
    let slipperDropped = false;
    const stickOrigin = { x: 22, y: 88 };
    const stickHitStart = { x: 36, y: 77 };
    const stickHitEnd = { x: 148, y: 16 };
    const stickBaseDir = Math.atan2(stickHitEnd.y - stickOrigin.y, stickHitEnd.x - stickOrigin.x);
    const swingFx = startEffect(node, 1, function(dt) {
      this.life -= dt;
      const p = 1 - this.life / this.maxLife;
      const angle = swingAngle - 1.25 + p * 2.5;
      const ballX = granny.x + granny.radius;
      const ballY = granny.y + granny.radius;
      const swingDir = angle + stickBaseDir;
      const pivotX = ballX + Math.cos(swingDir) * (granny.radius + 2);
      const pivotY = ballY + Math.sin(swingDir) * (granny.radius + 2);
      const nodeX = pivotX - stickOrigin.x;
      const nodeY = pivotY - stickOrigin.y;
      const hitStart = rotatePointAround(nodeX + stickHitStart.x, nodeY + stickHitStart.y, pivotX, pivotY, angle);
      const hitEnd = rotatePointAround(nodeX + stickHitEnd.x, nodeY + stickHitEnd.y, pivotX, pivotY, angle);
      node.style.left = `${nodeX}px`;
      node.style.top = `${nodeY}px`;
      node.style.transform = `rotate(${angle}rad)`;
      node.style.opacity = '1';
      if (state.gameTime >= (this.nextAfterimageAt || 0)) {
        this.nextAfterimageAt = state.gameTime + .075;
        makeStickAfterimage(nodeX, nodeY, angle);
      }

      for (const target of grannyTargets()) {
        const liveTarget = refreshTarget(target);
        if (!liveTarget || hitTargets.has(liveTarget.ref)) continue;
        const tc = targetCenter(liveTarget);
        if (!tc) continue;
        const hit = circleHitsSegment(tc.x, tc.y, liveTarget.radius, hitStart.x, hitStart.y, hitEnd.x, hitEnd.y, 18);
        if (!hit) continue;
        hitTargets.add(liveTarget.ref);
        const labelX = liveTarget.type === 'golem' ? liveTarget.ref.x : liveTarget.ref.x - 4;
        const labelY = liveTarget.type === 'golem' ? liveTarget.ref.y : liveTarget.ref.y - 42;
        floatText(labelX, labelY, 'RUSH HIT!', 'readyText', 900);
        damageGrannyTarget(liveTarget, 15, ballX, ballY, 12, .25, 'stickDamageText');
        if (!slipperDropped) {
          slipperDropped = true;
          dropGiantSlipperShadow(tc.x, tc.y, liveTarget);
        }
      }
    });
    const removeSwing = swingFx.remove.bind(swingFx);
    swingFx.remove = function() {
      removeSwing();
      stopSound('grannyRiser');
      if (granny.isRushClone) removeGrannyRushClone(granny);
    };
  }

  function dropGiantSlipperShadow(x, y, target) {
    const shadow = el('fallingSlipperShadow');
    shadow.style.left = `${x - 42}px`;
    shadow.style.top = `${y + 24}px`;
    shadow.style.opacity = '0';
    startEffect(shadow, .38, function(dt) {
      this.life -= dt;
      const p = 1 - this.life / this.maxLife;
      shadow.style.left = `${x - 42}px`;
      shadow.style.top = `${y + 24}px`;
      shadow.style.opacity = `${.2 + p * .52}`;
      shadow.style.transform = `scale(${.55 + p * .65})`;
    });
    schedule(.32, () => dropGiantSlipper(x, y, target));
  }

  function dropGiantSlipper(x, y, target) {
    const node = el('fallingSlipper', '🩴');
    const fallTime = .18;
    const holdTime = .7;
    const totalLife = fallTime + holdTime;
    node.style.left = `${x - 56}px`;
    node.style.top = `${y - 172}px`;
    node.style.opacity = '1';
    let struck = false;
    startEffect(node, totalLife, function(dt) {
      this.life -= dt;
      const elapsed = this.maxLife - this.life;
      const fallP = Math.min(1, elapsed / fallTime);
      const eased = 1 - Math.pow(1 - fallP, 3);
      node.style.left = `${x - 56}px`;
      node.style.top = `${y - 172 + eased * 132}px`;
      node.style.opacity = '1';
      node.style.transform = `rotate(${-.35 + fallP * .7}rad) scale(${1 + Math.sin(fallP * Math.PI) * .08})`;

      if (!struck && fallP >= 1) {
        struck = true;
        playSound('grannyBoom');
        makeSlipperImpactParticles(x, y);
        const liveTarget = refreshTarget(target);
        if (liveTarget) {
          const tc = targetCenter(liveTarget);
          if (tc && dist(x, y, tc.x, tc.y) <= liveTarget.radius + 52) damageGrannyTarget(liveTarget, 15, x, y, 11, .24, 'giantSlipperDamageText');
        }
      }
    });
  }

  function schedule(delay, fn) {
    state.effects.push({
      life: delay,
      update(dt) { this.life -= dt; },
      remove() { fn(); }
    });
  }

  function plantWheat() {
    const w = state.white;
    if (!w || !w.node) return;
    const x = clamp(w.x + BALL_R + Math.random() * 130 - 65, 6, arenaSize() - 42);
    const y = clamp(w.y + BALL_R + Math.random() * 130 - 65, 6, arenaSize() - 42);
    const node = el('wheat seed');
    const frame = document.createElement('img');
    frame.className = 'wheatFrame';
    frame.src = WHITE_WHEAT_SEED_SRC;
    frame.alt = '';
    frame.draggable = false;
    node.appendChild(frame);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    const crop = { x, y, node, frame, mature: false, matureAt: state.gameTime + farmerWheatMatureTime() };
    const center = wheatCenter(crop);
    makeParticles(center.x, center.y, 'farm', 12);
    state.wheats.push(crop);
  }

  function harvestWheat(hitTest) {
    let count = 0;
    for (const crop of [...state.wheats]) {
      if (crop.mature && hitTest(crop)) {
        const center = wheatCenter(crop);
        makeParticles(center.x, center.y, 'harvest', 18);
        crop.node.remove();
        state.wheats = state.wheats.filter(c => c !== crop);
        count++;
      }
    }
    if (count > 0) {
      if (!state.white || !state.white.node) return;
      playSound('grass');
      const beforeEnergy = state.energy;
      const healAmount = count * farmerWheatHeal();
      state.white.hp = isFarmerAwakened() ? state.white.hp + healAmount : Math.min(state.white.maxHp, state.white.hp + healAmount);
      if (typeof state.white.addWheat === 'function') {
        const wheatResult = state.white.addWheat(count);
        state.energy = wheatResult.current;
      } else {
        state.energy = Math.min(10, state.energy + count);
      }
      const golemCdReduced = reduceFarmerGolemCooldown(count);
      updateSuperGolemProgress(count);
      updateFarmerWheatCooldownProgress(count);
      updateFarmerGolemHpProgress(count);
      for (let i = 0; i < count; i++) {
        const cost = farmerGolemCost();
        const shownEnergy = Math.min(cost, beforeEnergy + i + 1);
        farmerFloat(`🌾 ${shownEnergy}/${cost}`, 'wheatFloat', i * 16);
      }
      if (golemCdReduced > 0) farmerFloat(`Golem CD -${golemCdReduced.toFixed(golemCdReduced % 1 ? 1 : 0)}s`, 'readyText', count * 16 + 2);
      if (beforeEnergy < farmerGolemCost() && state.energy >= farmerGolemCost()) farmerFloat('IRON GOLEM READY!', 'readyText', count * 16 + 2);
    }
  }

  function updateFarmerGolemHpProgress(count) {
    if (count <= 0) return;
    state.farmerGolemHpHarvested += count;
    let stacks = 0;
    while (state.farmerGolemHpHarvested >= FARMER_GOLEM_HP_STEP) {
      state.farmerGolemHpHarvested -= FARMER_GOLEM_HP_STEP;
      state.farmerGolemHpBonus += FARMER_GOLEM_HP_BONUS;
      stacks++;
    }
    if (stacks <= 0) return;

    const bonus = stacks * FARMER_GOLEM_HP_BONUS;
    for (const golem of state.golems) {
      if (!golem || !golem.node || golem.hp <= 0 || golem.superGolem) continue;
      golem.hp += bonus;
      if (golem.hpText) golem.hpText.textContent = Math.max(0, Math.ceil(golem.hp));
      floatText(golem.x - 4, golem.y - 26, `+${bonus} HP`, 'healText', 800);
    }
    farmerFloat(`Golem HP +${bonus}`, 'readyText', 34);
  }

  function updateSuperGolemProgress(count) {
    if (!isFarmerAwakened() || count <= 0) return;
    state.lastHarvestWheatEaten += count;
    while (state.lastHarvestWheatEaten >= SUPER_GOLEM_WHEAT_GOAL) {
      state.lastHarvestWheatEaten -= SUPER_GOLEM_WHEAT_GOAL;
      spawnSuperGolem();
    }
  }

  function updateFarmerWheatCooldownProgress(count) {
    if (!isFarmerAwakened() || count <= 0) return;
    const before = farmerWheatCooldown();
    state.lastHarvestWheatForCooldown += count;
    while (state.lastHarvestWheatForCooldown >= FARMER_WHEAT_CD_STEP) {
      state.lastHarvestWheatForCooldown -= FARMER_WHEAT_CD_STEP;
      state.farmerWheatCooldownReduction += FARMER_WHEAT_CD_REDUCTION;
    }
    const after = farmerWheatCooldown();
    whiteSkills.wheat.cd = after;
    if (after < before) farmerFloat(`W CD ${after.toFixed(2)}s`, 'readyText', count * 16 + 18);
  }

  function collectTouchedWheat() {
    if (!state.white || !state.white.node) return;
    const wx = state.white.x + BALL_R;
    const wy = state.white.y + BALL_R;
    harvestWheat(crop => {
      const center = wheatCenter(crop);
      return dist(wx, wy, center.x, center.y) <= BALL_R + 22;
    });
  }

  function nearestMatureWheat(x, y) {
    return state.wheats.reduce((best, crop) => {
      if (!crop.mature) return best;
      if (!best) return crop;
      const cropCenter = wheatCenter(crop);
      const bestCenter = wheatCenter(best);
      return dist(x, y, cropCenter.x, cropCenter.y) < dist(x, y, bestCenter.x, bestCenter.y) ? crop : best;
    }, null);
  }

  function spawnGolem(options = {}) {
    if (!state.white || !state.white.node) return;
    const stats = options.stats || farmerGolemStats();
    const radius = options.radius || GOLEM_R;
    const size = radius * 2;
    const node = el('golem');
    if (stats.upgraded) node.classList.add('lastHarvestGolem');
    if (options.superGolem) node.classList.add('superGolem');
    if (DEBUG_GOLEM_HITBOX) node.classList.add('debugHitbox');
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    const frame = document.createElement('img');
    frame.className = 'golemFrame';
    frame.src = whiteGolemSrc();
    frame.alt = '';
    frame.draggable = false;
    node.appendChild(frame);
    const hpText = document.createElement('div');
    hpText.className = 'golemHp';
    hpText.textContent = String(stats.hp);
    node.appendChild(hpText);
    const x = clamp(state.white.x + 18, 4, arenaSize() - size);
    const y = clamp(state.white.y - 62, 4, arenaSize() - size);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    state.golems.push({
      x, y,
      vx: 0,
      vy: 0,
      hp: stats.hp,
      node,
      frame,
      hpText,
      born: state.gameTime,
      life: stats.life,
      radius,
      attackDamage: options.attackDamage || 16,
      lastPunch: -999,
      knockbackUntil: 0,
      knockbackTaken: options.knockbackTaken ?? (stats.upgraded ? .1 : 1),
      upgraded: stats.upgraded,
      superGolem: Boolean(options.superGolem),
      smokeNext: state.gameTime,
      auraNext: state.gameTime
    });
    floatText(x - 44, y - 22, options.label || (stats.upgraded ? 'LAST HARVEST GOLEM' : 'IRON GOLEM SUMMONED'), 'readyText');
  }

  function spawnSuperGolem() {
    spawnGolem({
      stats: { hp: SUPER_GOLEM_HP, life: farmerGolemStats().life, upgraded: true },
      radius: GOLEM_R * SUPER_GOLEM_SCALE,
      attackDamage: SUPER_GOLEM_DAMAGE,
      superGolem: true,
      label: 'SUPER GOLEM!'
    });
  }

  function separateGolemFromTarget(g, target) {
    if (!target || !target.node) return false;
    const radius = golemRadius(g);
    let gx = g.x + radius;
    let gy = g.y + radius;
    let rx = target.x + target.radius;
    let ry = target.y + target.radius;
    const minDist = radius + target.radius;
    let d = dist(gx, gy, rx, ry);
    if (d >= minDist) return false;

    let nx;
    let ny;
    if (d < .001) {
      const a = Math.atan2(target.vy || 1, target.vx || 0);
      nx = Math.cos(a);
      ny = Math.sin(a);
      d = .001;
    } else {
      nx = (rx - gx) / d;
      ny = (ry - gy) / d;
    }

    const overlap = minDist - d;
    const targetAnchored = Boolean(target.kind);
    if (targetAnchored) {
      g.x = clamp(g.x - nx * (overlap + 2), 0, arenaSize() - radius * 2);
      g.y = clamp(g.y - ny * (overlap + 2), 0, arenaSize() - radius * 2);
    } else {
      target.x = clamp(target.x + nx * (overlap + 2), 0, arenaSize() - target.radius * 2);
      target.y = clamp(target.y + ny * (overlap + 2), 0, arenaSize() - target.radius * 2);
      g.x = clamp(g.x - nx * overlap * .25, 0, arenaSize() - radius * 2);
      g.y = clamp(g.y - ny * overlap * .25, 0, arenaSize() - radius * 2);
      target.vx += nx * 2.8;
      target.vy += ny * 2.8;
    }

    gx = g.x + radius;
    gy = g.y + radius;
    rx = target.x + target.radius;
    ry = target.y + target.radius;
    d = Math.max(.001, dist(gx, gy, rx, ry));
    if (d < minDist) {
      const remain = minDist - d;
      g.x = clamp(g.x - nx * remain, 0, arenaSize() - radius * 2);
      g.y = clamp(g.y - ny * remain, 0, arenaSize() - radius * 2);
    }
    return true;
  }

  function shootProjectile(x1, y1, x2, y2, dmg, owner, options = {}) {
    const a = angleTo(x1, y1, x2, y2);
    const node = el(`projectile ${options.className || ''}`.trim(), options.text || '');
    const offset = options.offset ?? 21;
    node.style.left = `${x1 - offset}px`;
    node.style.top = `${y1 - offset}px`;
    node.style.transform = `rotate(${a + (options.angleOffset ?? Math.PI / 4)}rad)`;
    const speed = options.speed ?? 6.9;
    const projectile = new Projectile({ x: x1, y: y1, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, owner, node, life: options.life ?? 3, angle: a });
    projectile.offset = offset;
    projectile.angleOffset = options.angleOffset ?? Math.PI / 4;
    projectile.hitPadding = options.hitPadding ?? 0;
    state.projectiles.push(projectile);
  }

  function updateProjectiles(dt) {
    for (const p of [...state.projectiles]) {
      p.update(dt);
      const offset = p.offset ?? 21;
      p.node.style.left = `${p.x - offset}px`;
      p.node.style.top = `${p.y - offset}px`;
      p.node.style.transform = `rotate(${p.angle + (p.angleOffset ?? Math.PI / 4)}rad)`;

      if (p.owner === 'red') {
        for (const target of redTargets()) {
          if (dist(p.x, p.y, target.x, target.y) < target.radius) {
            damageRedTarget(target, p.dmg, p.x - p.vx * 2, p.y - p.vy * 2, p.dmg >= 18 ? 6.2 : 4.8, .20);
            p.life = 0;
            break;
          }
        }
      }
      if (p.owner === 'granny' && state.granny?.node) {
        for (const target of grannyTargets()) {
          if (dist(p.x, p.y, target.x, target.y) < target.radius + (p.hitPadding || 0)) {
            const hitTarget = damageGrannyTarget(target, p.dmg, p.x - p.vx * 2, p.y - p.vy * 2, p.dmg >= 30 ? 9 : 3.5, p.dmg >= 30 ? .24 : .12);
            if (hitTarget && p.node.classList.contains('slipperProjectile')) {
              if (hasTrapCombo(hitTarget)) {
                const pos = targetFloatPos(hitTarget);
                damageGrannyTarget(hitTarget, 5, p.x, p.y, 2.8, .08);
                clearTrapCombo(hitTarget);
                floatText(pos.x, pos.y - 18, 'TRAP COMBO!', 'readyText', 900);
              }
              if (isGrannyAwakened()) {
                reduceGrannyRushCooldown(.5);
                reduceAngrySlipperCooldown();
                trackAngrySlipperDamageGrowth();
                healGrannyFromSlipperHit();
              }
            }
            p.life = 0;
            break;
          }
        }
      }

      if (p.x < -60 || p.y < -60 || p.x > arenaSize() + 60 || p.y > arenaSize() + 60) p.life = 0;
      if (p.life <= 0) removeFrom(state.projectiles, p);
    }
  }

  function updateTurrets() {
    for (const t of [...state.turrets]) {
      if (state.gameTime - t.born > t.life) { removeFrom(state.turrets, t); continue; }
      if (state.gameTime - t.lastShot >= 3) {
        const target = nearestRedTarget();
        if (target) shootProjectile(t.x, t.y, target.x, target.y, 10, 'red');
        t.lastShot = state.gameTime;
      }
    }
  }

  function updateWheat() {
    for (const crop of state.wheats) {
      if (!crop.mature && state.gameTime >= crop.matureAt) {
        crop.mature = true;
        crop.node.className = 'wheat mature';
        crop.frame.src = whiteWheatMatureSrc();
        const center = wheatCenter(crop);
        makeParticles(center.x, center.y, 'farm', 12);
      }
    }
    collectTouchedWheat();
  }

  function updateTraps() {
    if (!state.granny || !state.granny.node) return;
    for (const trap of [...state.traps]) {
      if (state.gameTime - trap.born > trap.life) {
        removeFrom(state.traps, trap);
        continue;
      }
      if (state.gameTime < trap.armedAt) continue;
      for (const target of grannyTargets()) {
        if (dist(trap.x, trap.y, target.x, target.y) <= target.radius + 14) {
          playSound('grannyTrap');
          makeParticles(trap.x, trap.y, 'blood', 10);
          const trappedTarget = damageGrannyTarget(target, 10, trap.x, trap.y, 4.8, .18);
          markTrapCombo(trappedTarget);
          if (target.type === 'golem') target.ref.knockbackUntil = Math.max(target.ref.knockbackUntil || 0, state.gameTime + 2 * (target.ref.knockbackTaken ?? 1));
          else applyStun(target.ref, 2);
          removeFrom(state.traps, trap);
          break;
        }
      }
    }
  }

  function updateGrannyRushParticles() {
    if (isGrannyRushing(state.granny)) {
      makeRushParticles(state.granny);
    }
    for (const clone of state.rushClones) {
      if (isGrannyRushing(clone)) makeRushParticles(clone);
    }
    const cloneActive = state.rushClones.some(clone => isGrannyRushing(clone) || isGrannyCharging(clone));
    if (!isGrannyRushing(state.granny) && !isGrannyCharging(state.granny) && !cloneActive) {
      stopSound('grannyRush');
    }
  }

  function updateGrannyRushClones() {
    for (const clone of [...state.rushClones]) {
      if (!clone.node || !state.granny?.node || state.over) {
        removeGrannyRushClone(clone);
        continue;
      }

      if (isGrannyCharging(clone) || isGrannySwinging(clone)) {
        clone.node.classList.toggle('rushCharge', isGrannyCharging(clone));
        continue;
      }

      if (clone.rushTriggered || state.gameTime >= (clone.rushUntil || 0)) {
        removeGrannyRushClone(clone);
        continue;
      }

      const target = nearestGrannyTargetFrom(clone);
      if (target) {
        const cc = ballCenter(clone);
        const a = angleTo(cc.x, cc.y, target.x, target.y);
        clone.vx += Math.cos(a) * .18;
        clone.vy += Math.sin(a) * .18;
      }

      normalizeSpeed(clone, GRANNY_RUSH_MIN_SPEED, GRANNY_RUSH_MAX_SPEED);
      clone.x += clone.vx;
      clone.y += clone.vy;
      bounceBody(clone, clone.radius);
      clone.node.style.transform = `translate(${clone.x}px, ${clone.y}px)`;
      clone.node.classList.toggle('rushCharge', false);

      const cc = ballCenter(clone);
      for (const liveTarget of grannyTargets()) {
        const targetCenterPoint = targetCenter(liveTarget);
        if (!targetCenterPoint) continue;
        if (dist(cc.x, cc.y, targetCenterPoint.x, targetCenterPoint.y) <= clone.radius + liveTarget.radius + 2) {
          startGrannyRushCharge(clone, liveTarget);
          break;
        }
      }
    }
  }

  function updateGolems() {
    const targetBall = state.red?.node ? state.red : nearestEnemyBall(state.white)?.ref;
    if (!targetBall || !targetBall.node) return;
    for (const g of [...state.golems]) {
      if (g.hp <= 0 || state.gameTime - g.born > g.life) { removeFrom(state.golems, g); continue; }
      const radius = golemRadius(g);
      if (g.upgraded && state.gameTime >= (g.smokeNext || 0)) {
        g.smokeNext = state.gameTime + .18;
        makeParticles(g.x + radius, g.y + Math.max(10, radius * .35), g.superGolem ? 'superAura' : 'golemSmoke', g.superGolem ? 3 : 2, -Math.PI / 2);
      }
      const center = golemCenter(g);
      const gx = center.x, gy = center.y;
      const rx = targetBall.x + targetBall.radius, ry = targetBall.y + targetBall.radius;
      const a = angleTo(gx, gy, rx, ry);
      const knockedBack = state.gameTime < (g.knockbackUntil || 0);
      if (!knockedBack) {
        g.vx += Math.cos(a) * .08;
        g.vy += Math.sin(a) * .08;
      }
      g.vx *= knockedBack ? .97 : .94;
      g.vy *= knockedBack ? .97 : .94;
      g.x += g.vx; g.y += g.vy;
      g.x = clamp(g.x, 0, arenaSize() - radius * 2);
      g.y = clamp(g.y, 0, arenaSize() - radius * 2);
      const collided = separateGolemFromTarget(g, targetBall);
      g.node.style.left = `${g.x}px`;
      g.node.style.top = `${g.y}px`;
      const newCenter = golemCenter(g);
      const newGx = newCenter.x;
      const newGy = newCenter.y;
      const newRx = targetBall.x + targetBall.radius;
      const newRy = targetBall.y + targetBall.radius;
      const touchingTarget = collided || dist(newGx, newGy, newRx, newRy) <= radius + targetBall.radius + GOLEM_ATTACK_PADDING;
      if (targetBall === state.granny && touchingTarget && triggerGrannyRushGolemCollision(g)) continue;
      if (touchingTarget && state.gameTime - g.lastPunch > GOLEM_ATTACK_COOLDOWN) {
        damageBall(targetBall, g.attackDamage || 16, newGx, newGy, 15.5, 0);
        floatText(targetBall.x + 4, targetBall.y - 24, 'SMASH!');
        g.lastPunch = state.gameTime;
      }
    }
  }

  function removeFrom(arr, obj) {
    if (typeof obj.remove === 'function') obj.remove();
    else if (obj.node) obj.node.remove();
    const i = arr.indexOf(obj);
    if (i >= 0) arr.splice(i, 1);
  }

  function updateEffects(dt) {
    effectManager.update(dt);
  }

  function clearCombatEffectsForResult() {
    for (const fx of [...state.effects]) {
      const isParticle = fx.node && fx.node.classList && fx.node.classList.contains('particle');
      if (isParticle) continue;
      if (typeof fx.remove === 'function' && fx.node) fx.remove();
      const i = state.effects.indexOf(fx);
      if (i >= 0) state.effects.splice(i, 1);
    }
  }

  function collidePair(a, b) {
    if (!a || !b) return;
    if (!a.node || !b.node) return;
    const ax = a.x + BALL_R, ay = a.y + BALL_R;
    const bx = b.x + BALL_R, by = b.y + BALL_R;
    const d = Math.max(.01, dist(ax, ay, bx, by));
    if (d < BALL_R * 2) {
      const nx = (bx - ax) / d, ny = (by - ay) / d;
      const overlap = BALL_R * 2 - d;
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2; b.y += ny * overlap / 2;
      const av = a.vx * nx + a.vy * ny;
      const bv = b.vx * nx + b.vy * ny;
      a.vx += (bv - av) * nx * .45; a.vy += (bv - av) * ny * .45;
      b.vx += (av - bv) * nx * .45; b.vy += (av - bv) * ny * .45;
      triggerGrannyRushCollision(a, b);
    }
  }

  function collideBalls() {
    const balls = liveBalls();
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) collidePair(balls[i], balls[j]);
    }
  }

  function ai() {
    if (state.red?.node && !isStunned(state.red)) {
      redUse('sword');
      redUse('hook');
      redUse('bow');
      redUse('turret');
    }
    if (state.white?.node && !isStunned(state.white)) {
      if (isFarmerAwakened()) {
        whiteUse('wheat');
        whiteUse('fork');
        whiteUse('hoe');
        whiteUse('golem');
      } else {
        whiteUse('fork');
        whiteUse('wheat');
        whiteUse('hoe');
        whiteUse('golem');
      }
    }
    if (state.granny?.node && !isStunned(state.granny)) {
      if (isGrannyAwakened()) {
        grannyUse('slipper');
        grannyUse('soup');
        grannyUse('trap');
        grannyUse('rush');
      } else {
        grannyUse('soup');
        grannyUse('trap');
        grannyUse('rush');
        grannyUse('slipper');
      }
    }
  }

  function updateBodies() {
    for (const b of [state.red, state.white, state.granny]) {
      if (!b || !b.node) continue;
      if (b.kind === 'granny' && isGrannyLocked(b)) {
        b.vx = 0;
        b.vy = 0;
        continue;
      }
      if (isStunned(b)) {
        b.vx *= .82;
        b.vy *= .82;
        continue;
      }
      b.x += b.vx; b.y += b.vy;
      bounceBody(b, BALL_R);
    }
    collideBalls();
    if (state.red?.node) normalizeSpeed(state.red, MIN_BALL_SPEED, MAX_BALL_SPEED);
    if (state.white?.node) normalizeSpeed(state.white, MIN_BALL_SPEED, MAX_BALL_SPEED);
    if (state.granny?.node) {
      if (isGrannyLocked(state.granny)) {
        state.granny.vx = 0;
        state.granny.vy = 0;
      } else {
        const rushActive = isGrannyRushing(state.granny);
        const speedMultiplier = grannyMoveSpeedMultiplier();
        normalizeSpeed(
          state.granny,
          (rushActive ? GRANNY_RUSH_MIN_SPEED : MIN_BALL_SPEED) * speedMultiplier,
          (rushActive ? GRANNY_RUSH_MAX_SPEED : MAX_BALL_SPEED) * speedMultiplier
        );
      }
    }
  }

  function updateResultMode(dt) {
    state.gameTime += dt;
    const winner = state.winner;
    if (winner && winner.node) {
      winner.x += winner.vx;
      winner.y += winner.vy;
      bounceBody(winner, winner.radius);
      normalizeSpeed(winner, MIN_BALL_SPEED, MAX_BALL_SPEED);
    }
    updateEffects(dt);
  }

  function updateSkillUI() {
    updateAwakenedSkillValues();
    updateRedArrowCooldown();
    for (const [slot, group] of Object.entries(skillGroups)) {
      if (activeSkillBars.has(slot)) updateSkillGroup(group.skills, group.ui);
    }
  }

  function updateSkillGroup(skills, ui) {
    for (const [name, skill] of Object.entries(skills)) {
      const remain = Math.max(0, skill.cd - (state.gameTime - skill.last));
      const node = ui[name];
      if (!node) continue;
      const clock = node.querySelector('.clock');
      const cd = node.querySelector('.cd');
      if (!clock || !cd) continue;
      if (remain > .05) {
        node.classList.add('cooling');
        clock.style.setProperty('--cool', `${Math.min(1, remain / skill.cd) * 360}deg`);
        cd.textContent = remain >= 10 ? Math.ceil(remain) : remain.toFixed(1);
      } else if (name === 'golem' && state.energy < farmerGolemCost()) {
        const cost = farmerGolemCost();
        node.classList.add('cooling');
        clock.style.setProperty('--cool', `${(1 - state.energy / cost) * 360}deg`);
        cd.textContent = `${state.energy}/${cost}`;
      } else {
        node.classList.remove('cooling');
        clock.style.setProperty('--cool', '0deg');
        cd.textContent = '0';
      }
    }
  }

  function updateRedStatusUI() {
    const red = state.red;
    const status = state.redStatus;
    if (!status || !status.node) return;

    if (!red || !red.node) {
      status.node.style.display = 'none';
      return;
    }

    const hpRatio = redHpRatio();
    const lastStand = typeof red.isLastStand === 'boolean' ? red.isLastStand : hpRatio <= .15;
    const rage = typeof red.isRage === 'boolean' ? red.isRage : hpRatio <= .30 && !lastStand;

    red.node.classList.toggle('lastStandGlow', lastStand);
    status.node.classList.toggle('rage', rage);
    status.node.classList.toggle('lastStand', lastStand);
    status.mode.textContent = lastStand ? 'LAST STAND' : rage ? 'RAGE' : '';
    status.cdValue.textContent = `${redSkills.bow.cd.toFixed(1)}s`;
    status.node.style.display = 'block';
    status.node.style.left = `${clamp(red.x + BALL_R, 72, arenaSize() - 72)}px`;
    status.node.style.top = `${clamp(red.y - 8, 30, arenaSize() - 4)}px`;
  }

  function updateGrannyShieldUI() {
    const granny = state.granny;
    const shield = state.grannyShield;
    if (!shield || !shield.node) return;
    if (!granny || !granny.node || granny.shield <= 0) {
      shield.node.style.display = 'none';
      return;
    }
    shield.node.textContent = `🛡 ${Math.ceil(granny.shield)}`;
    shield.node.style.display = 'block';
    shield.node.style.left = `${clamp(granny.x + BALL_R + 12, 8, arenaSize() - 54)}px`;
    shield.node.style.top = `${clamp(granny.y - 8, 8, arenaSize() - 20)}px`;
  }

  function updateSuperGolemProgressUI() {
    const farmer = state.white;
    const progress = state.superGolemProgress;
    if (!progress || !progress.node) return;
    if (!farmer || !farmer.node || !isFarmerAwakened() || state.lastHarvestWheatEaten < SUPER_GOLEM_PROGRESS_SHOW_AT) {
      progress.node.style.display = 'none';
      return;
    }

    progress.node.textContent = `小麥 ${state.lastHarvestWheatEaten}/${SUPER_GOLEM_WHEAT_GOAL}`;
    progress.node.style.display = 'block';
    progress.node.style.left = `${clamp(farmer.x + BALL_R + 10, 8, arenaSize() - 118)}px`;
    progress.node.style.top = `${clamp(farmer.y - 30, 8, arenaSize() - 24)}px`;
  }

  function render() {
    updateRedArrowCooldown();
    for (const b of [state.red, state.white, state.granny]) {
      if (!b || !b.node) continue;
      b.node.classList.toggle('stunned', isStunned(b));
      if (b.kind === 'white') b.node.classList.toggle('lastHarvestGlow', isFarmerAwakened());
      if (b.kind === 'granny') {
        b.node.classList.toggle('rushGlow', isGrannyRushing(b));
        b.node.classList.toggle('rushCharge', isGrannyCharging(b));
        b.node.classList.toggle('angryGrandmaGlow', isGrannyAwakened());
      }
      if (typeof b.draw === 'function') b.draw();
      else {
        b.node.style.transform = `translate(${b.x}px, ${b.y}px)`;
        b.node.textContent = Math.max(0, Math.ceil(b.hp));
      }
    }
    updateRedStatusUI();
    updateGrannyShieldUI();
    updateSuperGolemProgressUI();
    if (golemText) golemText.textContent = state.golems.length;
  }

  function handleBallDeath(ball) {
    if (!ball || !ball.node) return;
    burstBall(ball);
    if (typeof ball.die === 'function') ball.die();
    else {
      ball.node.remove();
      ball.node = null;
    }
    if (ball === state.granny) {
      stopSound('grannyRush');
      for (const trap of [...state.traps]) removeFrom(state.traps, trap);
      for (const clone of [...state.rushClones]) removeGrannyRushClone(clone);
    }
    const alive = liveBalls();
    if (alive.length <= 1) endGame(`${(alive[0]?.displayName || 'Nobody').toUpperCase()} WINS!`, null, alive[0] || null);
  }

  function endGame(text, loser, explicitWinner = null) {
    if (state.over) return;
    state.over = true;
    state.paused = false;
    state.hitStopUntil = 0;
    state.redBleedUntil = 0;
    state.redBleedNextTick = 0;
    stopSound('grannyRush');
    state.winner = explicitWinner || (loser && loser.kind === 'red' ? state.white : state.red);

    if (loser && loser.node) {
      burstBall(loser);
      if (typeof loser.die === 'function') loser.die();
      else { loser.node.remove(); loser.node = null; }
    }

    clearCombatEffectsForResult();

    for (const arr of [state.projectiles, state.turrets, state.golems, state.traps, state.rushClones]) {
      for (const obj of [...arr]) removeFrom(arr, obj);
    }

    const victory = el('victoryText', text);
    victory.style.top = '45%';
    playSound('victory');
  }

  function tick() {
    const t = now();
    const dt = Math.min(.033, t - state.lastReal);
    state.lastReal = t;

    if (!state.paused) {
      if (state.over) {
        updateResultMode(dt);
      } else {
        const stopped = t < state.hitStopUntil;
        if (!stopped) {
          state.gameTime += dt;
          updateBodies();
          updateGrannyRushClones();
          updateGrannyRushParticles();
          updateAwakenedSkillValues();
          updateRedArrowCooldown();
          ai();
          updateProjectiles(dt);
          updateTurrets();
          updateWheat();
          updateTraps();
          updateGolems();
          updateBleed();
          updateEffects(dt);
        }
      }
    }

    updateSkillUI();
    render();
    requestAnimationFrame(tick);
  }

  function runDevTests() {
    console.assert(redSkills.hook.cd === 7, 'red hook cooldown should be 7 seconds');
    console.assert(redSkills.sword.cd === 2, 'red sword cooldown should be 2 seconds');
    console.assert(whiteSkills.fork.cd === 2, 'white fork cooldown should be 2 seconds');
    console.assert(whiteSkills.wheat.cd === farmerWheatCooldown(), 'white wheat cooldown should match farmer state');
    console.assert(whiteSkills.hoe.cd === 5, 'white hoe cooldown should be 5 seconds');
    console.assert(whiteSkills.golem.cd === 20, 'white golem cooldown should be 20 seconds');
    console.assert(grannySkills.slipper.cd === 3, 'granny slipper cooldown should be 3 seconds');
    console.assert(grannySkills.soup.cd === 5, 'granny soup cooldown should be 5 seconds');
    console.assert(grannySkills.trap.cd === 8, 'granny trap cooldown should be 8 seconds');
    console.assert(grannySkills.rush.cd === 14, 'granny rush cooldown should be 14 seconds');
    console.assert(grannySlipperCooldown() === 3, 'normal granny slipper cooldown should be 3 seconds');
    console.assert(grannySlipperInterval() === .5, 'normal granny slipper interval should be 0.5 seconds');
    console.assert(grannySlipperShotCount() === 4, 'normal granny slipper barrage should shoot 4 slippers');
    console.assert(grannyMoveSpeedMultiplier() === 1, 'granny move speed multiplier should start at 1.0');
    console.assert(typeof reduceFarmerGolemCooldown === 'function', 'farmer wheat should be able to reduce golem cooldown');
    console.assert(redArrowCooldownForRatio(.71) === 5.0, 'red bow cooldown should be 5 seconds above 70% hp');
    console.assert(redArrowCooldownForRatio(.70) === 4.0, 'red bow cooldown should be 4 seconds at 70% hp');
    console.assert(redArrowCooldownForRatio(.50) === 3.0, 'red bow cooldown should be 3 seconds at 50% hp');
    console.assert(redArrowCooldownForRatio(.30) === 2.0, 'red bow cooldown should be 2 seconds at 30% hp');
    console.assert(redArrowCooldownForRatio(.15) === MIN_ARROW_COOLDOWN, 'red bow cooldown should bottom out at 1.3 seconds');
    console.assert(typeof damageGolem === 'function', 'golem must be attackable');
    console.assert(typeof plantWheat === 'function', 'wheat planting must exist');
  }

  pauseBtn.addEventListener('click', () => {
    state.paused = !state.paused;
    pauseBtn.textContent = state.paused ? '繼續' : '暫停';
  });
  resetBtn.addEventListener('click', reset);
  window.addEventListener('resize', reset);

  reset();
  runDevTests();
  tick();
  return { state, reset, pause: () => { state.paused = true; }, resume: () => { state.paused = false; } };
}
