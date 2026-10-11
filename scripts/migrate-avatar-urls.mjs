// One-time migration after copying old S3 avatar objects to R2 with identical keys.
// Dry run by default. Pass --apply after reviewing the output.
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

loadEnvConfig(process.cwd());

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(name + " is not configured");
  return value;
};

const publicBase = required("R2_AVATARS_PUBLIC_URL").replace(/\/+$/, "");
const bucket = required("R2_AVATARS_BUCKET");
const r2 = new S3Client({
  region: "auto",
  endpoint: "https://" + required("R2_ACCOUNT_ID") + ".r2.cloudflarestorage.com",
  forcePathStyle: true,
  credentials: {
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  },
});

await mongoose.connect(required("MONGODB_URI"));
try {
  const users = mongoose.connection.db.collection("users");
  const cursor = users.find({ image: { $type: "string" } }, { projection: { image: 1 } });
  let found = 0;
  let updated = 0;
  let missing = 0;

  for await (const user of cursor) {
    let url;
    try {
      url = new URL(user.image);
    } catch {
      continue;
    }
    if (!url.hostname.endsWith(".amazonaws.com")) continue;
    const key = url.pathname.replace(/^\/+/, "");
    const userId = user._id.toString();
    if (!new RegExp("^avatars/" + userId + "\\.(jpeg|png|webp|gif)$", "i").test(key)) continue;
    found++;

    try {
      await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      console.error("Missing R2 avatar:", key);
      missing++;
      continue;
    }

    const replacement = publicBase + "/" + key;
    console.log(userId + ": " + user.image + " -> " + replacement);
    if (process.argv.includes("--apply")) {
      const result = await users.updateOne(
        { _id: user._id, image: user.image },
        { $set: { image: replacement } }
      );
      updated += result.modifiedCount;
    }
  }

  console.log({ found, updated, missing, mode: process.argv.includes("--apply") ? "apply" : "dry-run" });
  if (missing > 0) process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
