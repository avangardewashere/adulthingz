// Removes the thumbnail picture from a VRM 0.x file to make it smaller.
// The thumbnail is only shown by avatar-picker apps; adulthingz never uses it.
//
//   node scripts/strip-vrm-thumbnail.mjs in.vrm out.vrm
//
// A .vrm is a .glb (binary glTF): a 12-byte header, a JSON chunk that describes the
// model, then a binary chunk with the mesh data and pictures. This only works when the
// thumbnail is the last picture, the last texture and the last bytes of the binary
// chunk (true for VRoid exports). Anything else is refused rather than guessed at.
import { readFileSync, writeFileSync } from 'node:fs'

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.error('usage: node scripts/strip-vrm-thumbnail.mjs in.vrm out.vrm')
  process.exit(1)
}

const file = readFileSync(input)
if (file.toString('ascii', 0, 4) !== 'glTF') throw new Error('Not a .glb/.vrm file')
const jsonLength = file.readUInt32LE(12)
const json = JSON.parse(file.toString('utf8', 20, 20 + jsonLength))
const binStart = 20 + jsonLength + 8
const bin = file.subarray(binStart, binStart + file.readUInt32LE(20 + jsonLength))

const meta = json.extensions?.VRM?.meta
if (!meta || typeof meta.texture !== 'number') throw new Error('No VRM 0.x thumbnail found')

const textureIndex = meta.texture
const imageIndex = json.textures[textureIndex].source
const viewIndex = json.images[imageIndex].bufferView
const view = json.bufferViews[viewIndex]

const isLast = (list, i) => i === list.length - 1
if (!isLast(json.textures, textureIndex) || !isLast(json.images, imageIndex) || !isLast(json.bufferViews, viewIndex)) {
  throw new Error('Thumbnail is not the last texture/image/bufferView; refusing to rewrite')
}
if ((view.byteOffset ?? 0) + view.byteLength !== json.buffers[0].byteLength) {
  throw new Error('Thumbnail bytes are not at the end of the buffer; refusing to rewrite')
}
const text = JSON.stringify(json)
const stillUsed = text.split(`"index":${textureIndex}`).length > 1 ||
  Object.values(json.extensions.VRM.materialProperties ?? {}).some((m) =>
    Object.values(m.textureProperties ?? {}).includes(textureIndex))
if (stillUsed) throw new Error('A material still uses the thumbnail texture; refusing to rewrite')

// Drop the three entries and the bytes they point at
json.textures.pop()
json.images.pop()
json.bufferViews.pop()
delete meta.texture
const newBinLength = view.byteOffset ?? 0
json.buffers[0].byteLength = newBinLength

// Chunks must be 4-byte aligned: JSON pads with spaces, binary with zeros
const pad = (n) => (4 - (n % 4)) % 4
const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8')
const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(pad(jsonBytes.length), 0x20)])
const binChunk = Buffer.concat([bin.subarray(0, newBinLength), Buffer.alloc(pad(newBinLength), 0)])

const header = Buffer.alloc(12)
header.write('glTF', 0, 'ascii')
header.writeUInt32LE(2, 4)
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8)
const chunkHeader = (length, type) => {
  const h = Buffer.alloc(8)
  h.writeUInt32LE(length, 0)
  h.write(type, 4, 'ascii')
  return h
}

writeFileSync(output, Buffer.concat([header, chunkHeader(jsonChunk.length, 'JSON'), jsonChunk, chunkHeader(binChunk.length, 'BIN\0'), binChunk]))
const mb = (n) => (n / 1024 / 1024).toFixed(1)
console.log(`${input}: ${mb(file.length)} MB → ${output}: ${mb(12 + 16 + jsonChunk.length + binChunk.length)} MB`)
