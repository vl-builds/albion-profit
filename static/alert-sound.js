(function (root) {
  class Notifier {
    constructor(createContext, clock = () => Date.now()) {
      this.createContext = createContext;
      this.clock = clock;
      this.enabled = false;
      this.volume = 0.5;
      this.lastPlayed = -Infinity;
      this.nodes = new Set();
      this.generation = 0;
    }
    setVolume(value) {
      if (Number.isFinite(value)) this.volume = Math.min(1, Math.max(0, value));
      if (this.master) this.master.gain.value = this.volume * 0.15;
    }
    async enable() {
      const generation = ++this.generation;
      this.context ||= this.createContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.setVolume(this.volume);
      }
      await this.context.resume();
      if (generation !== this.generation) return false;
      this.enabled = this.context.state === 'running';
      return this.enabled;
    }
    disable() {
      ++this.generation;
      this.enabled = false;
      for (const node of this.nodes) { try { node.stop(); } catch {} }
      this.nodes.clear();
    }
    play(test = false) {
      if (!this.enabled || this.context?.state !== 'running' || this.volume === 0) return false;
      const time = this.clock();
      if (!test && time - this.lastPlayed < 10000) return false;
      if (!test) this.lastPlayed = time;
      const start = this.context.currentTime;
      for (const [index, frequency] of [660, 880, 1174].entries()) {
        const oscillator = this.context.createOscillator(), envelope = this.context.createGain();
        const at = start + index * 0.24;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, at);
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(1, at + 0.015);
        envelope.gain.exponentialRampToValueAtTime(0.001, at + 0.21);
        oscillator.connect(envelope); envelope.connect(this.master);
        this.nodes.add(oscillator);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); this.nodes.delete(oscillator); };
        oscillator.start(at); oscillator.stop(at + 0.22);
      }
      return true;
    }
  }
  if (typeof module !== 'undefined') module.exports = {Notifier};
  else root.AlertSound = {Notifier};
})(globalThis);
