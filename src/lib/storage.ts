import { randomUUID } from 'crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

/**
 * How long a generated download link stays valid.
 *
 * Only has to outlive Meta's own fetch of the URL, which happens within seconds
 * of the send call. Kept short so a link leaking out of a log is close to
 * worthless.
 */
const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

let clientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!clientInstance) {
    clientInstance = new S3Client({
      region: env.AWS_S3_REGION || 'ap-southeast-1',
    });
  }
  return clientInstance;
}

function requireBucket(): string {
  const bucket = env.S3_BUCKET_DOCUMENTS;
  if (!bucket) {
    throw new Error('S3_BUCKET_DOCUMENTS is not configured — cannot store documents.');
  }
  return bucket;
}

/**
 * Best-effort file extension from a MIME type.
 *
 * Only used to make keys readable in the console; nothing reads the extension
 * back, so an unknown type falling through to "bin" is harmless.
 */
export function extensionForMimeType(mimeType: string): string {
  const known: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    // iPhone's default camera format. Common enough here that falling through
    // to "bin" would mislabel a large share of real uploads.
    'image/heic': 'heic',
    'image/heif': 'heif',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'text/csv': 'csv',
  };

  return known[mimeType.toLowerCase().split(';')[0].trim()] || 'bin';
}

/**
 * Key layout is `documents/{userId}/{uuid}.{ext}`.
 *
 * Namespacing by user means a future per-user IAM condition or a bulk delete on
 * account removal is a prefix operation, and the UUID means two uploads of the
 * same file never collide.
 */
export function buildDocumentKey(userId: string, mimeType: string): string {
  return `documents/${userId}/${randomUUID()}.${extensionForMimeType(mimeType)}`;
}

export interface StoredDocument {
  s3Key: string;
  sizeBytes: number;
}

export async function putDocument(params: {
  userId: string;
  body: Buffer;
  mimeType: string;
}): Promise<StoredDocument> {
  const bucket = requireBucket();
  const s3Key = buildDocumentKey(params.userId, params.mimeType);

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: params.body,
      ContentType: params.mimeType,
    })
  );

  return { s3Key, sizeBytes: params.body.byteLength };
}

/** Time-limited download URL, fetchable by Meta without credentials. */
export function getDocumentUrl(s3Key: string): Promise<string> {
  const bucket = requireBucket();

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: bucket, Key: s3Key }),
    { expiresIn: PRESIGNED_URL_TTL_SECONDS }
  );
}

export async function deleteDocument(s3Key: string): Promise<void> {
  const bucket = requireBucket();

  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
}
