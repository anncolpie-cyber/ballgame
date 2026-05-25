export class SoundManager {
  constructor(sources, volumes = {}) {
    this.sources = sources;
    this.volumes = volumes;
    this.muted = false;
    this.unlocked = false;
    this.lastPlayed = new Map();
    this.cooldowns = new Map();
    this.looping = new Map();
    this.pools = Object.fromEntries(
      Object.entries(sources).map(([name, src]) => [name, Array.from({ length: 4 }, () => this.makeAudio(name, src))])
    );
  }

  makeAudio(name, src) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = this.volumes[name] ?? 0.75;
    return audio;
  }

  setCooldown(name, seconds) {
    this.cooldowns.set(name, seconds);
  }

  play(name) {
    if (this.muted) return;
    const now = performance.now() / 1000;
    const cooldown = this.cooldowns.get(name) || 0;
    if (cooldown > 0 && now - (this.lastPlayed.get(name) || -999) < cooldown) return;

    const pool = this.pools[name];
    if (!pool) return;
    let audio = pool.find(item => item.paused || item.ended);
    if (!audio) {
      audio = this.makeAudio(name, this.sources[name]);
      pool.push(audio);
    }

    this.lastPlayed.set(name, now);
    try {
      audio.currentTime = 0;
      const pending = audio.play();
      if (pending && pending.catch) pending.catch(() => {});
    } catch (_) {}
  }

  playLoop(name) {
    if (this.muted) return;
    const current = this.looping.get(name);
    if (current && !current.paused) return;
    const src = this.sources[name];
    if (!src) return;

    const audio = this.makeAudio(name, src);
    audio.loop = true;
    this.looping.set(name, audio);
    try {
      audio.currentTime = 0;
      const pending = audio.play();
      if (pending && pending.catch) pending.catch(() => {});
    } catch (_) {}
  }

  stop(name) {
    const audio = this.looping.get(name);
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
      } catch (_) {}
      this.looping.delete(name);
    }

    const pool = this.pools[name];
    if (!pool) return;
    for (const item of pool) {
      try {
        item.pause();
        item.currentTime = 0;
      } catch (_) {}
    }
  }

  mute() {
    this.muted = true;
    for (const name of [...this.looping.keys()]) this.stop(name);
  }

  unmute() {
    this.muted = false;
  }

  attachUnlock(target = window) {
    const unlock = () => this.unlock();
    target.addEventListener('pointerdown', unlock, { once: true });
    target.addEventListener('keydown', unlock, { once: true });
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    Object.values(this.pools).forEach(pool => {
      const audio = pool[0];
      const oldMuted = audio.muted;
      audio.muted = true;
      try {
        const pending = audio.play();
        if (pending && pending.then) {
          pending.then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = oldMuted;
          }).catch(() => {
            audio.muted = oldMuted;
          });
        } else {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = oldMuted;
        }
      } catch (_) {
        audio.muted = oldMuted;
      }
    });
  }
}
