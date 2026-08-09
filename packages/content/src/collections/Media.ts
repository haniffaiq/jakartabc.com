import { readFile, stat } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import type { CollectionConfig, File } from 'payload'
import { ValidationError } from 'payload'
import { sanitizeFilename } from 'payload/shared'

import { editorialOnly } from '../access/roles'
import { mediaTags, type CacheTagId } from '../cache/tags'
import { makeRevalidateDeleteHook, makeRevalidateHook } from '../hooks/revalidate'

export const MEDIA_MAX_FILE_SIZE = 5_000_000
export const MEDIA_STORAGE_PREFIX = 'media'

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const
type AllowedMimeType = (typeof allowedMimeTypes)[number]
type IncomingMediaFile = Pick<File, 'data' | 'mimetype' | 'name' | 'size' | 'tempFilePath'> & {
  truncated?: boolean
}
const serverOwnedMediaFields = [
  'filename',
  'mimeType',
  'filesize',
  'prefix',
  'url',
  'thumbnailURL',
  'width',
  'height',
  'sizes',
] as const

type MediaTagDocument = { id?: CacheTagId }

const buildMediaTags = (doc: MediaTagDocument, previousDoc?: MediaTagDocument) =>
  mediaTags({ id: doc.id, previousId: previousDoc?.id, locales: ['en', 'id'] })

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

export function normalizeMediaPrefix(prefix: unknown): typeof MEDIA_STORAGE_PREFIX {
  if (prefix === undefined || prefix === null || prefix === '') return MEDIA_STORAGE_PREFIX
  if (prefix !== MEDIA_STORAGE_PREFIX) {
    throw new Error(`Media prefix must be exactly "${MEDIA_STORAGE_PREFIX}".`)
  }
  return MEDIA_STORAGE_PREFIX
}

export function validateMediaFilename(filename: unknown) {
  if (typeof filename !== 'string' || filename.length === 0) {
    throw new Error('Media filename must be a non-empty string.')
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(filename)
  } catch {
    throw new Error('Media filename contains invalid percent encoding.')
  }

  // Reject raw, once-decoded, and still-encoded path/control syntax so the
  // public URL and storage-s3 key can never normalize to different objects.
  // eslint-disable-next-line no-control-regex
  const hasUnsafeCharacters = (value: string) => /[\\/\x00-\x1f\x80-\x9f]/.test(value)
  if (
    hasUnsafeCharacters(filename) ||
    hasUnsafeCharacters(decoded) ||
    decoded === '.' ||
    decoded === '..' ||
    /%[0-9a-f]{2}/i.test(decoded)
  ) {
    throw new Error('Media filename contains unsafe path or control characters.')
  }

  let sanitized: string
  try {
    sanitized = sanitizeFilename(filename)
  } catch {
    throw new Error('Media filename is invalid.')
  }
  if (sanitized !== filename) {
    throw new Error('Media filename is not canonical.')
  }
  return filename
}

export function getMediaStoragePath(prefix: unknown, filename: unknown) {
  return {
    filename: validateMediaFilename(filename),
    prefix: normalizeMediaPrefix(prefix),
  }
}

export function validateMediaFile(file?: IncomingMediaFile) {
  if (!file) return

  if (file.truncated) {
    throw new Error('Media upload was truncated and cannot be accepted.')
  }
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

async function validateIncomingMediaFile(file?: IncomingMediaFile) {
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
  if (operation !== 'create' && operation !== 'update') return args

  const operationArgs = args as typeof args & { data?: Record<string, unknown> }
  const incomingData = operationArgs.data ?? {}
  let prefix: typeof MEDIA_STORAGE_PREFIX

  try {
    prefix = normalizeMediaPrefix(incomingData.prefix)
  } catch (error) {
    throw new ValidationError({
      errors: [
        {
          message: error instanceof Error ? error.message : 'Media prefix validation failed.',
          path: 'prefix',
        },
      ],
      req,
    })
  }

  const incomingFilename = req.file?.name ?? incomingData.filename
  if (incomingFilename !== undefined && incomingFilename !== null) {
    try {
      validateMediaFilename(incomingFilename)
    } catch (error) {
      throw new ValidationError({
        errors: [
          {
            message: error instanceof Error ? error.message : 'Media filename validation failed.',
            path: 'file',
          },
        ],
        req,
      })
    }
  }

  try {
    await validateIncomingMediaFile(req.file as IncomingMediaFile | undefined)
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

  return { ...operationArgs, data: { ...incomingData, prefix } }
}

function preventNoFileMediaIdentityChanges({
  data,
  operation,
  originalDoc,
  req,
}: Parameters<NonNullable<NonNullable<CollectionConfig['hooks']>['beforeChange']>[number]>[0]) {
  if (operation !== 'update' || req.file) return data

  const incomingData = data as Record<string, unknown>
  const persistedData = originalDoc as Record<string, unknown>
  const changedFields = serverOwnedMediaFields.filter(
    (field) =>
      Object.prototype.hasOwnProperty.call(incomingData, field) &&
      !isDeepStrictEqual(incomingData[field], persistedData[field]),
  )

  if (changedFields.length > 0) {
    throw new ValidationError({
      errors: changedFields.map((field) => ({
        message: `${field} can only change when a replacement media file is uploaded.`,
        path: field,
      })),
      req,
    })
  }

  return data
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
    afterChange: [makeRevalidateHook<MediaTagDocument>(buildMediaTags)],
    afterDelete: [makeRevalidateDeleteHook<MediaTagDocument>((doc) => buildMediaTags(doc))],
    beforeChange: [preventNoFileMediaIdentityChanges],
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
