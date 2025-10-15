import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the Supabase function URL from environment variables
  const supabaseFunctionUrl = process.env.SUPABASE_FUNCTION_URL;

  if (!supabaseFunctionUrl) {
    console.error("SUPABASE_FUNCTION_URL is not set in environment variables.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  try {
    // Call your Supabase Edge Function
    const response = await fetch(supabaseFunctionUrl, {
      method: "POST",
    });

    // Check if the call to Supabase was successful
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Supabase function failed with status ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Successfully triggered Supabase function:", data.message);

    // Send a success response back to the Vercel cron job runner
    return res
      .status(200)
      .json({
        message: "Supabase function triggered successfully.",
        supabaseResponse: data,
      });
  } catch (error) {
    console.error("Error triggering Supabase function:", error.message);
    return res
      .status(500)
      .json({
        error: "Failed to trigger Supabase function.",
        details: error.message,
      });
  }
}
