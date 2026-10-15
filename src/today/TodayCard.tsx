import { useEffect, useSyncExternalStore } from 'react'
import type { ThingKind } from '../things/things'
import { TODAY_ITEMS, createTodayStore, itemLabel, todaySummary } from './today'

// The app's one store: the browser's localStorage (if the browser allows it) and the real clock
function browserStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
export const todayStore = createTodayStore(browserStorage(), () => new Date())

// "Today" card: the three adult things, ticked when finished today. Each item is also a button
// that sends the avatar to do it, so the whole thing works from the keyboard too.
export function TodayCard({ onDo }: { onDo: (thing: ThingKind) => void }) {
  const done = useSyncExternalStore(todayStore.subscribe, todayStore.get)

  // Check for midnight every half minute, and whenever the tab comes back into view
  useEffect(() => {
    const refresh = () => todayStore.refresh()
    const timer = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const allDone = done.length === TODAY_ITEMS.length
  return (
    <section className="today" aria-labelledby="today-title">
      <h2 id="today-title" className="today-title">Today</h2>
      <ul className="today-list">
        {TODAY_ITEMS.map((thing) => {
          const isDone = done.includes(thing)
          return (
            <li key={thing}>
              <button
                type="button"
                className="today-item"
                data-done={isDone}
                onClick={() => onDo(thing)}
                aria-label={`${itemLabel(thing)}: ${isDone ? 'done today' : 'not done yet'}. Go and do it`}
              >
                <span className="today-tick" aria-hidden="true">
                  {isDone ? '✓' : ''}
                </span>
                {itemLabel(thing)}
              </button>
            </li>
          )
        })}
      </ul>
      {/* read out when it changes ("2 of 3 done") */}
      <p className="today-summary" role="status" data-all-done={allDone}>
        {todaySummary(done)}
      </p>
    </section>
  )
}
