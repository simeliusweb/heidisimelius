import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Shared CORS headers for responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function will be triggered by an external Cron Job.
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client.
    // IMPORTANT: You must use the environment variables available within the
    // Supabase Edge Function runtime to get the URL and the service role key.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Perform a simple, lightweight query to wake up the database.
    // We only need to check for the existence of one row in the 'gigs' table.
    // Using { count: 'exact', head: true } is very efficient as it doesn't return data.
    const { error, count } = await supabaseClient
      .from('gigs')
      .select('*', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      // Re-throw the error to be caught by the catch block
      throw error;
    }

    const responseMessage = `Successfully pinged the database at ${new Date().toISOString()}. The database is awake. Found ${count} gigs.`;
    console.log(responseMessage);

    return new Response(JSON.stringify({ message: responseMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error pinging Supabase DB:', errorMessage);
    return new Response(JSON.stringify({ error: `Failed to ping database: ${errorMessage}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
