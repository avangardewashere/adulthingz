import { floorRects, parseRoom } from './roomLayout'
import type { RoomShape } from './roomShapes'

// The room seen from above, drawn from the same rows as the real room, so the icon
// can never disagree with it. All icons share one scale: a smaller room looks smaller.
const BOX = 12 // tiles; the biggest room is 12 wide

export function ShapeIcon({ shape }: { shape: RoomShape }) {
  const plan = parseRoom(shape.rows)
  const dx = (BOX - plan.cols) / 2
  const dy = (BOX - plan.rows) / 2
  return (
    <svg className="shape-icon" viewBox={`-0.5 -0.5 ${BOX + 1} ${BOX + 1}`} aria-hidden="true" shapeRendering="crispEdges">
      {floorRects(plan).map((r) => (
        <rect key={`${r.col},${r.row}`} x={r.col + dx} y={r.row + dy} width={r.cols} height={r.rows} fill="currentColor" />
      ))}
    </svg>
  )
}
