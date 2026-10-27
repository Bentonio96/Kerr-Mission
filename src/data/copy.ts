import type { Localized } from '../types'

/**
 * Every word on the page, Spanish and English side by side. The figures in
 * the prose come from src/mission/physics.ts (Nadir: 10⁷ M☉, a = 0.94) and
 * are pinned by its tests.
 */

export interface Fact {
  readonly value: Localized
  readonly label: Localized
}

export interface ChapterCopy {
  readonly kicker: Localized
  readonly title: Localized
  readonly lead: Localized
  readonly facts?: readonly Fact[]
}

const same = (text: string): Localized => ({ es: text, en: text })

export const COPY = {
  skip: { es: 'Saltar al contenido', en: 'Skip to content' },
  home: { es: ', volver al inicio', en: ', back to the top' },
  chapters: { es: 'Capítulos de la misión', en: 'Mission chapters' },
  language: { es: 'Idioma', en: 'Language' },
  soundOn: { es: 'Activar sonido', en: 'Turn sound on' },
  soundOff: { es: 'Silenciar', en: 'Mute' },
  sound: { es: 'Sonido', en: 'Sound' },
  motionOff: { es: 'Pausar movimiento', en: 'Pause motion' },
  motionOn: { es: 'Reanudar movimiento', en: 'Resume motion' },
  motionShort: { es: 'Movimiento', en: 'Motion' },

  hud: {
    title: { es: 'Telemetría del Umbral', en: 'Umbral telemetry' },
    phase: { es: 'Fase', en: 'Phase' },
    distance: { es: 'Distancia a Nadir', en: 'Distance to Nadir' },
    distanceShort: { es: 'Dist.', en: 'Dist.' },
    dilation: { es: 'Dilatación temporal', en: 'Time dilation' },
    dilationShort: { es: 'Tiempo', en: 'Time' },
    dilationUnit: {
      es: '1 h a bordo = {x} h en la Tierra',
      en: '1 h aboard = {x} h on Earth',
    },
    speed: { es: 'Velocidad', en: 'Speed' },
    speedShort: { es: 'Vel.', en: 'Speed' },
    tidal: { es: 'Marea (cuerpo de 2 m)', en: 'Tidal stretch (2 m body)' },
    rs: { es: 'Radio de Schwarzschild', en: 'Schwarzschild radius' },
    regime: {
      cruise: { es: 'Crucero', en: 'Cruise' },
      orbit: { es: 'Órbita prograda', en: 'Prograde orbit' },
      fall: { es: 'Caída libre', en: 'Free fall' },
      beyond: { es: 'Sin señal', en: 'No signal' },
    },
    infinite: {
      es: '∞ · el reloj de la Tierra se detiene',
      en: '∞ · Earth’s clock stops',
    },
    render: { es: 'Render', en: 'Render' },
    lost: { es: 'Señal perdida', en: 'Signal lost' },
    radar: {
      es: 'Posición de la nave respecto del horizonte, la órbita de fotones y la ergosfera',
      en: 'Ship position relative to the horizon, the photon orbit and the ergosphere',
    },
  },

  launch: {
    kicker: {
      es: 'Misión tripulada KRR-01 · destino Nadir',
      en: 'Crewed mission KRR-01 · destination Nadir',
    },
    title: same('Kerr'),
    titleLabel: {
      es: 'Kerr, misión tripulada a un agujero negro en rotación',
      en: 'Kerr, a crewed mission into a spinning black hole',
    },
    lead: {
      es: 'Cinco personas viajan 26 000 años luz hasta Nadir, un agujero negro de diez millones de soles que gira al 94 % de lo que la física permite. Esta es la bitácora del viaje: hasta su horizonte, y un poco más allá.',
      en: 'Five people travel 26,000 light years to Nadir, a black hole of ten million suns spinning at 94 % of what physics allows. This is the log of the journey: to its horizon, and a little beyond.',
    },
    start: { es: 'Iniciar descenso', en: 'Begin descent' },
    clock: { es: 'Probar el reloj', en: 'Try the clock' },
    clockShort: { es: 'El reloj', en: 'The clock' },
    note: {
      es: 'Misión ficticia. La física es real, simplificada.',
      en: 'A fictional mission. The physics is real, simplified.',
    },
    scroll: { es: 'Desliza para despegar', en: 'Scroll to lift off' },
    elapsed: { es: 'Tiempo de misión', en: 'Mission time' },
  },

  clock: {
    kicker: { es: '02 · Reloj', en: '02 · Clock' },
    title: {
      es: 'Cuánto cuesta una hora aquí',
      en: 'What an hour costs down here',
    },
    lead: {
      es: 'Cerca de Nadir el tiempo corre más lento para quien está ahí. Elige qué tan cerca orbitar y cuánto quedarte, y mira cuánto pasa en la Tierra mientras tanto. Es la misma fórmula del HUD.',
      en: 'Near Nadir, time runs slower for whoever is there. Choose how close to orbit and how long to stay, and see how much passes on Earth meanwhile. It is the same formula as the HUD.',
    },
    radius: { es: 'Radio de la órbita', en: 'Orbit radius' },
    stay: { es: 'Tiempo a bordo', en: 'Time aboard' },
    stays: [
      { hours: 1, label: { es: '1 hora', en: '1 hour' } },
      { hours: 24, label: { es: '1 día', en: '1 day' } },
      { hours: 8766, label: { es: '1 año', en: '1 year' } },
    ],
    earth: { es: 'En la Tierra pasan', en: 'On Earth, meanwhile' },
    aboard: { es: 'A bordo', en: 'Aboard' },
    onEarth: { es: 'En la Tierra', en: 'On Earth' },
    factor: { es: 'Factor', en: 'Factor' },
    speed: { es: 'Velocidad orbital', en: 'Orbital speed' },
    clocks: {
      es: 'Dos relojes: a bordo y en la Tierra. El de la Tierra gira {x} veces más rápido.',
      en: 'Two clocks: aboard and on Earth. Earth’s turns {x} times faster.',
    },
    presets: { es: 'Atajos', en: 'Shortcuts' },
    umbral: { es: 'Órbita del Umbral', en: 'The Umbral’s orbit' },
    isco: { es: 'Última órbita estable', en: 'Last stable orbit' },
    far: { es: 'Lejos', en: 'Far out' },
    zones: {
      far: { es: 'Lejos del agujero', en: 'Far from the hole' },
      near: {
        es: 'Cerca de la última órbita estable',
        en: 'Near the last stable orbit',
      },
      ergo: { es: 'Dentro de la ergosfera', en: 'Inside the ergosphere' },
      edge: {
        es: 'Al borde de la órbita de fotones',
        en: 'At the edge of the photon orbit',
      },
    },
    units: {
      minute: { es: ['minuto', 'minutos'], en: ['minute', 'minutes'] },
      hour: { es: ['hora', 'horas'], en: ['hour', 'hours'] },
      day: { es: ['día', 'días'], en: ['day', 'days'] },
      year: { es: ['año', 'años'], en: ['year', 'years'] },
    },
  },

  warp: {
    kicker: { es: '03 · Salto', en: '03 · Jump' },
    title: {
      es: 'El cielo se dobla hacia adelante',
      en: 'The sky folds forward',
    },
    lead: {
      es: 'Cerca de la velocidad de la luz, las estrellas se amontonan delante de la nave y se vuelven azules: es la aberración relativista. Atrás, el universo enrojece y se apaga. El viaje dura 26 000 años para la Tierra y 26 para la tripulación.',
      en: 'Near light speed the stars crowd ahead of the ship and turn blue: relativistic aberration. Behind, the universe reddens and fades. The trip takes 26,000 years for Earth and 26 for the crew.',
    },
    facts: [
      {
        value: same('0,9999995 c'),
        label: { es: 'Velocidad de crucero', en: 'Cruise speed' },
      },
      {
        value: { es: 'γ = 1 000', en: 'γ = 1,000' },
        label: { es: 'Factor de Lorentz', en: 'Lorentz factor' },
      },
      {
        value: { es: '26 años', en: '26 years' },
        label: { es: 'A bordo, de 26 000', en: 'Aboard, out of 26,000' },
      },
    ],
  } satisfies ChapterCopy,

  approach: {
    kicker: { es: '04 · Aproximación', en: '04 · Approach' },
    title: {
      es: 'Nadir aparece donde no hay nada',
      en: 'Nadir appears where there is nothing',
    },
    lead: {
      es: 'Un agujero negro no se ve: se ve lo que le hace a la luz. El disco aparece encima y debajo de la sombra, porque la luz de su cara oculta da la vuelta. El anillo fino que la abraza es luz que alcanzó a orbitar antes de escapar.',
      en: 'You cannot see a black hole: you see what it does to light. The disk shows above and below the shadow, because light from its far side bends around. The thin ring hugging it is light that orbited before it escaped.',
    },
    facts: [
      {
        value: { es: '1,98 × 10⁷ km', en: '1.98 × 10⁷ km' },
        label: { es: 'Horizonte de sucesos', en: 'Event horizon' },
      },
      {
        value: { es: '2,10 × 10⁷ km', en: '2.10 × 10⁷ km' },
        label: { es: 'Órbita de fotones', en: 'Photon orbit' },
      },
      {
        value: { es: '~7 000 K', en: '~7,000 K' },
        label: { es: 'Borde interno del disco', en: 'Inner edge of the disk' },
      },
    ],
  } satisfies ChapterCopy,

  ergosphere: {
    kicker: { es: '05 · Ergosfera', en: '05 · Ergosphere' },
    title: {
      es: 'Donde quedarse quieto es imposible',
      en: 'Where standing still is impossible',
    },
    lead: {
      es: 'Nadir arrastra el espacio con su giro. Dentro de la ergosfera nada puede quedarse fijo, ni la luz: todo gira con el agujero. El Umbral sostiene una órbita a 1,95 M, por dentro de la última órbita estable, con los motores encendidos.',
      en: 'Nadir drags space around with its spin. Inside the ergosphere nothing can stay put, not even light: everything turns with the hole. The Umbral holds an orbit at 1.95 M, inside the last stable orbit, with its engines burning.',
    },
    facts: [
      {
        value: { es: '0,63 c', en: '0.63 c' },
        label: { es: 'Velocidad orbital', en: 'Orbital speed' },
      },
      {
        value: { es: '1 h = 3,45 h', en: '1 h = 3.45 h' },
        label: { es: 'A bordo / en la Tierra', en: 'Aboard / on Earth' },
      },
      {
        value: same('~30 min'),
        label: { es: 'Una vuelta del espacio', en: 'One turn of space itself' },
      },
    ],
  } satisfies ChapterCopy,

  horizon: {
    kicker: { es: '06 · Horizonte', en: '06 · Horizon' },
    title: {
      es: 'El horizonte no se siente',
      en: 'You don’t feel the horizon',
    },
    lead: {
      es: 'Con diez millones de soles, la marea en el horizonte es de 0,00007 g: nadie se estira. Lo que cambia es el tiempo. Desde la Tierra, el Umbral se congela en el borde para siempre. A bordo, el cruce dura un instante.',
      en: 'With ten million suns, the tidal stretch at the horizon is 0.00007 g: nobody gets stretched. What changes is time. From Earth, the Umbral freezes at the edge forever. Aboard, the crossing takes an instant.',
    },
    shout: { es: 'No hay vuelta atrás', en: 'There is no way back' },
  },

  beyond: {
    kicker: { es: '07 · Más allá', en: '07 · Beyond' },
    title: { es: 'Del otro lado', en: 'On the other side' },
    lead: {
      es: 'La última señal del Umbral llegó a la Tierra cada vez más roja y más lenta, hasta apagarse. Para quien mira desde afuera, la nave nunca terminó de caer. Para la tripulación, desde el cruce pasaron once minutos.',
      en: 'The Umbral’s last signal reached Earth redder and slower each time, until it went dark. To anyone watching from outside, the ship never finished falling. For the crew, eleven minutes have passed since the crossing.',
    },
    logTitle: { es: 'Bitácora de la misión', en: 'Mission log' },
    log: [
      {
        value: { es: '26 000', en: '26,000' },
        label: { es: 'Años luz recorridos', en: 'Light years travelled' },
      },
      { value: same('26'), label: { es: 'Años a bordo', en: 'Years aboard' } },
      {
        value: same('1,95 M'),
        label: { es: 'Órbita más baja', en: 'Lowest orbit' },
      },
      {
        value: same('∞'),
        label: {
          es: 'Dilación en el horizonte',
          en: 'Dilation at the horizon',
        },
      },
    ],
    physicsTitle: { es: 'Las fórmulas', en: 'The formulas' },
    physics: [
      {
        value: same('r_s = 2GM/c²'),
        label: { es: 'Radio de Schwarzschild', en: 'Schwarzschild radius' },
      },
      {
        value: same('r₊ = M + √(M² − a²)'),
        label: { es: 'Horizonte de Kerr', en: 'Kerr horizon' },
      },
      {
        value: same('dt/dτ = γ/α'),
        label: { es: 'Dilatación temporal', en: 'Time dilation' },
      },
      {
        value: same('Δa = 2GM·L/r³'),
        label: { es: 'Marea', en: 'Tidal stretch' },
      },
    ],
    again: { es: 'Volver a lanzar', en: 'Launch again' },
    source: { es: 'Código en GitHub', en: 'Source on GitHub' },
    credit: {
      es: 'Proyecto de portafolio de Benjamín Peña. Kerr, Nadir, el Umbral y su tripulación son ficticios; las fórmulas no.',
      en: 'A portfolio piece by Benjamín Peña. Kerr, Nadir, the Umbral and its crew are fictional; the formulas are not.',
    },
  },
} as const

export const CHAPTER_NAMES: readonly Localized[] = [
  { es: 'Lanzamiento', en: 'Launch' },
  { es: 'Reloj', en: 'Clock' },
  { es: 'Salto', en: 'Jump' },
  { es: 'Aproximación', en: 'Approach' },
  { es: 'Ergosfera', en: 'Ergosphere' },
  { es: 'Horizonte', en: 'Horizon' },
  { es: 'Más allá', en: 'Beyond' },
]
