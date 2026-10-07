import { ROOM_SHAPES, sizeLabel, type RoomShapeId } from './roomShapes'
import { ShapeIcon } from './ShapeIcon'

// Pick the room's shape. Real radio buttons underneath, so the keyboard works for
// free (Tab to the group, arrow keys to move) and screen readers say "1 of 3".
export function RoomPicker({ value, onChange }: { value: RoomShapeId; onChange: (id: RoomShapeId) => void }) {
  return (
    <fieldset className="room-picker">
      <legend className="sr-only">Room shape</legend>
      {ROOM_SHAPES.map((shape) => (
        <label key={shape.id} className="room-option">
          <input
            type="radio"
            name="room-shape"
            value={shape.id}
            checked={value === shape.id}
            onChange={() => onChange(shape.id)}
          />
          <ShapeIcon shape={shape} />
          <span className="room-option-text">
            <span className="room-option-label">{shape.label}</span>
            <span className="room-option-size">{sizeLabel(shape)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
