import { createRoot } from 'react-dom/client'

import { StudioLocalApp } from './StudioLocalApp'
import './styles.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Aethel Studio Local root element is missing.')
}

createRoot(container).render(<StudioLocalApp />)
