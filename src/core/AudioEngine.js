import { soundRepository } from "./SoundRepository.js";

const MUFFLE_OFF_FREQUENCY = 20000;
const DUCKED_MUSIC_FACTOR = 0;
const VOLUME_STORAGE_KEY = "balacoro_volumes";

export class AudioEngine {
  constructor(repository = soundRepository) {
    this.repository = repository;
    this.globals = repository.globals;
    this.context = null;
    this.buffers = new Map();
    this.lastPlayedAt = new Map();
    this.activeCounts = new Map();
    this.loops = new Map();
    this.schedulers = new Map();
    this.activeHandles = new Set();
    this.activeSources = new Set();
    this.generation = 0;
    this.currentMusic = null;
    this.pausedMusic = null;
    this.primedResume = null;
    this.pendingMusicName = undefined;
    this.paused = false;

    this.userVolumes = { master: 1, music: 1, effects: 1 };
    try {
      const saved = JSON.parse(localStorage.getItem(VOLUME_STORAGE_KEY));
      if (saved) {
        this.userVolumes.music = saved.music ?? 1;
        this.userVolumes.effects = saved.effects ?? 1;
      }
    } catch {
      this.userVolumes = { master: 1, music: 1, effects: 1 };
    }

    const resume = () => {
      if (this.context?.state === "suspended") {
        this.context.resume();
      }
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
  }

  _ensureContext() {
    if (this.context) {
      return this.context;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    this.context = context;

    this.masterGain = context.createGain();
    this.masterGain.gain.value =
      this.globals.masterVolume * this.userVolumes.master;
    this.masterGain.connect(context.destination);

    this.muffleGain = context.createGain();
    this.muffleGain.connect(this.masterGain);

    this.muffleFilter = context.createBiquadFilter();
    this.muffleFilter.type = "lowpass";
    this.muffleFilter.frequency.value = MUFFLE_OFF_FREQUENCY;
    this.muffleFilter.connect(this.muffleGain);

    this.duckGain = context.createGain();
    this.duckGain.connect(this.muffleFilter);

    this.musicGain = context.createGain();
    this.musicGain.gain.value =
      this.globals.musicVolume * this.userVolumes.music;
    this.musicGain.connect(this.duckGain);

    this.ambienceGain = context.createGain();
    this.ambienceGain.gain.value =
      this.globals.ambienceVolume * this.userVolumes.effects;
    this.ambienceGain.connect(this.muffleFilter);

    this.sfxGain = context.createGain();
    this.sfxGain.gain.value =
      this.globals.sfxVolume * this.userVolumes.effects;
    this.sfxGain.connect(this.masterGain);

    this.uiGain = context.createGain();
    this.uiGain.gain.value =
      this.globals.sfxVolume * this.userVolumes.effects;
    this.uiGain.connect(this.masterGain);

    return context;
  }

  _saveVolumes() {
    try {
      localStorage.setItem(
        VOLUME_STORAGE_KEY,
        JSON.stringify(this.userVolumes)
      );
    } catch {
      return;
    }
  }

  setMasterVolume(value) {
    const clamped = Math.min(Math.max(value, 0), 1);
    this.userVolumes.master = clamped;
    this._saveVolumes();
    if (this.context) {
      this.masterGain.gain.setTargetAtTime(
        this.globals.masterVolume * clamped,
        this.context.currentTime,
        0.05
      );
    }
  }

  setMusicVolume(value) {
    const clamped = Math.min(Math.max(value, 0), 1);
    this.userVolumes.music = clamped;
    this._saveVolumes();
    if (this.context) {
      this.musicGain.gain.setTargetAtTime(
        this.globals.musicVolume * clamped,
        this.context.currentTime,
        0.05
      );
    }
  }

  setEffectsVolume(value) {
    const clamped = Math.min(Math.max(value, 0), 1);
    this.userVolumes.effects = clamped;
    this._saveVolumes();
    if (!this.context) {
      return;
    }
    const now = this.context.currentTime;
    if (!(this.paused && this.globals.pauseMuffle.sfxMuted)) {
      this.ambienceGain.gain.setTargetAtTime(
        this.globals.ambienceVolume * clamped,
        now,
        0.05
      );
    }
    this.uiGain.gain.setTargetAtTime(
      this.globals.sfxVolume * clamped,
      now,
      0.05
    );
    if (!(this.paused && this.globals.pauseMuffle.sfxMuted)) {
      this.sfxGain.gain.setTargetAtTime(
        this.globals.sfxVolume * clamped,
        now,
        0.05
      );
    }
  }

  _loadBuffer(url) {
    let entry = this.buffers.get(url);
    if (!entry) {
      const context = this._ensureContext();
      entry = fetch(url)
        .then((response) => response.arrayBuffer())
        .then((data) => context.decodeAudioData(data));
      this.buffers.set(url, entry);
    }
    return entry;
  }

  _busFor(sound) {
    if (sound.kind === "music") {
      return this.musicGain;
    }
    if (sound.kind === "ambience") {
      return this.ambienceGain;
    }
    if (sound.category === "ui" || sound.pauseExempt) {
      return this.uiGain;
    }
    return this.sfxGain;
  }

  _setNodePosition(node, position) {
    if (node.positionX) {
      node.positionX.value = position.x;
      node.positionY.value = position.y ?? 0;
      node.positionZ.value = position.z;
    } else {
      node.setPosition(position.x, position.y ?? 0, position.z);
    }
  }

  setListenerPosition(position) {
    this.listenerPosition = { x: position.x, z: position.z };
    if (!this.context) {
      return;
    }
    const listener = this.context.listener;
    if (listener.positionX) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y ?? 0;
      listener.positionZ.value = position.z;
    } else {
      listener.setPosition(position.x, position.y ?? 0, position.z);
    }
  }

  _isWithinHearing(sound, position) {
    if (!sound.spatial || !sound.hearingDistance || !position || !this.listenerPosition) {
      return true;
    }
    return (
      Math.hypot(
        position.x - this.listenerPosition.x,
        position.z - this.listenerPosition.z
      ) <= sound.hearingDistance
    );
  }

  play(name, options = {}) {
    const sound = this.repository.get(name);
    if (!sound?.enabled) {
      return;
    }
    if (sound.type === "song") {
      this.playMusic(name);
      return;
    }
    if (
      this.paused &&
      this.globals.pauseMuffle.sfxMuted &&
      sound.kind === "sfx" &&
      sound.category !== "ui" &&
      !sound.pauseExempt
    ) {
      return;
    }
    if (!this._isWithinHearing(sound, options.position)) {
      return;
    }
    const context = this._ensureContext();
    const now = context.currentTime;
    const lastPlayed = this.lastPlayedAt.get(name) ?? -Infinity;
    if (now - lastPlayed < sound.minRepeatSeconds) {
      return;
    }
    if ((this.activeCounts.get(name) ?? 0) >= sound.maxSimultaneous) {
      return;
    }
    const url = this.repository.pickUrl(name);
    if (!url) {
      return;
    }
    this.lastPlayedAt.set(name, now);
    this.activeCounts.set(name, (this.activeCounts.get(name) ?? 0) + 1);
    const release = () =>
      this.activeCounts.set(
        name,
        Math.max((this.activeCounts.get(name) ?? 1) - 1, 0)
      );

    const generation = this.generation;
    const alignContextTime = options.alignAt
      ? now + options.alignAt.secondsFromNow
      : null;
    this._loadBuffer(url)
      .then((buffer) => {
        if (generation !== this.generation) {
          release();
          return;
        }
        const source = context.createBufferSource();
        source.buffer = buffer;
        if (sound.pitchVariance > 0) {
          source.playbackRate.value = 1 + (Math.random() * 2 - 1) * sound.pitchVariance;
        }
        if (options.playbackRate) {
          source.playbackRate.value *= options.playbackRate;
        }
        const gain = context.createGain();
        gain.gain.value =
          sound.maxVolume *
          (1 - Math.random() * (sound.volumeVariance ?? 0)) *
          (options.volume ?? 1);

        if (sound.spatial && options.position) {
          const panner = context.createPanner();
          panner.panningModel = "equalpower";
          if (sound.hearingDistance) {
            panner.distanceModel = "linear";
            panner.refDistance = Math.min(
              this.globals.spatial.refDistance,
              sound.hearingDistance * 0.5
            );
            panner.maxDistance = sound.hearingDistance;
            panner.rolloffFactor = 1;
          } else {
            panner.distanceModel = "inverse";
            panner.refDistance = this.globals.spatial.refDistance;
            panner.maxDistance = this.globals.spatial.maxDistance;
            panner.rolloffFactor = this.globals.spatial.rolloffFactor;
          }
          this._setNodePosition(panner, options.position);
          source.connect(panner);
          panner.connect(gain);
        } else {
          source.connect(gain);
        }

        gain.connect(this._busFor(sound));
        const entry = { source, gain };
        this.activeSources.add(entry);
        source.onended = () => {
          this.activeSources.delete(entry);
          release();
        };
        if (alignContextTime !== null) {
          const startNow = context.currentTime;
          const remaining = alignContextTime - startNow;
          const fileTime = options.alignAt.fileTime;
          if (remaining >= fileTime) {
            source.start(startNow + (remaining - fileTime), 0);
          } else {
            const offset = Math.min(
              Math.max(fileTime - remaining, 0),
              Math.max(buffer.duration - 0.01, 0)
            );
            source.start(startNow, offset);
          }
        } else {
          source.start();
        }
      })
      .catch(release);
  }

  playHandle(name, options = {}) {
    const sound = this.repository.get(name);
    const handle = {
      stopped: false,
      gainNode: null,
      pannerNode: null,
      sourceNode: null,
      setPosition: () => {},
      stop: () => {
        handle.stopped = true;
      },
    };
    if (!sound?.enabled) {
      return handle;
    }
    const context = this._ensureContext();
    const url = this.repository.pickUrl(name);
    if (!url) {
      return handle;
    }
    const loop = options.loop !== false;
    this.activeHandles.add(handle);

    this._loadBuffer(url)
      .then((buffer) => {
        if (handle.stopped) {
          return;
        }
        const now = context.currentTime;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        const gain = context.createGain();
        const fadeIn = options.fadeInSeconds ?? 0;
        if (fadeIn > 0) {
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(sound.maxVolume, now + fadeIn);
        } else {
          gain.gain.setValueAtTime(sound.maxVolume, now);
        }

        let panner = null;
        if (options.position) {
          panner = context.createPanner();
          panner.panningModel = "equalpower";
          panner.distanceModel = "inverse";
          panner.refDistance = this.globals.spatial.refDistance;
          panner.maxDistance = this.globals.spatial.maxDistance;
          panner.rolloffFactor = this.globals.spatial.rolloffFactor;
          this._setNodePosition(panner, options.position);
          source.connect(panner);
          panner.connect(gain);
        } else {
          source.connect(gain);
        }

        gain.connect(this._busFor(sound));
        source.start(now);
        handle.sourceNode = source;
        handle.gainNode = gain;
        handle.pannerNode = panner;
        source.onended = () => {
          handle.sourceNode = null;
        };
      })
      .catch(() => {});

    handle.setPosition = (position) => {
      if (handle.pannerNode) {
        this._setNodePosition(handle.pannerNode, position);
      }
    };

    handle.stop = (fadeOutSeconds = 0) => {
      this.activeHandles.delete(handle);
      if (handle.stopped) {
        return;
      }
      handle.stopped = true;
      if (!handle.sourceNode) {
        return;
      }
      const now = this.context.currentTime;
      if (fadeOutSeconds > 0 && handle.gainNode) {
        const gainParam = handle.gainNode.gain;
        gainParam.cancelScheduledValues(now);
        gainParam.setValueAtTime(gainParam.value, now);
        gainParam.linearRampToValueAtTime(0.0001, now + fadeOutSeconds);
        try {
          handle.sourceNode.stop(now + fadeOutSeconds + 0.05);
        } catch {
          handle.sourceNode.disconnect();
        }
      } else {
        try {
          handle.sourceNode.stop(now);
        } catch {
          handle.sourceNode.disconnect();
        }
      }
    };

    return handle;
  }

  async playMusic(name) {
    if (name && this.currentMusic?.name === name) {
      return;
    }
    const sound = name ? this.repository.get(name) : null;
    if (name && !sound?.enabled) {
      return;
    }
    this.pausedMusic = null;
    if (this.loops.has("musicPause")) {
      this.stopLoop("musicPause");
    }
    this.pendingMusicName = name;
    const context = this._ensureContext();
    const now = context.currentTime;
    let startDelay = 0;

    if (this.currentMusic) {
      const previous = this.currentMusic;
      this.currentMusic = null;
      const fadeOut =
        previous.sound.fadeOutSeconds ||
        this.globals.musicTransition.fadeOutSeconds;
      const gainParam = previous.gain.gain;
      gainParam.cancelScheduledValues(now);
      gainParam.setValueAtTime(gainParam.value, now);
      gainParam.linearRampToValueAtTime(0.0001, now + fadeOut);
      try {
        previous.source.stop(now + fadeOut + 0.1);
      } catch {
        previous.source.disconnect();
      }
      startDelay = fadeOut;
    }

    if (!name) {
      return;
    }

    const url = this.repository.pickUrl(name);
    if (!url) {
      return;
    }
    const buffer = await this._loadBuffer(url);
    if (this.pendingMusicName !== name) {
      return;
    }

    const primed = this.primedResume;
    this.primedResume = null;
    let resumeOffset = 0;
    if (primed?.name === name) {
      const duration = buffer.duration ?? 0;
      resumeOffset =
        duration > 0
          ? Math.min(Math.max(primed.offset, 0), Math.max(duration - 0.05, 0))
          : 0;
    }

    const startAt = Math.max(context.currentTime, now + startDelay);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = sound.loop;
    const gain = context.createGain();
    const fadeIn = sound.fadeInSeconds ?? 0;
    if (fadeIn > 0) {
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.linearRampToValueAtTime(sound.maxVolume, startAt + fadeIn);
    } else {
      gain.gain.setValueAtTime(sound.maxVolume, startAt);
    }
    source.connect(gain);
    gain.connect(this.musicGain);
    source.onended = () => {
      if (this.currentMusic?.source !== source) {
        return;
      }
      this.currentMusic = null;
      this.onMusicEnded?.(name);
    };
    source.start(startAt, resumeOffset);
    this.currentMusic = {
      name,
      source,
      gain,
      sound,
      contextStartTime: startAt,
      bufferOffset: resumeOffset,
    };
  }

  stopMusic() {
    this.playMusic(null);
  }

  primeResume(name, offset) {
    if (!name || typeof offset !== "number" || offset < 0) {
      return;
    }
    this.primedResume = { name, offset };
  }

  getMusicSnapshot() {
    if (this.pausedMusic) {
      return { name: this.pausedMusic.name, offset: this.pausedMusic.offset };
    }
    if (this.currentMusic && this.context) {
      const { name, source, contextStartTime, bufferOffset, sound } =
        this.currentMusic;
      const duration = source.buffer?.duration ?? 0;
      const elapsed =
        bufferOffset +
        Math.max(0, this.context.currentTime - contextStartTime);
      const offset =
        sound.loop && duration > 0 ? elapsed % duration : elapsed;
      return { name, offset };
    }
    return null;
  }

  _pauseCurrentMusic() {
    if (!this.currentMusic || !this.context) {
      return;
    }
    const { name, source, contextStartTime, bufferOffset, sound } =
      this.currentMusic;
    const duration = source.buffer?.duration ?? 0;
    const elapsed =
      bufferOffset + Math.max(0, this.context.currentTime - contextStartTime);
    const resumeOffset =
      sound.loop && duration > 0 ? elapsed % duration : elapsed;
    source.onended = null;
    try {
      source.stop();
    } catch {
      source.disconnect();
    }
    this.currentMusic = null;
    if (duration > 0 && resumeOffset < duration) {
      this.pausedMusic = { name, sound, offset: resumeOffset };
    } else {
      this.pausedMusic = null;
      this.onMusicEnded?.(name);
    }
  }

  async _resumeCurrentMusic() {
    const paused = this.pausedMusic;
    if (!paused) {
      return;
    }
    this.pausedMusic = null;
    const { name, sound, offset } = paused;
    const context = this._ensureContext();
    const url = this.repository.pickUrl(name);
    if (!url) {
      return;
    }
    const buffer = await this._loadBuffer(url);
    if (this.currentMusic || this.pendingMusicName !== name) {
      return;
    }
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = sound.loop;
    const gain = context.createGain();
    gain.gain.setValueAtTime(sound.maxVolume, now);
    source.connect(gain);
    gain.connect(this.musicGain);
    source.onended = () => {
      if (this.currentMusic?.source !== source) {
        return;
      }
      this.currentMusic = null;
      this.onMusicEnded?.(name);
    };
    source.start(now, offset);
    this.currentMusic = {
      name,
      source,
      gain,
      sound,
      contextStartTime: now,
      bufferOffset: offset,
    };
  }

  async startLoop(name) {
    const sound = this.repository.get(name);
    if (!sound?.enabled || this.loops.has(name)) {
      return;
    }
    this.loops.set(name, "starting");
    const context = this._ensureContext();
    const url = this.repository.pickUrl(name);
    if (!url) {
      this.loops.delete(name);
      return;
    }
    const buffer = await this._loadBuffer(url);
    if (this.loops.get(name) !== "starting") {
      return;
    }

    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    const fadeIn = sound.fadeInSeconds ?? 0;
    if (fadeIn > 0) {
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(sound.maxVolume, now + fadeIn);
    } else {
      gain.gain.setValueAtTime(sound.maxVolume, now);
    }
    source.connect(gain);
    gain.connect(this._busFor(sound));
    source.start(now);
    this.loops.set(name, { source, gain, sound });
  }

  stopLoop(name) {
    const loop = this.loops.get(name);
    if (!loop) {
      return;
    }
    this.loops.delete(name);
    if (loop === "starting") {
      return;
    }
    const context = this.context;
    const now = context.currentTime;
    const fadeOut = loop.sound.fadeOutSeconds ?? 0;
    const gainParam = loop.gain.gain;
    gainParam.cancelScheduledValues(now);
    gainParam.setValueAtTime(gainParam.value, now);
    gainParam.linearRampToValueAtTime(0.0001, now + Math.max(fadeOut, 0.05));
    try {
      loop.source.stop(now + Math.max(fadeOut, 0.05) + 0.1);
    } catch {
      loop.source.disconnect();
    }
  }

  isLoopActive(name) {
    return this.loops.has(name);
  }

  setLoopVolume(name, factor) {
    const loop = this.loops.get(name);
    if (!loop || loop === "starting") {
      return;
    }
    const clamped = Math.min(Math.max(factor, 0), 1);
    loop.gain.gain.setTargetAtTime(
      loop.sound.maxVolume * clamped,
      this.context.currentTime,
      0.3
    );
  }

  setHeartbeat(active) {
    if (active) {
      this.startLoop("heartbeat");
    } else {
      this.stopLoop("heartbeat");
    }
  }

  setScheduler(name, active) {
    if (active) {
      if (!this.schedulers.has(name)) {
        const interval = this.repository.rollRandomInterval(name);
        if (interval !== null) {
          this.schedulers.set(name, interval);
        }
      }
    } else {
      this.schedulers.delete(name);
    }
  }

  update(deltaSeconds) {
    if (deltaSeconds <= 0) {
      return;
    }
    for (const [name, timeLeft] of this.schedulers) {
      const remaining = timeLeft - deltaSeconds;
      if (remaining <= 0) {
        this.play(name);
        this.schedulers.set(
          name,
          this.repository.rollRandomInterval(name) ?? 9999
        );
      } else {
        this.schedulers.set(name, remaining);
      }
    }
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.context) {
      return;
    }
    if (paused) {
      this._pauseCurrentMusic();
      this.startLoop("musicPause");
    } else {
      this.stopLoop("musicPause");
      this._resumeCurrentMusic();
    }
    const muffle = this.globals.pauseMuffle;
    const now = this.context.currentTime;
    this.muffleFilter.frequency.setTargetAtTime(
      paused ? muffle.lowpassFrequencyHz : MUFFLE_OFF_FREQUENCY,
      now,
      0.15
    );
    this.muffleGain.gain.setTargetAtTime(
      paused ? muffle.volumeMultiplier : 1,
      now,
      0.15
    );
    if (muffle.sfxMuted) {
      this.sfxGain.gain.setTargetAtTime(
        paused ? 0 : this.globals.sfxVolume * this.userVolumes.effects,
        now,
        0.1
      );
    }
    this.ambienceGain.gain.setTargetAtTime(
      paused ? 0 : this.globals.ambienceVolume * this.userVolumes.effects,
      now,
      0.1
    );
  }

  duckMusic(ducked) {
    if (!this.context) {
      return;
    }
    this.duckGain.gain.setTargetAtTime(
      ducked ? DUCKED_MUSIC_FACTOR : 1,
      this.context.currentTime,
      ducked ? 1.5 : 2.5
    );
  }

  stopAll() {
    this.generation += 1;
    this.schedulers.clear();
    if (this.context) {
      const now = this.context.currentTime;
      for (const { source, gain } of this.activeSources) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.15);
        try {
          source.stop(now + 0.2);
        } catch {
          source.disconnect();
        }
      }
    }
    this.activeSources.clear();
    this.activeCounts.clear();
    for (const name of [...this.loops.keys()]) {
      this.stopLoop(name);
    }
    for (const handle of [...this.activeHandles]) {
      handle.stop(0);
    }
    this.activeHandles.clear();
    this.pendingMusicName = undefined;
    this.pausedMusic = null;
    if (this.currentMusic && this.context) {
      const now = this.context.currentTime;
      const gainParam = this.currentMusic.gain.gain;
      gainParam.cancelScheduledValues(now);
      gainParam.setValueAtTime(gainParam.value, now);
      gainParam.linearRampToValueAtTime(0.0001, now + 0.5);
      try {
        this.currentMusic.source.stop(now + 0.6);
      } catch {
        this.currentMusic.source.disconnect();
      }
      this.currentMusic = null;
    }
    this.duckMusic(false);
    this.setPaused(false);
  }
}

export const audio = new AudioEngine();
