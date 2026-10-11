# Note-Sphere

Next.js note app with MongoDB metadata and Cloudflare R2 file storage.

## Run locally

Copy .env.example to .env.local, set the values, then run:

    npm ci
    npm run dev

Set AUTH_SECRET once and keep it the same across deployments. Generate it with:

    openssl rand -base64 32

## R2 setup

1. Create two R2 **Standard** buckets. Keep R2_NOTES_BUCKET private. Connect R2_AVATARS_BUCKET to a public custom domain, and set R2_AVATARS_PUBLIC_URL to that domain. Never make the notes bucket public.
2. Create an R2 API token with object read/write permission for both buckets. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY on the app host. The existing AWS S3 environment variables are no longer used.
3. Configure the private notes bucket CORS policy for the deployed app origin. Add localhost as another origin when developing locally:

       [
         {
           "AllowedOrigins": ["https://your-app.example.com", "http://localhost:3000"],
           "AllowedMethods": ["GET", "HEAD", "PUT"],
           "AllowedHeaders": ["Content-Type", "Range"],
           "ExposeHeaders": ["Accept-Ranges", "Content-Range", "Content-Length", "ETag"],
           "MaxAgeSeconds": 3600
         }
       ]

4. Configure the public avatars bucket CORS policy for direct browser uploads:

       [
         {
           "AllowedOrigins": ["https://your-app.example.com", "http://localhost:3000"],
           "AllowedMethods": ["PUT"],
           "AllowedHeaders": ["Content-Type"],
           "ExposeHeaders": ["ETag"],
           "MaxAgeSeconds": 3600
         }
       ]

Use the exact production origin, including scheme. R2 presigned URLs use the R2 S3 API endpoint, not the avatar custom domain. Keep the API token on the server; the browser only receives short-lived, object-specific PUT URLs.

The app signs a PUT URL, uploads the PDF or avatar directly from the browser, verifies the object with HEAD, and then saves its MongoDB metadata. This avoids sending a 50 MB PDF through a Next.js function. Private PDF reads still use one-hour signed GET URLs and HTTP byte ranges, so the viewer can fetch only the needed pages. Browser-side PDF caching remains enabled.

## Existing S3 data

Before switching production traffic, copy all existing PDF objects from the old S3 bucket to R2_NOTES_BUCKET with the **same object keys**. Cloudflare's [Super Slurper](https://developers.cloudflare.com/r2/data-migration/super-slurper/) can copy an S3 bucket to R2. The MongoDB field named s3Key is retained for compatibility; it now holds an R2 key.

Copy old avatar objects (keys starting with avatars/) to R2_AVATARS_BUCKET. Existing MongoDB user.image values point to S3 URLs, so run `node scripts/migrate-avatar-urls.mjs` to preview URL changes, then `node scripts/migrate-avatar-urls.mjs --apply` after copying and checking the objects. New avatar uploads use immutable R2 URLs. Confirm several existing PDFs and avatars load, including a shared PDF link, before removing S3 access.

## Deployment checks

- Upload a PDF near 50 MB and a 5 MB avatar.
- Open a PDF and verify the browser receives 206 Partial Content with Content-Range; confirm a second open uses the local PDF cache.
- Open individual and collection share links, including the Download action.
- Delete a note and an account, then verify their R2 objects are gone.
- Monitor R2 storage and operation usage against the monthly free allowance.
