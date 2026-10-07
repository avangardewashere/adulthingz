import type { Mesh, Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm'

// Downloads a .vrm file and readies it for the scene.
// A .vrm is a glTF model plus avatar extras (humanoid bones, face expressions, hair
// physics, toon materials); three-vrm's plugin reads those extras into a VRM object.
export async function loadAvatar(url: string, onProgress: (loaded: number, total: number) => void): Promise<VRM> {
  const loader = new GLTFLoader()
  loader.register((parser) => new VRMLoaderPlugin(parser))

  const gltf = await loader.loadAsync(url, (event) => onProgress(event.loaded, event.total))
  const vrm = gltf.userData.vrm as VRM | undefined
  if (!vrm) throw new Error(`${url} is a glTF file but not a VRM avatar`)

  // Tidy-ups recommended by three-vrm: drop unused vertices and merge duplicate skeletons
  // (less work for the graphics chip every frame)
  VRMUtils.removeUnnecessaryVertices(gltf.scene)
  VRMUtils.combineSkeletons(gltf.scene)
  // VRM 0 avatars face away from the camera (−z); this turns them to face +z like VRM 1
  VRMUtils.rotateVRM0(vrm)

  vrm.scene.traverse((object: Object3D) => {
    if ((object as Mesh).isMesh) {
      object.castShadow = true
      // A posed, skinned mesh can move outside its original bounding box, and three would
      // then wrongly skip drawing it. The avatar is always on screen, so never skip it.
      object.frustumCulled = false
    }
  })
  return vrm
}
