// apps/file-service/src/config/s3.ts

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './index';

export const s3 = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId:     config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
  // MinIO local override
  ...(config.S3_ENDPOINT && {
    endpoint:       config.S3_ENDPOINT,
    forcePathStyle: true,
  }),
});

// ── Key builders — all scoped by userId ──────────────────────────
export const s3Keys = {
  original:  (userId: string, fileId: string, filename: string) =>
    `originals/${userId}/${fileId}/${filename}`,
  thumbnail: (userId: string, fileId: string) =>
    `thumbnails/${userId}/${fileId}/thumb_200.jpg`,
  preview:   (userId: string, fileId: string, ext = 'jpg') =>
    `previews/${userId}/${fileId}/preview.${ext}`,
};

// ── Presigned PUT — client uploads direct to S3 ──────────────────
export async function createPresignedPutUrl(
  key: string,
  mimeType: string,
  expiresIn = config.S3_PRESIGN_EXPIRY_SECONDS,
): Promise<string> {
  return getSignedUrl(s3, new PutObjectCommand({
    Bucket:      config.S3_BUCKET_NAME,
    Key:         key,
    ContentType: mimeType,
  }), { expiresIn });
}

// ── Presigned GET — private file download ────────────────────────
export async function createPresignedGetUrl(
  key: string,
  expiresIn = 300,
): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: config.S3_BUCKET_NAME,
    Key:    key,
  }), { expiresIn });
}

export async function deleteS3Object(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({
    Bucket: config.S3_BUCKET_NAME,
    Key:    key,
  }));
}

export async function s3ObjectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: config.S3_BUCKET_NAME, Key: key }));
    return true;
  } catch { return false; }
}

// ── CDN URL — CloudFront in prod, MinIO in dev ───────────────────
export function getCdnUrl(key: string): string {
  if (config.CLOUDFRONT_DOMAIN) return `https://${config.CLOUDFRONT_DOMAIN}/${key}`;
  if (config.S3_ENDPOINT) return `${config.S3_ENDPOINT}/${config.S3_BUCKET_NAME}/${key}`;
  return `https://${config.S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;
}