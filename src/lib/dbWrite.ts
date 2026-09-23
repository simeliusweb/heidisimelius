/**
 * Supabase answers an UPDATE or DELETE that RLS filtered out (expired session, missing
 * rights) with success and zero rows. CMS writes call .select() and pass the returned
 * rows here, so that case shows an error instead of "Onnistui!".
 */
export const NO_ROWS_CHANGED_MESSAGE =
  "Muutos ei tallentunut. Kirjaudu uudelleen sisään ja yritä uudestaan.";

export const assertRowsChanged = <T>(rows: T[] | null | undefined, expected = 1): T[] => {
  if (!rows || rows.length < expected) throw new Error(NO_ROWS_CHANGED_MESSAGE);
  return rows;
};
