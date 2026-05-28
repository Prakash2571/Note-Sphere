/**
 * lib/s3.ts
 * AWS S3 utility functions for uploading, deleting, and generating
 * pre-signed URLs for PDF files.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize the S3 client with credentials from environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

/**
 * Upload a PDF buffer to S3.
 * @param key       - The S3 object key (e.g. "notes/userId/filename.pdf")
 * @param body      - The file buffer or stream
 * @param mimeType  - The content type (default: "application/pdf")
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  mimeType = "application/pdf"
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: mimeType,
    })
  );

  // Return the permanent S3 URL (bucket must have proper access policy)
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Generate a short-lived pre-signed URL for viewing a PDF.
 * URL expires after 1 hour (3600 seconds).
 * @param key - The S3 object key
 */
export async function getPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Delete a PDF from S3 by its key.
 * @param key - The S3 object key
 */
export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}
