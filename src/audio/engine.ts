/**
 * The sound of the mission, synthesised with Web Audio: nothing to download,
 * and nothing plays until the visitor presses the sound button (the context
 * is created inside that click, so no browser has to unlock it).
 *
 *   - a drone: two detuned saws an octave apart plus a sub sine, through a
 *     low-pass filter that opens as the ship closes in;
 *   - a rumble: brown noise, louder near the hole;
 *   - a rush: band-passed noise that sweeps up with the warp;
 *   - silence at the horizon, then one soft chord on the other side.
 */

export interface Voice {
  /** proximity 0 (Earth) … 1 (horizon); warp 0 … 1; beyond 0 … 1. */
  update(proximity: number, warp: number, beyond: number): void
  setEnabled(on: boolean): void
  close(): void
}

function brownNoise(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

export function createVoice(): Voice | null {
  const AudioCtx =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AudioCtx) return null
  const ctx = new AudioCtx()
  const now = () => ctx.currentTime

  const master = ctx.createGain()
  master.gain.value = 0
  const comp = ctx.createDynamicsCompressor()
  master.connect(comp).connect(ctx.destination)

  // Drone.
  const droneFilter = ctx.createBiquadFilter()
  droneFilter.type = 'lowpass'
  droneFilter.frequency.value = 90
  droneFilter.Q.value = 6
  const droneGain = ctx.createGain()
  droneGain.gain.value = 0.18
  droneFilter.connect(droneGain).connect(master)
  const oscs = [
    { type: 'sawtooth', freq: 41.2, detune: -7 },
    { type: 'sawtooth', freq: 82.4, detune: 6 },
    { type: 'sine', freq: 20.6, detune: 0 },
  ] as const
  const drones = oscs.map(({ type, freq, detune }) => {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    osc.detune.value = detune
    osc.connect(droneFilter)
    osc.start()
    return osc
  })

  // Rumble and rush share one noise source.
  const noise = ctx.createBufferSource()
  noise.buffer = brownNoise(ctx)
  noise.loop = true
  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 140
  const rumbleGain = ctx.createGain()
  rumbleGain.gain.value = 0
  noise.connect(rumbleFilter).connect(rumbleGain).connect(master)
  const rushFilter = ctx.createBiquadFilter()
  rushFilter.type = 'bandpass'
  rushFilter.frequency.value = 400
  rushFilter.Q.value = 1.4
  const rushGain = ctx.createGain()
  rushGain.gain.value = 0
  noise.connect(rushFilter).connect(rushGain).connect(master)
  noise.start()

  // The chord on the other side.
  const chordGain = ctx.createGain()
  chordGain.gain.value = 0
  chordGain.connect(master)
  const chord = [220, 277.18, 329.63, 440].map((freq) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(chordGain)
    osc.start()
    return osc
  })

  let enabled = false

  return {
    update(proximity, warp, beyond) {
      if (!enabled) return
      const t = now()
      const near = Math.min(Math.max(proximity, 0), 1)
      const live = 1 - beyond
      droneFilter.frequency.setTargetAtTime(
        80 + near ** 2 * 900 + warp * 300,
        t,
        0.3,
      )
      droneGain.gain.setTargetAtTime((0.12 + near * 0.22) * live, t, 0.3)
      drones[2]?.frequency.setTargetAtTime(20.6 + near * 6, t, 0.5)
      rumbleGain.gain.setTargetAtTime(near ** 1.5 * 0.9 * live, t, 0.3)
      rushFilter.frequency.setTargetAtTime(300 + warp * 2600, t, 0.2)
      rushGain.gain.setTargetAtTime(warp * 0.55, t, 0.2)
      chordGain.gain.setTargetAtTime(beyond * 0.05, t, 1.2)
    },
    setEnabled(on) {
      enabled = on
      if (on) void ctx.resume()
      master.gain.cancelScheduledValues(now())
      master.gain.setTargetAtTime(on ? 0.6 : 0, now(), on ? 0.6 : 0.15)
      if (!on) window.setTimeout(() => !enabled && void ctx.suspend(), 900)
    },
    close() {
      ;[...drones, ...chord].forEach((osc) => osc.stop())
      noise.stop()
      void ctx.close()
    },
  }
}
