---
inclusion: manual
description: "S3 + CloudFront deployment guide"
keywords: ["deploy", "s3", "cloudfront", "hosting"]
---

# Deployment Guide — S3 + CloudFront

This app is a static SPA built with Vite. It produces a `dist/` folder that can be uploaded directly to an S3 bucket and served via CloudFront.

## 1. Build

Set the required environment variables before building:

```bash
export VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com
export VITE_API_KEY=your-api-key

npm run build
```

This produces the `dist/` folder containing `index.html`, hashed JS/CSS bundles in `assets/`, and any files from `public/`.

## 2. Upload to S3

Sync the `dist/` folder to your S3 bucket:

```bash
aws s3 sync dist/ s3://YOUR_BUCKET_NAME --delete
```

## 3. CloudFront Configuration

### Client-Side Routing (Required)

Because this is a single-page app with client-side routing, CloudFront must serve `index.html` for any path that doesn't match a static file. Without this, navigating directly to routes like `/tenders` or `/runs/source/2025-01-01` will return a 403 or 404 from S3.

Configure custom error responses in your CloudFront distribution:

| HTTP Error Code | Response Page Path | HTTP Response Code |
|-----------------|--------------------|--------------------|
| 403             | `/index.html`      | 200                |
| 404             | `/index.html`      | 200                |

#### Via AWS Console

1. Open your CloudFront distribution
2. Go to the **Error pages** tab
3. Click **Create custom error response**
4. For HTTP error code **403**: set response page path to `/index.html` and response code to **200**
5. Repeat for HTTP error code **404**

#### Via AWS CLI

```bash
aws cloudfront update-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --custom-error-responses '{
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      }
    ]
  }'
```

### Cache Invalidation

After deploying a new build, invalidate the CloudFront cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

Asset files in `assets/` have content hashes in their filenames, so they are safe to cache indefinitely. Only `index.html` needs invalidation on each deploy.

## 4. HTTPS

CloudFront serves content over HTTPS by default. No additional configuration is needed for HTTPS support beyond the standard CloudFront distribution setup. To use a custom domain, attach an ACM certificate to the distribution.
