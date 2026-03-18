# GP Tenders Web App

Read-only internal SPA for browsing scraper operations and reviewing tender results with AI-generated analysis scores.

## Quick Start

```bash
cp .env.example .env
# Fill in VITE_API_BASE_URL and VITE_API_KEY

npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests (single execution) |
| `npm run lint` | Lint with ESLint |

## Tech Stack

- React 19 + TypeScript 5.9
- Vite 8
- Tailwind CSS 4 + shadcn/ui
- TanStack Query v5
- React Router v6

## Project Structure

```
src/
├── api/          # API client, endpoints, types
├── components/   # Shared UI components
│   └── ui/       # shadcn/ui primitives
├── hooks/        # TanStack Query custom hooks
├── layouts/      # App shell / navigation
├── pages/        # Route page components
├── utils/        # Pure utility functions
└── test/         # Test setup
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Scraper REST API base URL |
| `VITE_API_KEY` | API Gateway key (sent as `x-api-key` header) |

## Deployment

Static SPA deployed to S3 + CloudFront. See deployment steering file in `.kiro/steering/` for details.
