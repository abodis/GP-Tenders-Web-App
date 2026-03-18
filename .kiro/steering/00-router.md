---
inclusion: always
description: "Index and router for steering files"
keywords: ["router", "index", "steering"]
---

# Steering File Router

## Available Steering Files

### Always Loaded
- **00-router.md** (this file)
- **01-common.md** - Project conventions and tech stack
- **project-config.md** - AWS profile, region, project settings
- **company-profile.md** - Green Partners company profile, focus areas, preferred regions, and UX implications for tender evaluation

### Manual (load via #deployment in chat)
- **deployment.md** - S3 + CloudFront deployment guide

### Frontend (auto-loaded by file pattern)
- **frontend/react-patterns.md** - React component and hook patterns
- **frontend/testing-patterns.md** - Vitest, fast-check, and testing-library patterns

## Compound Engineering Workflow

```
Brainstorm → Plan → Work → Review → Reflect
    ↑                                   │
    └───────────────────────────────────┘
```

**80% planning and review, 20% execution.**
