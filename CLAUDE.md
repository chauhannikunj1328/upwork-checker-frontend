# Project: Upwork Proposal Checker — Frontend

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + ShadCN UI components
- axios for API calls
- react-hook-form + zod v3 for forms (must stay on v3 — @hookform/resolvers is incompatible with zod v4)
- sonner for toasts

## Conventions
- All API calls go through lib/api.ts (axios instance)
- Auth token stored in localStorage under key `auth_token`
- Use ShadCN components — never write custom buttons/inputs from scratch
- Server components by default; "use client" only when needed
- Tailwind utility classes only — no custom CSS files
- Backend runs at http://localhost:8000 (set in NEXT_PUBLIC_API_URL)

## File ownership
- src/app/* — pages and routes only
- src/lib/api.ts — axios instance
- src/lib/auth.ts — auth helpers (login, logout, getUser)
- src/components/ui/* — ShadCN components, do not modify
- src/components/* — custom shared components

## Don't do
- Don't add new dependencies without telling me first
- Don't add features I didn't ask for
- Don't write tests unless I ask
- Don't refactor unrelated code