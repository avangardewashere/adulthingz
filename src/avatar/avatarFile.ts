// The avatar file and its size budget. The file lives in public/, so Vite serves it as-is.
// It is β Ver AvatarSample_1 by the VRoid Project (pixiv), CC0: see public/avatars/LICENSE.md.
export const AVATAR = {
  url: `${import.meta.env.BASE_URL}avatars/avatar-sample-1.vrm`,
  // A phone downloads this on first visit, so keep it under 15 MB
  maxBytes: 15 * 1024 * 1024,
} as const
