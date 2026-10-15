import { THINGS, type ThingKind } from '../things/things'

// Today's adult things: which ones the avatar has finished today, saved in the browser so a reload
// keeps them, and cleared when the local date changes. Plain logic plus a tiny store; the storage
// and the clock are handed in, so the tests can use fakes.

// The checklist, in the order it's shown
export const TODAY_ITEMS: readonly ThingKind[] = ['sleep', 'cook', 'bills']

export const TODAY_KEY = 'adulthingz.today'
const VERSION = 1

// The local calendar date, e.g. "2026-10-15". Local parts on purpose: "today" ends at the
// user's own midnight, not at midnight UTC (which is 8 am in Manila).
export function localDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Saved text → today's ticks. Anything that isn't exactly what we wrote (broken JSON, an old
// version, another day, a date in the future, unknown things) counts as "nothing yet".
export function readSaved(raw: string | null, today: string): ThingKind[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return []
    const { version, day, done } = data as Record<string, unknown>
    if (version !== VERSION || day !== today || !Array.isArray(done)) return []
    return TODAY_ITEMS.filter((thing) => done.includes(thing))
  } catch {
    return []
  }
}

export function writeSaved(today: string, done: readonly ThingKind[]) {
  return JSON.stringify({ version: VERSION, day: today, done })
}

// Add a finished thing (once), keeping the checklist's order
export function tick(done: readonly ThingKind[], thing: ThingKind): ThingKind[] {
  return TODAY_ITEMS.filter((t) => t === thing || done.includes(t))
}

// The line under the checklist
export function todaySummary(done: readonly ThingKind[]) {
  if (done.length === TODAY_ITEMS.length) return 'Adulting: done for today'
  return `${done.length} of ${TODAY_ITEMS.length} done`
}

export function itemLabel(thing: ThingKind) {
  return THINGS[thing].label
}

// Just the two storage calls we use, so a test (or a browser that blocks storage) can stand in
export interface SmallStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function createTodayStore(storage: SmallStorage | null, now: () => Date) {
  const load = (day: string) => {
    try {
      return readSaved(storage?.getItem(TODAY_KEY) ?? null, day)
    } catch {
      return [] // storage blocked (private mode, settings): start empty rather than crash
    }
  }
  let day = localDay(now())
  let done = load(day)
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  // Past midnight? Start the new day empty
  const refresh = () => {
    const today = localDay(now())
    if (today === day) return
    day = today
    done = load(day)
    emit()
  }

  // A thing finished: tick it and save
  const markDone = (thing: ThingKind) => {
    refresh()
    const next = tick(done, thing)
    if (next.length === done.length) return
    done = next
    try {
      storage?.setItem(TODAY_KEY, writeSaved(day, done))
    } catch {
      // can't save (storage full or blocked): the tick still shows until the page closes
    }
    emit()
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  }

  // Plain functions (no `this`), so they can be handed around as callbacks
  return { get: () => done, markDone, refresh, subscribe }
}

export type TodayStore = ReturnType<typeof createTodayStore>
