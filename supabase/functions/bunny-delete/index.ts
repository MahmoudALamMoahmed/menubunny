import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STORAGE_ZONE = "menuss";
const STORAGE_HOSTNAME = "storage.bunnycdn.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKey = Deno.env.get("BUNNY_STORAGE_ACCESS_KEY");
    if (!accessKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Bunny Storage access key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { path } = await req.json();

    if (!path) {
      console.log("No path provided, skipping deletion");
      return new Response(
        JSON.stringify({ success: true, message: "No file to delete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting from Bunny: ${path}`);

    const response = await fetch(
      `https://${STORAGE_HOSTNAME}/${STORAGE_ZONE}/${path}`,
      {
        method: "DELETE",
        headers: {
          AccessKey: accessKey,
        },
      }
    );

    console.log("Bunny delete response:", response.status);

    if (response.ok || response.status === 404) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorText = await response.text();
      console.error("Bunny delete failed:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Delete failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in bunny-delete:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
