This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment Variables

Copy the example file and fill in your values before running the app:

```bash
cp .env.example .env.local
```

The following variables are required:

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Stable secret used by Auth.js v5 to sign/encrypt session JWTs. |
| `AUTH_URL` | Base URL of the app, used to build share links (e.g. `http://localhost:3000`). |
| `AUTH_GOOGLE_ID` | Google OAuth client id. |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret. |
| `MONGODB_URI` | MongoDB connection string. |
| `AWS_REGION` | AWS region for the S3 bucket. |
| `AWS_ACCESS_KEY_ID` | AWS access key id for S3. |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key for S3. |
| `AWS_S3_BUCKET_NAME` | S3 bucket that stores uploaded PDFs. |
| `GEMINI_API_KEY` | Google Gemini API key for AI summaries. |

> **Important — keep `AUTH_SECRET` stable.** `AUTH_SECRET` **must** be set to the
> same stable value in every environment (development, preview, and production).
> Auth.js v5 uses it to sign session JWTs. If it is missing or changes between
> deploys or serverless cold starts, existing tokens are re-signed with a
> different secret and invalidated early — logging users out well before the
> intended 2-day session window. Set it once (e.g. `openssl rand -base64 32`)
> and reuse the same value across redeploys.

## AWS S3 CORS (required for fast PDF loading)

The PDF viewer uses HTTP Range requests so only the bytes for the current page are
fetched instead of the whole file. For the browser to use Range requests against a
presigned S3 URL cross-origin, the bucket CORS configuration **must** expose the
range-related response headers. Without `ExposeHeaders`, the browser cannot read
`Accept-Ranges` / `Content-Range` and pdf.js falls back to downloading the entire
file (the viewer still works, but the speed-up does not apply).

Example bucket CORS configuration:

```json
[
  {
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["https://your-app-origin.example.com"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["Accept-Ranges", "Content-Range", "Content-Length", "ETag"]
  }
]
```

Replace `AllowedOrigins` with your deployed app origin (use `http://localhost:3000`
for local development).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
