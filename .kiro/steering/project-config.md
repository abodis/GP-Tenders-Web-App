---
inclusion: always
description: "Project-specific configuration"
keywords: ["config", "aws", "project"]
---

# Project Configuration

## AWS

- **Profile**: mcp
- **Region**: eu-south-2
- **Hosting**: S3 + CloudFront (static SPA)

## Environment Variables

- `VITE_API_BASE_URL` — Scraper REST API base URL
- `VITE_API_KEY` — API Gateway key sent as `x-api-key` header

## API

- Base URL: configured via env var (see `.env.example`)
- Auth: API key embedded at build time, sent as `x-api-key` header on every request
- Pagination: cursor-based with opaque `next_cursor` tokens

## Build & Deploy

- Build: `npm run build` (tsc + vite build)
- Dev: `npm run dev`
- Test: `npm run test` (vitest --run)
- Lint: `npm run lint`
- Output: `dist/` directory, deployed to S3
