import '../styles/tokens.css'
import './guide.css'
import guideMd from '../../OPTIMAL_PLAY.md?raw'
import { renderGuide } from './render'

const root = document.getElementById('guide')!
root.innerHTML = renderGuide(guideMd)
