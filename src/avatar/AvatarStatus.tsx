import { startAvatarLoad, statusText, useAvatarStatus } from './avatarStore'

// A small note while the avatar downloads, and a way to try again if it fails.
// Disappears once the avatar is in the room.
export function AvatarStatus() {
  const status = useAvatarStatus()
  const text = statusText(status)

  if (status.kind === 'error') {
    return (
      <p className="avatar-status avatar-status-error" role="alert" data-state={status.kind}>
        {text}
        <button type="button" onClick={() => startAvatarLoad()}>
          Try again
        </button>
      </p>
    )
  }
  return (
    // data-state lets scripts and tests wait for the real state (an empty note also means "not started")
    <p className="avatar-status" role="status" data-state={status.kind}>
      {text}
    </p>
  )
}
