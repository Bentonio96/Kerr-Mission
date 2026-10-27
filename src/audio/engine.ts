/**
 * The score of the mission, synthesised with Web Audio: nothing to download.
 * It is on by default, but browsers only let a page make sound after the
 * visitor's first click, tap or key press, so it starts there at the latest.
 *
 * An original piece in the spirit of the big space-organ film scores. The
 * flight is a cathedral organ; the other side is a choir.
 *
 * The flight:
 *   - a pipe organ: additive ranks (a 16' pedal, 8', 4', mixtures) through a
 *     long synthetic nave, holding a pedal A under chords that change slowly;
 *   - a clock: a dry tick whose spacing stretches with the time dilation on
 *     the HUD, until it stops at the horizon, where time outside freezes;
 *   - a two-note figure on a flute stop that enters in the ergosphere and
 *     speeds up through the dive;
 *   - one long crescendo down to the horizon, cut dead at the crossing;
 *   - a drone and rumble underneath, a rush of noise during the jump.
 *
 * The other side:
 *   - only a choir: soft "ah" voices (detuned saws through vowel formants,
 *     darkened) on a wide major chord, breathing slowly in a much longer
 *     hall. No clock, no drone, nothing struck.
 */

export interface Cue {
  /** 0 at Earth … 1 at the horizon. */
  readonly proximity: number
  readonly warp: number
  /** 0 … 1 through the dive. */
  readonly dive: number
  /** 0 … 1 once through the horizon. */
  readonly beyond: number
  /** Hours on Earth per hour aboard; Infinity at the horizon. */
  readonly dilation: number
  /** 0 … 1: the ergosphere and the dive, where the figure plays. */
  readonly tension: number
}

export interface Voice {
  update(cue: Cue): void
  setEnabled(on: boolean): void
  /** Try to start the context; browsers only allow it after a gesture. */
  unlock(): void
  /** Whether the browser is actually letting it play. */
  running(): boolean
  /** Called whenever the context starts or stops. */
  onState(fn: () => void): void
  close(): void
}

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

// The chords over the pedal A, as MIDI notes: A minor, F (add 9), C, E.
const PROGRESSION = [
  [57, 60, 64, 69],
  [53, 57, 60, 67],
  [55, 60, 64, 67],
  [56, 59, 64, 68],
] as const
const PEDAL = 33
const BAR = 12

// Ranks of the organ: footage as a multiple of the note, and level.
const FULL_ORGAN = [
  [0.5, 0.45],
  [1, 1],
  [2, 0.7],
  [3, 0.42],
  [4, 0.36],
  [6, 0.2],
  [8, 0.16],
  [12, 0.06],
] as const
const FLUTE = [
  [1, 1],
  [2, 0.35],
  [4, 0.08],
] as const

// The other side: A major with an added ninth, spread wide.
const CHOIR = [45, 57, 61, 64, 71, 76] as const
// Formants of an open "ah": frequency, width (Q) and level.
const VOWEL = [
  [730, 8, 1],
  [1090, 10, 0.5],
  [2440, 14, 0.25],
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
function hall(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.round(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
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
  comp.threshold.value = -16
  comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)

  const makeHall = (seconds: number, decay: number, level: number) => {
    const conv = ctx.createConvolver()
    conv.buffer = hall(ctx, seconds, decay)
    const out = ctx.createGain()
    out.gain.value = level
    conv.connect(out).connect(master)
    return conv
  }
  const nave = makeHall(5, 2.6, 0.6)
  const heaven = makeHall(9, 1.8, 0.75)

  const bus = (send: number, room: AudioNode = nave) => {
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(master)
    const toHall = ctx.createGain()
    toHall.gain.value = send
    gain.connect(toHall).connect(room)
    return gain
  }
  const organBus = bus(1)
  const figureBus = bus(0.8)
  const tickBus = bus(0.3)
  const choirBus = bus(1.6, heaven)

  // ---- drone, rumble and rush --------------------------------------------

  const droneFilter = ctx.createBiquadFilter()
  droneFilter.type = 'lowpass'
  droneFilter.frequency.value = 90
  droneFilter.Q.value = 4
  const droneGain = ctx.createGain()
  droneGain.gain.value = 0
  droneFilter.connect(droneGain).connect(master)
  const drones = (
    [
      ['sawtooth', 55, -6],
      ['sawtooth', 110, 5],
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
  rumbleFilter.frequency.value = 120
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

  // ---- the choir (always running, silent until the other side) ------------

  const breath = ctx.createOscillator()
  breath.frequency.value = 0.05
  const breathDepth = ctx.createGain()
  breathDepth.gain.value = 0.18
  breath.connect(breathDepth)
  const choirSwell = ctx.createGain()
  choirSwell.gain.value = 0.75
  breathDepth.connect(choirSwell.gain)
  // Darkened, so the voices sit back like a distant choir, never bright.
  const choirShade = ctx.createBiquadFilter()
  choirShade.type = 'lowpass'
  choirShade.frequency.value = 1700
  choirShade.Q.value = 0.5
  choirSwell.connect(choirShade).connect(choirBus)
  breath.start()

  const vowel = VOWEL.map(([freq, q, level]) => {
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = freq
    band.Q.value = q
    const g = ctx.createGain()
    g.gain.value = level * 2.2
    band.connect(g).connect(choirSwell)
    return band
  })
  const vibrato = ctx.createOscillator()
  vibrato.frequency.value = 4.2
  const vibratoDepth = ctx.createGain()
  vibratoDepth.gain.value = 3
  vibrato.connect(vibratoDepth)
  vibrato.start()
  const singers = CHOIR.flatMap((note) =>
    [-9, 0, 8].map((detune) => {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = midi(note)
      osc.detune.value = detune
      vibratoDepth.connect(osc.detune)
      const g = ctx.createGain()
      g.gain.value = 0.05
      osc.connect(g)
      vowel.forEach((band) => g.connect(band))
      osc.start()
      return osc
    }),
  )

  // ---- notes ---------------------------------------------------------------

  function pipe(
    note: number,
    at: number,
    length: number,
    level: number,
    attack: number,
    ranks: readonly (readonly [number, number])[],
    out: AudioNode,
  ) {
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(level, at + attack)
    env.gain.setValueAtTime(level, at + Math.max(attack, length - attack))
    env.gain.linearRampToValueAtTime(0, at + length + attack)
    env.connect(out)
    const base = midi(note)
    for (const [multiple, amp] of ranks) {
      const freq = base * multiple
      if (freq > 9000) continue
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      // A little drift between pipes, as in a real rank.
      osc.detune.value = (Math.random() - 0.5) * 5
      const g = ctx.createGain()
      g.gain.value = amp * 0.14
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
    band.frequency.value = accent ? 3000 : 2300
    band.Q.value = 10
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(accent ? 1 : 0.75, at + 0.002)
    env.gain.exponentialRampToValueAtTime(0.001, at + 0.04)
    src.connect(band).connect(env).connect(tickBus)
    src.start(at)
    src.stop(at + 0.06)
  }

  // ---- scheduler -----------------------------------------------------------

  let enabled = false
  let cue: Cue = {
    proximity: 0,
    warp: 0,
    dive: 0,
    beyond: 0,
    dilation: 1,
    tension: 0,
  }
  let bar = 0
  let nextBar = 0
  let nextTick = 0
  let tickCount = 0
  let nextStep = 0
  let step = 0
  let wasAcross = false
  let timer = 0

  function schedule() {
    const horizon = now() + 0.25
    const across = cue.beyond > 0.05
    // Scrolling back out of the other side: the organ comes straight back.
    if (wasAcross && !across) nextBar = now() + 0.1
    wasAcross = across

    while (nextBar < horizon) {
      const chord = PROGRESSION[bar % PROGRESSION.length]!
      if (!across) {
        pipe(PEDAL, nextBar, BAR + 2, 0.9, 3, FULL_ORGAN, organBus)
        chord.forEach((note) =>
          pipe(note, nextBar, BAR + 2, 0.55, 3, FULL_ORGAN, organBus),
        )
      }
      bar++
      nextBar += BAR
    }

    // The clock slows as time dilates, and stops when Earth's clock does.
    const stopped = !Number.isFinite(cue.dilation) || across
    const interval = 1.25 * Math.min(Math.max(cue.dilation, 1), 12) ** 0.5
    if (stopped) nextTick = horizon
    while (nextTick < horizon) {
      tick(nextTick, tickCount % 4 === 0)
      tickCount++
      nextTick += interval
    }

    // Two notes, rocking, a step apart, climbing to the chord's top note.
    const eighth = 60 / (72 + cue.tension * 96) / 2
    if (cue.tension < 0.02 || across) nextStep = horizon
    while (nextStep < horizon) {
      const chord =
        PROGRESSION[(bar - 1 + PROGRESSION.length) % PROGRESSION.length]!
      const high = chord[chord.length - 1]! + 12
      const low = chord[1]! + 12
      const note = step % 2 === 0 ? low : step % 8 < 4 ? high : high + 2
      pipe(note, nextStep, eighth * 0.92, 0.6, 0.01, FLUTE, figureBus)
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
      // One long crescendo to the horizon, then cut dead at the crossing.
      const swell = 0.3 + near * 0.5 + cue.dive * 0.4 + cue.warp * 0.2
      const cut = cue.beyond > 0.05 ? 0.05 : 0.6
      organBus.gain.setTargetAtTime(swell * live, t, cut)
      figureBus.gain.setTargetAtTime(
        cue.tension * (0.7 + cue.dive * 0.5) * live,
        t,
        cut,
      )
      tickBus.gain.setTargetAtTime((0.08 + near * 0.16) * live, t, 0.2)
      droneFilter.frequency.setTargetAtTime(
        70 + near ** 2 * 650 + cue.warp * 300,
        t,
        0.3,
      )
      droneGain.gain.setTargetAtTime((0.04 + near * 0.1) * live, t, cut)
      drones[2]?.frequency.setTargetAtTime(27.5 + near * 4, t, 0.5)
      rumbleGain.gain.setTargetAtTime(near ** 1.6 * 0.6 * live, t, cut)
      rushFilter.frequency.setTargetAtTime(300 + cue.warp * 2600, t, 0.2)
      rushGain.gain.setTargetAtTime(cue.warp * 0.35, t, 0.2)
      // The choir rises slowly out of the silence.
      choirBus.gain.setTargetAtTime(cue.beyond * 0.75, t, 4)
    },
    unlock() {
      if (ctx.state !== 'running' && enabled) ctx.resume().catch(() => {})
    },
    running: () => ctx.state === 'running',
    onState(fn) {
      ctx.addEventListener('statechange', fn)
    },
    setEnabled(on) {
      enabled = on
      const t = now()
      master.gain.cancelScheduledValues(t)
      master.gain.setTargetAtTime(on ? 0.75 : 0, t, on ? 0.8 : 0.15)
      if (on) {
        ctx.resume().catch(() => {})
        nextBar = nextTick = nextStep = now() + 0.1
        window.clearInterval(timer)
        timer = window.setInterval(schedule, 50)
        schedule()
        this.update(cue)
      } else {
        window.clearInterval(timer)
        window.setTimeout(() => !enabled && ctx.suspend().catch(() => {}), 900)
      }
    },
    close() {
      window.clearInterval(timer)
      ;[...drones, ...singers, breath, vibrato].forEach((osc) => osc.stop())
      noise.stop()
      ctx.close().catch(() => {})
    },
  }
}
