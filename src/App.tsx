import { Wordmark } from './brand/Wordmark'
import { RoomScene } from './scene/RoomScene'

export default function App() {
  return (
    <main className="app">
      <RoomScene />
      <header className="hud">
        <Wordmark />
        <p className="hint hint-desktop">Drag to turn · scroll to zoom</p>
        <p className="hint hint-touch">Drag to turn · pinch to zoom</p>
      </header>
    </main>
  )
}
