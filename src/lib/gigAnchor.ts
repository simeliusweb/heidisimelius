import type { Gig } from "@/components/admin/GigsManager";

/**
 * Anchor id for a gig group on /keikat, shared by the home page cards that link to it.
 * Readable slug of the title (ä/ö/å folded to a/o/a) plus the start of the group id, so
 * two groups with the same title still get different ids.
 */
export const gigAnchorId = (gig: Pick<Gig, "id" | "title" | "gig_group_id">) => {
  const slug = gig.title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = (gig.gig_group_id || gig.id).replace(/-/g, "").slice(0, 8);
  return slug ? `${slug}-${suffix}` : `keikka-${suffix}`;
};
