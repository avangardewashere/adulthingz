import { useState } from 'react'
import { Wordmark } from './brand/Wordmark'
import { RoomScene } from './scene/RoomScene'
import { RoomPicker } from './room/RoomPicker'
import type { RoomShapeId } from './room/roomShapes'
import { AvatarStatus } from './avatar/AvatarStatus'

export default function App() {
  // Which room is showing. Kept in memory only: remembering it after a reload is in the backlog.
  const [shapeId, setShapeId] = useState<RoomShapeId>('square')

  return (
    <main className="app">
      <RoomScene shapeId={shapeId} />
      <header className="hud">
        <Wordmark />
        <p className="hint hint-desktop">Click the floor to walk · drag to turn · scroll to zoom</p>
        <p className="hint hint-touch">Tap the floor to walk · drag to turn · pinch to zoom</p>
      </header>
      <div className="bottom-bar">
        <AvatarStatus />
        <RoomPicker value={shapeId} onChange={setShapeId} />
      </div>
    </main>
  )
}
