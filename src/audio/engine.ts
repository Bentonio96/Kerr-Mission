/**
 * The score of the mission, synthesised with Web Audio: nothing to download,
 * and nothing plays until the visitor presses the sound button (the context
 * is created inside that click, so no browser has to unlock it).
 *
 * An original piece in the spirit of the big space-organ scores, built from
 * a few layers that follow the flight:
 *
 *   - an organ: additive pipes (fundamental plus drawbar partials) playing a
 *     slow four-chord progression through a long synthetic hall, swelling as
 *     the ship closes in;
 *   - a clock: a dry tick whose spacing stretches with the time dilation on
 *     the HUD, until it stops at the horizon, where time outside freezes;
 *   - an ostinato: the chord's tones as a repeating eight-step figure that
 *     appears in the ergosphere and speeds up through the crossing;
 *   - the drone and rumble underneath, a rush of noise during the jump;
 *   - silence at the horizon, then one wide, bright chord on the other side.
 */

export interface Cue {
  /** 0 at Earth … 1 at the horizon. */
  readonly proximity: number
  readonly warp: number
  /** 0 … 1 once through the horizon. */
  readonly beyond: number
  /** Hours on Earth per hour aboard; Infinity at the horizon. */
  readonly dilation: number
  /** 0 … 1: the ergosphere and the dive, where the ostinato plays. */
  readonly tension: number
}

export interface Voice {
  update(cue: Cue): void
  setEnabled(on: boolean): void
  close(): void
}

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

// Four chords, low to high, as MIDI notes: A minor, F, C, E major.
const PROGRESSION = [
  [45, 52, 57, 60, 64],
  [41, 48, 57, 60, 65],
  [48, 55, 60, 64, 67],
  [40, 47, 56, 59, 64],
] as const
const BAR = 8
// Indices into the upper chord tones, one per eighth note.
const FIGURE = [0, 2, 1, 3, 2, 1, 3, 1] as const
// Organ drawbars: partial multiple and level.
const PIPES = [
  [1, 1],
  [2, 0.55],
  [3, 0.3],
  [4, 0.22],
  [6, 0.1],
  [8, 0.06],
] as const

function noiseBuffer(
  ctx: AudioContext,
  seconds: number,
  brown: boolean,
): AudioBuffer {
  const length = Math.round(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    } else data[i] = white
  }
  return buffer
}

/** A hall: stereo noise with an exponential tail, as an impulse response. */
function hall(ctx: AudioContext, seconds = 4.5): AudioBuffer {
  const length = Math.round(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      const t = i / length
      data[i] = (Math.random() * 2 - 1) * (1 - t) ** 3.2
    }
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
  comp.threshold.value = -18
  comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)

  const reverb = ctx.createConvolver()
  reverb.buffer = hall(ctx)
  const wet = ctx.createGain()
  wet.gain.value = 0.55
  reverb.connect(wet).connect(master)

  const bus = (level: number, send: number) => {
    const gain = ctx.createGain()
    gain.gain.value = level
    gain.connect(master)
    const toHall = ctx.createGain()
    toHall.gain.value = send
    gain.connect(toHall).connect(reverb)
    return gain
  }
  const organBus = bus(0, 0.9)
  const ostinatoBus = bus(0, 0.7)
  const tickBus = bus(0, 0.25)
  const chordBus = bus(0, 1.2)

  // ---- drone, rumble and rush --------------------------------------------

  const droneFilter = ctx.createBiquadFilter()
  droneFilter.type = 'lowpass'
  droneFilter.frequency.value = 90
  droneFilter.Q.value = 5
  const droneGain = ctx.createGain()
  droneGain.gain.value = 0
  droneFilter.connect(droneGain).connect(master)
  const drones = (
    [
      ['sawtooth', 41.2, -7],
      ['sawtooth', 82.4, 6],
      ['sine', 27.5, 0],
    ] as const
  ).map(([type, freq, detune]) => {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    osc.detune.value = detune
    osc.connect(droneFilter)
    osc.start()
    return osc
  })

  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer(ctx, 4, true)
  noise.loop = true
  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 130
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

  // ---- the final chord ------------------------------------------------------

  const chord = [57, 64, 69, 73, 76, 81].map((n, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = midi(n)
    osc.detune.value = (i % 2 ? 1 : -1) * 4
    osc.connect(chordBus)
    osc.start()
    return osc
  })

  // ---- organ pipes and the clock ------------------------------------------

  function pipe(
    note: number,
    at: number,
    length: number,
    level: number,
    attack: number,
    out: AudioNode,
  ) {
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(level, at + attack)
    env.gain.setValueAtTime(level, at + Math.max(attack, length - attack))
    env.gain.linearRampToValueAtTime(0, at + length + attack)
    env.connect(out)
    const base = midi(note)
    for (const [multiple, amp] of PIPES) {
      const freq = base * multiple
      if (freq > 9000) continue
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      // A little drift between pipes, as in a real rank.
      osc.detune.value = (Math.random() - 0.5) * 6
      const g = ctx.createGain()
      g.gain.value = amp * 0.16
      osc.connect(g).connect(env)
      osc.start(at)
      osc.stop(at + length + attack + 0.05)
    }
  }

  const tickNoise = noiseBuffer(ctx, 0.05, false)
  function tick(at: number, accent: boolean) {
    const src = ctx.createBufferSource()
    src.buffer = tickNoise
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = accent ? 3200 : 2400
    band.Q.value = 9
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(accent ? 1 : 0.7, at + 0.002)
    env.gain.exponentialRampToValueAtTime(0.001, at + 0.045)
    src.connect(band).connect(env).connect(tickBus)
    src.start(at)
    src.stop(at + 0.06)
  }

  // ---- scheduler -----------------------------------------------------------

  let enabled = false
  let cue: Cue = { proximity: 0, warp: 0, beyond: 0, dilation: 1, tension: 0 }
  let bar = 0
  let nextBar = 0
  let nextTick = 0
  let tickCount = 0
  let nextStep = 0
  let step = 0
  let timer = 0

  function schedule() {
    const horizon = now() + 0.25
    const live = 1 - cue.beyond

    while (nextBar < horizon) {
      const chordNotes = PROGRESSION[bar % PROGRESSION.length]!
      chordNotes.forEach((note, i) =>
        pipe(note, nextBar, BAR + 1.5, i === 0 ? 0.9 : 0.6, 2.2, organBus),
      )
      bar++
      nextBar += BAR
    }

    // The clock slows as time dilates, and stops when Earth's clock does.
    const stopped = !Number.isFinite(cue.dilation) || cue.beyond > 0.05
    const interval = 1.2 * Math.min(Math.max(cue.dilation, 1), 12) ** 0.55
    if (stopped) nextTick = horizon
    while (nextTick < horizon) {
      tick(nextTick, tickCount % 4 === 0)
      tickCount++
      nextTick += interval
    }

    const eighth = 60 / (66 + cue.tension * 84) / 2
    if (cue.tension < 0.02 || live < 0.5) nextStep = horizon
    while (nextStep < horizon) {
      const chordNotes =
        PROGRESSION[(bar - 1 + PROGRESSION.length) % PROGRESSION.length]!
      const upper = chordNotes.slice(1)
      const note = (upper[FIGURE[step % FIGURE.length]!] ?? upper[0]!) + 12
      pipe(note, nextStep, eighth * 0.9, 0.5, 0.012, ostinatoBus)
      step++
      nextStep += eighth
    }
  }

  return {
    update(next) {
      cue = next
      if (!enabled) return
      const t = now()
      const near = Math.min(Math.max(cue.proximity, 0), 1)
      const live = 1 - cue.beyond
      // The organ is there from the launch and swells on the way down.
      organBus.gain.setTargetAtTime(
        (0.35 + near * 0.65 + cue.warp * 0.25) * live,
        t,
        0.6,
      )
      ostinatoBus.gain.setTargetAtTime(cue.tension * 0.9 * live, t, 0.4)
      tickBus.gain.setTargetAtTime((0.05 + near * 0.12) * live, t, 0.3)
      droneFilter.frequency.setTargetAtTime(
        70 + near ** 2 * 700 + cue.warp * 300,
        t,
        0.3,
      )
      droneGain.gain.setTargetAtTime((0.05 + near * 0.12) * live, t, 0.3)
      drones[2]?.frequency.setTargetAtTime(27.5 + near * 5, t, 0.5)
      rumbleGain.gain.setTargetAtTime(near ** 1.6 * 0.7 * live, t, 0.3)
      rushFilter.frequency.setTargetAtTime(300 + cue.warp * 2600, t, 0.2)
      rushGain.gain.setTargetAtTime(cue.warp * 0.4, t, 0.2)
      chordBus.gain.setTargetAtTime(cue.beyond * 0.09, t, 1.5)
    },
    setEnabled(on) {
      enabled = on
      const t = now()
      master.gain.cancelScheduledValues(t)
      master.gain.setTargetAtTime(on ? 0.75 : 0, t, on ? 0.8 : 0.15)
      if (on) {
        void ctx.resume()
        nextBar = nextTick = nextStep = now() + 0.1
        window.clearInterval(timer)
        timer = window.setInterval(schedule, 50)
        schedule()
        this.update(cue)
      } else {
        window.clearInterval(timer)
        window.setTimeout(() => !enabled && void ctx.suspend(), 900)
      }
    },
    close() {
      window.clearInterval(timer)
      ;[...drones, ...chord].forEach((osc) => osc.stop())
      noise.stop()
      void ctx.close()
    },
  }
}
