import emiliaImg from '../assets/lia.png'
import mamboImg from '../assets/mambo.png'
import janeImg from '../assets/jane-doe.png'

export const characters = {
  emilia: {
    image: emiliaImg,
    name: 'emilia-tan'
  },

  mambo: {
    image: mamboImg,
    name: 'MAMBO'
  },

  'jane-doe': {
    image: janeImg,
    name: 'Jane'
  },
} as const