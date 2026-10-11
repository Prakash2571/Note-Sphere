import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type BucketKind = "notes" | "avatars";

let client: S3Client | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(name + " is not configured");
  return value;
}

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: "https://" + required("R2_ACCOUNT_ID") + ".r2.cloudflarestorage.com",
      forcePathStyle: true,
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

function bucket(kind: BucketKind): string {
  return required(kind === "notes" ? "R2_NOTES_BUCKET" : "R2_AVATARS_BUCKET");
}

export async function getUploadUrl(
  kind: BucketKind,
  key: string,
  contentType: string
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: bucket(kind),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 600 }
  );
}

export async function getObjectInfo(kind: BucketKind, key: string) {
  return getClient().send(new HeadObjectCommand({ Bucket: bucket(kind), Key: key }));
}

export async function deleteObject(kind: BucketKind, key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(kind), Key: key }));
}

export async function getPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket("notes"), Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: 3600 });
}

export function avatarPublicUrl(key: string): string {
  const base = required("R2_AVATARS_PUBLIC_URL").replace(/\/+$/, "");
  return base + "/" + key;
}

export function ownedAvatarKey(url: string | undefined, userId: string): string | null {
  if (!url) return null;
  const base = required("R2_AVATARS_PUBLIC_URL").replace(/\/+$/, "");
  const prefix = base + "/avatars/" + userId + "/";
  return url.startsWith(prefix) ? url.slice(base.length + 1).split("?")[0] : null;
}

