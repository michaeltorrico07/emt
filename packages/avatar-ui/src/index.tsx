/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App.tsx'

const theme = import.meta.env.VITE_THEME || 'emilia'

document.documentElement.setAttribute('data-theme', theme)

const root = document.getElementById('root')

render(() => <App />, root!)
