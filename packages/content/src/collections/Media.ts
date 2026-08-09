import { readFile, stat } from 'node:fs/promises'
import type { CollectionConfig, File } from 'payload'
import { ValidationError } from 'payload'

import { editorialOnly } from '../access/roles'

export const MEDIA_MAX_FILE_SIZE = 5_000_000

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const
type AllowedMimeType = (typeof allowedMimeTypes)[number]

function hasPrefix(data: Buffer, signature: readonly number[]) {
  return signature.every((byte, index) => data[index] === byte)
}

export function detectMediaMimeType(data: Buffer): AllowedMimeType | undefined {
  if (hasPrefix(data, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (hasPrefix(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString('ascii') === 'RIFF' &&
    data.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }

  return undefined
}

export function validateMediaFile(file?: Pick<File, 'data' | 'mimetype' | 'name' | 'size'>) {
  if (!file) return

  if (!allowedMimeTypes.includes(file.mimetype as AllowedMimeType)) {
    throw new Error(`Media MIME type ${file.mimetype} is not allowed.`)
  }
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MEDIA_MAX_FILE_SIZE) {
    throw new Error(
      `Media files must not exceed ${MEDIA_MAX_FILE_SIZE.toLocaleString('en-US')} bytes.`,
    )
  }
  if (file.data.length !== file.size) {
    throw new Error('Media file size does not match its buffered content length.')
  }

  const detectedMimeType = detectMediaMimeType(file.data)
  if (detectedMimeType !== file.mimetype) {
    throw new Error('Media file signature does not match its declared MIME type.')
  }
}

async function validateIncomingMediaFile(file?: File) {
  if (!file) return

  if (!file.tempFilePath) {
    validateMediaFile(file)
    return
  }

  const fileStat = await stat(file.tempFilePath)
  if (fileStat.size !== file.size) {
    throw new Error('Media file size does not match its temporary file length.')
  }
  if (fileStat.size > MEDIA_MAX_FILE_SIZE) {
    throw new Error(
      `Media files must not exceed ${MEDIA_MAX_FILE_SIZE.toLocaleString('en-US')} bytes.`,
    )
  }

  validateMediaFile({ ...file, data: await readFile(file.tempFilePath) })
}

async function validateMediaUploadBeforeOperation({
  args,
  operation,
  req,
}: Parameters<NonNullable<NonNullable<CollectionConfig['hooks']>['beforeOperation']>[number]>[0]) {
  if ((operation !== 'create' && operation !== 'update') || !req.file) return args

  try {
    await validateIncomingMediaFile(req.file)
  } catch (error) {
    throw new ValidationError({
      errors: [
        {
          message: error instanceof Error ? error.message : 'Media upload validation failed.',
          path: 'file',
        },
      ],
      req,
    })
  }

  return args
}

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Editorial' },
  access: {
    create: editorialOnly,
    read: () => true,
    update: editorialOnly,
    delete: editorialOnly,
  },
  hooks: {
    beforeOperation: [validateMediaUploadBeforeOperation],
  },
  upload: {
    staticDir: 'uploads',
    mimeTypes: [...allowedMimeTypes],
    imageSizes: [
      { name: 'thumb', width: 400 },
      { name: 'card', width: 800 },
      { name: 'hero', width: 1600 },
    ],
  },
  fields: [
    { name: 'alt', type: 'text', required: true, localized: true },
    { name: 'caption', type: 'text', localized: true },
  ],
}
