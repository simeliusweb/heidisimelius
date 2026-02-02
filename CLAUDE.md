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
Required in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `BREVO_API_KEY` (for Vercel serverless functions)

### Path Alias
Use `@/` for imports from `src/` directory (configured in vite.config.ts and tsconfig).

## Important Patterns

### Form Validation
Forms use react-hook-form with zod schemas. When fields are conditionally rendered, validation must also be conditional using `.superRefine()` or similar patterns.

### Drag-and-Drop Ordering
Uses @dnd-kit for sortable items (videos, photos). Maintains `order_index` in database.

### Structured Data
SEO structured data (JSON-LD) is generated for events using proper MusicEvent schema. Define interfaces for complex nested structures rather than using `any`.

### Finnish Language
The site is in Finnish. UI text, labels, and content are in Finnish.
