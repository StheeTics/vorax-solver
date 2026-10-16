import '../styles/tokens.css'
import './guide.css'
import guideMd from '../../OPTIMAL_PLAY.md?raw'
import { renderGuide } from './render'
import { linkCardNames } from './cardLinks'
import { attachCardPreviews } from './CardPreview'

const root = document.getElementById('guide')!
root.innerHTML = renderGuide(guideMd)
linkCardNames(root)
attachCardPreviews(root)
