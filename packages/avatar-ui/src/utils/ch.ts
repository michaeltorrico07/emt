import emiliaImg from '../assets/lia.png'
import mamboImg from '../assets/mambo.png'
import janeImg from '../assets/jane-doe.png'

export interface CharacterData {
  image: string
  name: string
}

export type Character = 'emilia' | 'mambo' | 'jane-doe'

export const characters: Record<Character, CharacterData> = {
  emilia: {
    image: emiliaImg,
    name: 'emilia-tan',
  },

  mambo: {
    image: mamboImg,
    name: 'MAMBO',
  },

  'jane-doe': {
    image: janeImg,
    name: 'Jane',
  },
} as const