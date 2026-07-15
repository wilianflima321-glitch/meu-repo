import { createRoot } from 'react-dom/client'

import { StudioLocalApp } from './StudioLocalApp'
import { UndockedPanelWindow } from './UndockedPanelWindow'
import './styles.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Aethel Studio Local root element is missing.')
}

// Missão Suprema 1 (Multi-Monitor & Undocking): windows opened via
// `open_panel_window` (main.rs) load this same bundle with `?panel=<id>` in
// the URL instead of a route, since this Vite app has no router of its own.
const undockedPanel = new URLSearchParams(window.location.search).get('panel')

createRoot(container).render(
  undockedPanel ? <UndockedPanelWindow panel={undockedPanel} /> : <StudioLocalApp />
)
