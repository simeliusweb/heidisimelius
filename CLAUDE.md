# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio/website for Heidi Simelius (Finnish singer, songwriter, performer) built with React, TypeScript, Vite, and Supabase. The site is deployed on Vercel and uses Brevo for transactional emails.

## Development Commands

```bash
npm run dev        # Start development server on port 8080
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # Run ESLint
npm run preview    # Preview production build
npm run test:unit  # Vitest unit tests (api/, src/)
npm run test:e2e   # Playwright suite in e2e/ (needs BASE_URL; see docs/supabase-migration-plan.md)
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives)
- **State/Data**: TanStack React Query + Supabase
- **Animations**: GSAP
- **Deployment**: Vercel (with serverless API functions)

### Key Directories
- `src/pages/` - Route pages (HomePage, BioPage, KeikatPage, GalleriaPage, BilebandiPage, AdminPage)
- `src/components/` - React components, including `ui/` for shadcn components
- `src/components/admin/` - Admin panel components for content management
- `src/integrations/supabase/` - Supabase client and auto-generated types
- `src/lib/` - Utilities (`utils.ts` for cn(), YouTube helpers; `storage.ts` for Supabase storage uploads)
- `src/types/` - TypeScript interfaces for content types
- `api/` - Vercel serverless functions (email sending, db keep-alive)

### Routing
Routes are defined in `src/App.tsx`. The admin route (`/admin`) is protected via `ProtectedRoute` component using Supabase auth. All routes use client-side routing via react-router-dom.

### Database Schema (Supabase)
Types are auto-generated in `src/integrations/supabase/types.ts`:
- `gigs` - Events/performances with `gig_type_enum` (Musiikki/Teatteri)
- `videos` - YouTube videos with `video_section_enum` (Musavideot/Muut videot) and ordering
- `photo_sets` - Gallery photo collections with ordering
- `page_content` - JSON content storage for page-specific data (bio, page images)

### Data Fetching Pattern
Use local fetch functions with React Query (not shared utilities):
```typescript
const fetchGigs = async (): Promise<Gig[]> => {
  const { data, error } = await supabase.from("gigs").select("*");
  if (error) throw new Error(error.message);
  return data || [];
};

const { data } = useQuery({ queryKey: ["gigs"], queryFn: fetchGigs });
```

### Type Safety Rules
- Never use `any` - use proper type definitions
- For Supabase JSON content, use `as unknown as TargetType` pattern
- Create separate Insert/Update types using `Omit<BaseType, 'id' | 'created_at'>` for database writes
- Map all database fields explicitly, including optional fields with `field || undefined`

### Storage Buckets
- `gigs-images` - Event/gig images
- `photo_sets_images` - Gallery photos and press kit zips
- `images` - Bio images and page hero images
- `documents` - CV PDF (static path with upsert)

### Environment Variables
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — inlined into the browser bundle at build time (local `.env`, Vercel env per target)
- `BREVO_API_KEY` — runtime only, `api/send-email.ts`
- `CRON_SECRET` — runtime only; `api/keep-db-alive.ts` refuses every call without it

### Backend (Supabase)
The database, storage and auth live in our own Supabase project `neqprqqhiifqemphpwhu` (eu-north-1) in the **simeliusweb** organisation. It replaced Lovable Cloud (`yctdrwogilljanzxcgow`) in September 2026; Lovable is disconnected from the repo, so don't reconnect it or use its AI.

- **Never use this machine's Supabase CLI or Supabase MCP**: they are logged in to another client's account. Use the Management API (`https://api.supabase.com/v1/projects/neqprqqhiifqemphpwhu/...`) with the owner's personal access token.
- Schema changes go in `supabase/migrations/` and are applied through the Management API. The public tables need explicit grants (`20260923120100_grant_data_api_roles.sql`), and CMS writes require the `app_metadata.cms_admin` claim (`20260923120200_cms_admin_claim.sql`), which only the service role can set.
- Migration run book, state and rollback: `docs/supabase-migration-plan.md` (start at §0).

### Path Alias
Use `@/` for imports from `src/` directory (configured in vite.config.ts and tsconfig).

## Important Patterns

### Form Validation
Forms use react-hook-form with zod schemas. When fields are conditionally rendered, validation must also be conditional using `.superRefine()` or similar patterns.

### Drag-and-Drop Ordering
Uses @dnd-kit for sortable items (videos, photos). Maintains `order_index` in database.

### Structured Data
SEO structured data (JSON-LD) for gigs is built in `src/lib/eventStructuredData.ts` (MusicEvent / TheaterEvent by `gig_type`) following Google's Event guidelines — Search Console flags missing `endDate` and `offers` fields. Never emit guessed values such as prices. The `ticket_price` / `duration_minutes` columns exist in the new database, but the CMS fields stay switched off (`GIG_TICKET_FIELDS_ENABLED` in `src/components/admin/gigTicketFieldsSchema.ts`) until the post-go-live horizon (`docs/supabase-migration-plan.md` §16). Define interfaces for complex nested structures rather than using `any`.

### Indexing
Only the routes in `routeMetadata` (`src/config/metadata.ts`) get prebuilt HTML with their own title and canonical; `vercel.json` rewrites just `/admin` and `/login` to the SPA, so any other path returns a real 404 (`dist/404.html`, noindex). A new public route must be added to `routeMetadata`, or it will 404 on a hard load.

### Finnish Language
The site is in Finnish. UI text, labels, and content are in Finnish.
