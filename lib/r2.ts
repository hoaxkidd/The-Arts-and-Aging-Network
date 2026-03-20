import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

export interface UploadedFile {
  name: string
  url: string
  key: string
  type: string
  size: number
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
})

export async function uploadToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'messages'
): Promise<UploadedFile> {
  const key = `${folder}/${Date.now()}-${fileName}`

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  })

  await s3Client.send(command)

  const url = R2_PUBLIC_URL 
    ? `${R2_PUBLIC_URL}/${key}`
    : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`

  return {
    name: fileName,
    url,
    key,
    type: contentType,
    size: file.length,
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
}

export function getR2PublicUrl(key: string): string {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`
  }
  return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
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
