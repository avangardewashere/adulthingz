import { useSyncExternalStore } from 'react'
import type { VRM } from '@pixiv/three-vrm'
import { AVATAR } from './avatarFile'

// Loads the avatar once and tells the page how it's going.
// The 3D scene reads the finished avatar; the page reads the status for the "loading" note.

export type AvatarStatus =
  | { kind: 'idle' } // not started yet
  | { kind: 'loading'; percent: number | null } // null = size unknown
  | { kind: 'ready' }
  | { kind: 'error' }

let status: AvatarStatus = { kind: 'idle' }
let avatar: VRM | null = null
const listeners = new Set<() => void>()

function setStatus(next: AvatarStatus) {
  status = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// The note shown on the page ('' = show nothing)
export function statusText(s: AvatarStatus) {
  if (s.kind === 'loading') {
    if (s.percent === null) return 'Loading avatar…'
    // downloaded, but the model still has to be unpacked (pictures decoded, materials built)
    if (s.percent === 100) return 'Getting avatar ready…'
    return `Loading avatar… ${s.percent}%`
  }
  if (s.kind === 'error') return 'Couldn’t load the avatar.'
  return ''
}

// Whole percent, in steps of 5, so the note (and screen readers) don't update on every byte
export function percentOf(loaded: number, total: number) {
  if (!(total > 0)) return null
  return Math.min(100, Math.floor((loaded / total) * 20) * 5)
}

export function startAvatarLoad(url: string = AVATAR.url) {
  // React runs effects twice in development; only the first call loads
  if (status.kind === 'loading' || status.kind === 'ready') return
  setStatus({ kind: 'loading', percent: null })
  // three-vrm is only downloaded when it's needed, so the room appears sooner
  import('./loadAvatar')
    .then(({ loadAvatar }) =>
      loadAvatar(url, (loaded, total) => {
        const percent = percentOf(loaded, total)
        if (status.kind === 'loading' && status.percent !== percent) setStatus({ kind: 'loading', percent })
      }),
    )
    .then((vrm) => {
      avatar = vrm
      setStatus({ kind: 'ready' })
    })
    .catch((error: unknown) => {
      console.error('Avatar failed to load:', error)
      setStatus({ kind: 'error' })
    })
}

export function useAvatarStatus() {
  return useSyncExternalStore(subscribe, () => status)
}

// The loaded avatar outside React (null until ready), e.g. for checks in the browser console
export function getAvatar() {
  return avatar
}

export function useAvatar() {
  return useSyncExternalStore(subscribe, () => avatar)
}
