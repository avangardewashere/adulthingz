import { PALETTE } from '../theme/palette'
import { WORDMARK_PARTS } from './brand'

// adul·thing·z: one span per part, each in its own colour.
// No spaces between the spans, so it still reads (and is read aloud) as one word.
export function Wordmark() {
  return (
    <h1 className="wordmark">
      {WORDMARK_PARTS.map((part) => (
        <span
          key={part.text}
          className={part.emphasis ? 'wordmark-part wordmark-strong' : 'wordmark-part'}
          data-part={part.text}
          style={{ color: PALETTE[part.color] }}
        >
          {part.text}
        </span>
      ))}
    </h1>
  )
}
