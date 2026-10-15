import { useState } from 'react'
import { Wordmark } from './brand/Wordmark'
import { RoomScene } from './scene/RoomScene'
import { RoomPicker } from './room/RoomPicker'
import type { RoomShapeId } from './room/roomShapes'
import { AvatarStatus } from './avatar/AvatarStatus'
import type { AvatarRequest } from './avatar/AvatarModel'
import type { Request } from './things/activity'
import { TodayCard, todayStore } from './today/TodayCard'

export default function App() {
  // Which room is showing. Kept in memory only: remembering it after a reload is in the backlog.
  const [shapeId, setShapeId] = useState<RoomShapeId>('square')
  // The latest thing asked of the avatar (a floor tap, a furniture tap, or a Today button).
  // A new id every time, so asking for the same thing twice still counts.
  const [request, setRequest] = useState<AvatarRequest | null>(null)
  const ask = (next: Request) => setRequest({ ...next, id: performance.now() })

  return (
    <main className="app">
      <RoomScene shapeId={shapeId} request={request} onRequest={ask} onDone={todayStore.markDone} />
      <header className="hud">
        <Wordmark />
        <p className="hint hint-desktop">Click the floor to walk · click furniture to use it · drag to turn</p>
        <p className="hint hint-touch">Tap the floor to walk · tap furniture to use it · drag to turn</p>
        <TodayCard onDo={(thing) => ask({ type: 'use', thing })} />
      </header>
      <div className="bottom-bar">
        <AvatarStatus />
        <RoomPicker value={shapeId} onChange={setShapeId} />
      </div>
    </main>
  )
}
