# TheWedding

Interactive wedding invitation built with React and Vite.

## Development

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

## Edit content

Most invitation content lives in:

- `src/data.js`

## Environment variables

Set these in your Vercel project (Settings → Environment Variables):

- `RSVP_DB_DATABASE_URL` (or `DATABASE_URL`) — Neon Postgres connection string.
- `ADMIN_SESSION_SECRET` — secret used to sign admin session tokens.
- `ADMIN_ACCOUNTS_JSON` or `ADMIN_USERNAME`/`ADMIN_PASSWORD` — admin login credentials.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME` — used by the guest photo gallery (`/photos`) for direct-to-S3 uploads.

### S3 bucket setup for the photo gallery

The `/photos` page has guests upload directly to S3 using short-lived presigned URLs, then displays uploads in one shared gallery. To enable it:

1. Create an S3 bucket (any name/region — set `S3_BUCKET_NAME`/`AWS_REGION` to match).
2. Add a bucket policy allowing public read on the `gallery/*` prefix, e.g.:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGalleryPhotos",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/gallery/*"
       }
     ]
   }
   ```
3. Add a CORS configuration allowing browser PUT uploads from your site's origin(s):
   ```json
   [
     {
       "AllowedOrigins": ["https://your-site.vercel.app"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```
4. Create an IAM user (or role) with `s3:PutObject`, `s3:DeleteObject` permissions scoped to the bucket, and use its access key for `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`.

## Deploy to Vercel

1. Push this project to GitHub, GitLab, or Bitbucket.
2. Import the repo into Vercel.
3. Vercel should detect `Vite` automatically.
4. Build command: `npm run build`
5. Output directory: `dist`

You can also deploy from the terminal with:

```bash
npx vercel
```
