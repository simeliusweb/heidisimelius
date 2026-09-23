/**
 * POST a contact or booking form to /api/send-email. Any failure (network, non-JSON
 * error page, validation or Brevo error) becomes one Finnish message that tells the
 * visitor where to write instead; the raw server text is never shown.
 */
export const sendFormFailedMessage = (fallbackEmail: string) =>
  `Viestin lähetys epäonnistui. Yritä hetken päästä uudelleen tai lähetä sähköpostia osoitteeseen ${fallbackEmail}.`;

export const sendForm = async (
  payload: Record<string, unknown>,
  fallbackEmail: string
): Promise<void> => {
  let ok = false;
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result: unknown = await response.json().catch(() => null);
    ok =
      response.ok &&
      typeof result === "object" &&
      result !== null &&
      (result as { success?: unknown }).success === true;
  } catch {
    ok = false;
  }
  if (!ok) throw new Error(sendFormFailedMessage(fallbackEmail));
};
