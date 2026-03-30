import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  endpoint: string
  publicUrl: string | null
}

export class R2ConfigurationError extends Error {
  code: 'MISSING_ENV' | 'INVALID_ACCOUNT_ID' | 'INVALID_PUBLIC_URL'
  details?: Record<string, unknown>

  constructor(
    message: string,
    code: 'MISSING_ENV' | 'INVALID_ACCOUNT_ID' | 'INVALID_PUBLIC_URL',
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'R2ConfigurationError'
    this.code = code
    this.details = details
  }
}

let cachedConfig: R2Config | null = null
let cachedClient: S3Client | null = null

function trimEnv(value: string | undefined): string {
  return (value || '').trim()
}

function normalizeAccountId(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return ''

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      const hostPrefix = parsed.hostname.split('.r2.cloudflarestorage.com')[0]
      return hostPrefix || parsed.hostname.split('.')[0] || ''
    } catch {
      return ''
    }
  }

  if (trimmed.includes('.r2.cloudflarestorage.com')) {
    return trimmed.split('.r2.cloudflarestorage.com')[0]
  }

  return trimmed
}

function resolveR2Config(): R2Config {
  if (cachedConfig) return cachedConfig

  const accountId = normalizeAccountId(trimEnv(process.env.R2_ACCOUNT_ID))
  const accessKeyId = trimEnv(process.env.R2_ACCESS_KEY_ID)
  const secretAccessKey = trimEnv(process.env.R2_SECRET_ACCESS_KEY)
  const bucketName = trimEnv(process.env.R2_BUCKET_NAME)
  const publicUrlRaw = trimEnv(process.env.R2_PUBLIC_URL)

  const missing: string[] = []
  if (!accountId) missing.push('R2_ACCOUNT_ID')
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID')
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY')
  if (!bucketName) missing.push('R2_BUCKET_NAME')

  if (missing.length > 0) {
    throw new R2ConfigurationError('Missing required R2 environment variables', 'MISSING_ENV', { missing })
  }

  if (!/^[a-zA-Z0-9-]+$/.test(accountId)) {
    throw new R2ConfigurationError('R2_ACCOUNT_ID is invalid; expected account identifier only', 'INVALID_ACCOUNT_ID', {
      accountIdPreview: accountId.slice(0, 12),
    })
  }

  let publicUrl: string | null = null
  if (publicUrlRaw) {
    try {
      const parsed = new URL(publicUrlRaw)
      publicUrl = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '')
    } catch {
      throw new R2ConfigurationError('R2_PUBLIC_URL must be a valid URL', 'INVALID_PUBLIC_URL')
    }
  }

  cachedConfig = {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    publicUrl,
  }

  return cachedConfig
}

function getS3Client(): S3Client {
  if (cachedClient) return cachedClient

  const config = resolveR2Config()

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  return cachedClient
}

export function getR2Diagnostics() {
  try {
    const config = resolveR2Config()
    return {
      configured: true,
      endpoint: config.endpoint,
      bucketName: config.bucketName,
      hasPublicUrl: Boolean(config.publicUrl),
      publicUrl: config.publicUrl,
    }
  } catch (error) {
    if (error instanceof R2ConfigurationError) {
      return {
        configured: false,
        code: error.code,
        details: error.details,
      }
    }
    return {
      configured: false,
      code: 'UNKNOWN',
    }
  }
}

export interface UploadedFile {
  name: string
  url: string
  key: string
  type: string
  size: number
}

export async function uploadToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'messages'
): Promise<UploadedFile> {
  const config = resolveR2Config()
  const s3Client = getS3Client()
  const key = `${folder}/${Date.now()}-${fileName}`

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: file,
    ContentType: contentType,
  })

  await s3Client.send(command)

  const url = config.publicUrl
    ? `${config.publicUrl}/${key}`
    : `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${key}`

  return {
    name: fileName,
    url,
    key,
    type: contentType,
    size: file.length,
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  const config = resolveR2Config()
  const s3Client = getS3Client()
  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  await s3Client.send(command)
}

export function getR2PublicUrl(key: string): string {
  const config = resolveR2Config()

  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`
  }
  return `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${key}`
}

export function extractR2KeyFromUrl(url: string): string | null {
  if (!url) return null

  try {
    const config = resolveR2Config()
    const parsed = new URL(url)
    const pathnameKey = parsed.pathname.replace(/^\/+/, '')

    if (config.publicUrl) {
      const publicBase = new URL(config.publicUrl)
      if (parsed.origin === publicBase.origin) {
        const basePath = publicBase.pathname.replace(/\/$/, '')
        if (basePath && pathnameKey.startsWith(basePath.replace(/^\/+/, '') + '/')) {
          return pathnameKey.slice(basePath.replace(/^\/+/, '').length + 1)
        }
        return pathnameKey || null
      }
    }

    const r2Host = `${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com`
    if (parsed.host === r2Host) {
      return pathnameKey || null
    }
  } catch {
    return null
  }

  return null
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const config = resolveR2Config()
  const s3Client = getS3Client()
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

export function isValidFileType(fileType: string): boolean {
  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const validDocumentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]
  
  return validImageTypes.includes(fileType) || validDocumentTypes.includes(fileType)
}

export function isValidFileSize(size: number, maxSizeMB: number = 15): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return size <= maxSizeBytes
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

export function isImageFile(fileType: string): boolean {
  return fileType.startsWith('image/')
}
