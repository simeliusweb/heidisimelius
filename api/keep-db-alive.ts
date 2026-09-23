import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Called by the Vercel cron in vercel.json once a day so the free-tier Supabase
 * project never sits idle long enough to be paused (7 days without activity). Daily,
 * because a single missed run on a 5-day schedule could leave a gap of up to 10 days.
 *
 * A single cheap REST read counts as activity. It uses the same public URL + key the
 * site itself uses, so no service-role secret is needed here.
 *
 * This lived in src/pages/api/ from Oct 2025 until Sep 2026, where Vercel never deployed
 * it — the cron was hitting a 404 the whole time.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel sends this header on cron invocations when CRON_SECRET is set on the project.
  // Fail closed: without a configured secret nobody may call this.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not set.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/gigs?select=id&limit=1`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });

    if (!response.ok) {
      throw new Error(`Supabase responded ${response.status}`);
    }

    const message = `Pinged Supabase at ${new Date().toISOString()}.`;
    console.log(message);
    return res.status(200).json({ message });
  } catch (error) {
    // Details go to the function log only, never into the response.
    const details = error instanceof Error ? error.message : "Unknown error";
    console.error("Error pinging Supabase:", details);
    return res.status(500).json({ error: "Failed to ping Supabase." });
  }
}
