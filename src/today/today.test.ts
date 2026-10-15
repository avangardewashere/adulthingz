import { describe, expect, it } from 'vitest'
import { ROOM_SHAPES, findShape } from '../room/roomShapes'
import { parseRoom, tileCentre } from '../room/roomLayout'
import { FACING_YAW, spawnTile } from '../avatar/placement'
import { standingWalker } from '../walk/walker'
import { FURNITURE_FOR, THING_FOR, type ThingKind } from '../things/things'
import { freeActivity, requestThing, stepActivity, type Activity } from '../things/activity'
import {
  TODAY_ITEMS,
  TODAY_KEY,
  createTodayStore,
  localDay,
  readSaved,
  tick,
  todaySummary,
  writeSaved,
  type SmallStorage,
} from './today'

// A pretend localStorage, so nothing touches the real browser
function fakeStorage(start: Record<string, string> = {}): SmallStorage & { data: Record<string, string> } {
  const data = { ...start }
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
}

// A clock the test moves by hand
function fakeClock(start: Date) {
  let now = start
  return { now: () => now, set: (d: Date) => void (now = d) }
}

describe('v2 Block 3: today\'s adult things', () => {
  it('V2B3-T1: a thing finished in full ticks it; a cancelled one does not', () => {
    const plan = parseRoom(findShape('square').rows)
    const { x, z } = tileCentre(plan, spawnTile(plan))
    const run = (cancelAfterHold: boolean) => {
      const store = createTodayStore(fakeStorage(), () => new Date(2026, 9, 15, 10, 0))
      let a: Activity = requestThing(plan, freeActivity(standingWalker(x, z, FACING_YAW)), { type: 'use', thing: 'cook' })
      let cancelled = false
      for (let i = 0; i < 60 * 20; i++) {
        const step = stepActivity(plan, a, 1 / 60)
        a = step.activity
        if (step.done) store.markDone(step.done)
        if (cancelAfterHold && !cancelled && a.phase.name === 'hold') {
          a = requestThing(plan, a, { type: 'walk', tile: { col: 3, row: 6 } })
          cancelled = true
        }
      }
      return store.get()
    }
    expect(run(false)).toEqual(['cook'])
    expect(run(true)).toEqual([])
  })

  it('V2B3-T2: the count, and the message once all three are done', () => {
    expect(todaySummary([])).toBe('0 of 3 done')
    expect(todaySummary(['sleep', 'bills'])).toBe('2 of 3 done')
    expect(todaySummary(['sleep', 'cook', 'bills'])).toBe('Adulting: done for today')
    // ticks keep the checklist's order and never repeat
    expect(tick(['bills'], 'sleep')).toEqual(['sleep', 'bills'])
    expect(tick(['sleep'], 'sleep')).toEqual(['sleep'])
  })

  it('V2B3-T3: a reload keeps today\'s ticks', () => {
    const storage = fakeStorage()
    const clock = fakeClock(new Date(2026, 9, 15, 9, 30))
    const first = createTodayStore(storage, clock.now)
    first.markDone('sleep')
    first.markDone('bills')
    expect(JSON.parse(storage.data[TODAY_KEY])).toEqual({ version: 1, day: '2026-10-15', done: ['sleep', 'bills'] })
    clock.set(new Date(2026, 9, 15, 21, 0)) // later the same day: the page is reloaded
    const reloaded = createTodayStore(storage, clock.now)
    expect(reloaded.get()).toEqual(['sleep', 'bills'])
  })

  it('V2B3-T4: a new day starts empty, at local midnight', () => {
    expect(localDay(new Date(2026, 9, 15, 23, 59))).toBe('2026-10-15')
    expect(localDay(new Date(2026, 9, 16, 0, 1))).toBe('2026-10-16')
    expect(localDay(new Date(2026, 0, 5, 12))).toBe('2026-01-05') // months and days get their 0
    // in Manila (UTC+8), 00:30 on the 16th is still the 15th in UTC: the day must follow the
    // local clock. Pinned here so the check also bites on a UTC machine like GitHub's CI.
    const zone = process.env.TZ
    process.env.TZ = 'Asia/Manila'
    try {
      expect(localDay(new Date(2026, 9, 16, 0, 30))).toBe('2026-10-16')
    } finally {
      if (zone === undefined) delete process.env.TZ
      else process.env.TZ = zone
    }
    // a reload the next morning: yesterday's ticks are gone
    const storage = fakeStorage({ [TODAY_KEY]: writeSaved('2026-10-15', ['sleep', 'cook', 'bills']) })
    expect(createTodayStore(storage, () => new Date(2026, 9, 16, 7)).get()).toEqual([])
    // and with the page left open past midnight
    const clock = fakeClock(new Date(2026, 9, 15, 23, 58))
    const store = createTodayStore(fakeStorage(), clock.now)
    let changes = 0
    store.subscribe(() => changes++)
    store.markDone('cook')
    clock.set(new Date(2026, 9, 16, 0, 0, 30))
    store.refresh()
    expect(store.get()).toEqual([])
    expect(changes).toBe(2) // the tick, then the new day
    store.markDone('sleep')
    expect(store.get()).toEqual(['sleep'])
  })

  it('V2B3-T5: broken, old, future or odd saved data is ignored, never a crash', () => {
    const today = '2026-10-15'
    const bad = [
      'not json at all',
      'null',
      '42',
      '[]',
      JSON.stringify({ version: 0, day: today, done: ['sleep'] }), // older version
      JSON.stringify({ version: 2, day: today, done: ['sleep'] }), // a newer app's data
      JSON.stringify({ version: 1, day: '2026-10-16', done: ['sleep'] }), // from the future
      JSON.stringify({ version: 1, day: today, done: 'sleep' }), // wrong shape
    ]
    for (const raw of bad) expect(readSaved(raw, today), raw).toEqual([])
    // unknown things are dropped, known ones kept
    expect(readSaved(JSON.stringify({ version: 1, day: today, done: ['sleep', 'dance', 7] }), today)).toEqual(['sleep'])
    expect(readSaved(null, today)).toEqual([])
  })

  it('V2B3-T6: the checklist matches the furniture one to one, and every room has it all', () => {
    expect([...TODAY_ITEMS].sort()).toEqual([...new Set(Object.values(THING_FOR))].sort())
    for (const thing of TODAY_ITEMS) expect(THING_FOR[FURNITURE_FOR[thing]]).toBe(thing)
    for (const shape of ROOM_SHAPES) {
      const kinds = parseRoom(shape.rows).furniture.map((p) => p.kind)
      for (const thing of TODAY_ITEMS) expect(kinds, `${shape.label} needs a ${FURNITURE_FOR[thing]}`).toContain(FURNITURE_FOR[thing])
    }
  })

  it('V2B3-T7: a browser that blocks storage still works (just forgets on reload)', () => {
    const blocked: SmallStorage = {
      getItem: () => { throw new Error('SecurityError') },
      setItem: () => { throw new Error('QuotaExceededError') },
    }
    const store = createTodayStore(blocked, () => new Date(2026, 9, 15, 12))
    expect(store.get()).toEqual([])
    expect(() => store.markDone('bills')).not.toThrow()
    expect(store.get()).toEqual(['bills'])
    const none = createTodayStore(null, () => new Date(2026, 9, 15, 12))
    none.markDone('sleep')
    expect(none.get()).toEqual(['sleep'])
  })

  it('V2B3-T8: marking the same thing twice saves once and tells listeners once', () => {
    const storage = fakeStorage()
    const store = createTodayStore(storage, () => new Date(2026, 9, 15, 12))
    let changes = 0
    store.subscribe(() => changes++)
    const things: ThingKind[] = ['cook', 'cook']
    things.forEach(store.markDone) // handed over as a plain callback, like the app does
    expect(store.get()).toEqual(['cook'])
    expect(changes).toBe(1)
  })
})
