import type { Localized } from '../types'

export interface CrewMember {
  readonly id: string
  readonly name: string
  readonly role: Localized
  readonly bio: Localized
  readonly quote: Localized
  /** Visor tint: the hue the black hole takes in their helmet. */
  readonly hue: number
  readonly stat: { readonly value: string; readonly label: Localized }
}

/** Invented people. Any resemblance to a real crew would be a coincidence. */
export const CREW: readonly CrewMember[] = [
  {
    id: 'valdivia',
    name: 'Inés Valdivia',
    role: { es: 'Comandante', en: 'Commander' },
    bio: {
      es: 'Piloto de pruebas. Aterrizó dos veces en Titán con un motor apagado.',
      en: 'Test pilot. Landed on Titan twice with one engine out.',
    },
    quote: {
      es: '«Lo que no se puede ver, se puede medir.»',
      en: '“What you cannot see, you can measure.”',
    },
    hue: 32,
    stat: { value: '4 812 h', label: { es: 'De vuelo', en: 'Flight hours' } },
  },
  {
    id: 'okafor',
    name: 'Tomás Okafor',
    role: { es: 'Astrofísico', en: 'Astrophysicist' },
    bio: {
      es: 'Pasó once años modelando Nadir desde la Tierra. Ahora va a verlo.',
      en: 'Spent eleven years modelling Nadir from Earth. Now he gets to see it.',
    },
    quote: {
      es: '«La luz no miente; solo se dobla.»',
      en: '“Light doesn’t lie; it only bends.”',
    },
    hue: 210,
    stat: { value: '312', label: { es: 'Papers sobre Kerr', en: 'Papers on Kerr' } },
  },
  {
    id: 'arakawa',
    name: 'Mei Arakawa',
    role: { es: 'Ingeniera de vuelo', en: 'Flight engineer' },
    bio: {
      es: 'Diseñó el escudo del Umbral con hielo de cometa y cerámica.',
      en: 'Designed the Umbral’s shield from comet ice and ceramic.',
    },
    quote: {
      es: '«Todo motor es un acuerdo con la entropía.»',
      en: '“Every engine is a deal with entropy.”',
    },
    hue: 350,
    stat: { value: '11', label: { es: 'Motores rediseñados', en: 'Engines redesigned' } },
  },
  {
    id: 'rahimi',
    name: 'Sana Rahimi',
    role: { es: 'Médica de vuelo', en: 'Flight surgeon' },
    bio: {
      es: 'Estudia cómo envejece un cuerpo cuando el tiempo afuera corre distinto.',
      en: 'Studies how a body ages when time outside runs differently.',
    },
    quote: {
      es: '«Aquí dentro siempre son las siete de la tarde.»',
      en: '“In here it is always seven in the evening.”',
    },
    hue: 160,
    stat: { value: '5', label: { es: 'Relojes biológicos', en: 'Body clocks tracked' } },
  },
  {
    id: 'vela',
    name: 'VELA',
    role: { es: 'Inteligencia de a bordo', en: 'Onboard intelligence' },
    bio: {
      es: 'Traza 40 millones de rayos de luz por segundo para que la nave no caiga antes de tiempo.',
      en: 'Traces 40 million light rays a second so the ship does not fall too soon.',
    },
    quote: {
      es: '«Rumbo estable. Por ahora.»',
      en: '“Heading stable. For now.”',
    },
    hue: 265,
    stat: { value: '4 × 10⁷', label: { es: 'Rayos por segundo', en: 'Rays per second' } },
  },
]
