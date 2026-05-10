import 'dotenv/config'
import path from 'node:path'

const LOCAL_APP_PATH =
  process.env.LOCAL_APP_PATH ||
  'C:\\Users\\YOUR_USER\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\'

// Temporary hardcoded registry for local testing.
// Later this will be replaced with automatic app discovery

export const APP_REGISTRY = [
  {
    id: 'ultrakill',
    name: 'Ultrakill',
    exec: path.join(LOCAL_APP_PATH, 'Steam', 'ULTRAKILL.url')
  },
  {
    id: 'spotify',
    name: 'Spotify',
    exec: path.join(LOCAL_APP_PATH, 'Spotify.lnk')
  },
  {
    id: 'off',
    name: 'OFF',
    exec:  path.join(LOCAL_APP_PATH, 'Steam', 'OFF.url')
  },
  {
    id: 'balatro',
    name: 'Balatro',
    exec: path.join(LOCAL_APP_PATH, 'Steam', 'Balatro.url')
  },
  {
    id: 'youtube-music',
    name: 'YouTube Music',
    exec: path.join(LOCAL_APP_PATH, 'Aplicaciones de Chrome', 'YouTube Music.lnk')
  },
  {
    id: 'vs-code',
    name: 'Visual Studio Code',
    exec: path.join(LOCAL_APP_PATH, 'Visual Studio Code', 'Visual Studio Code.lnk')
  }
]