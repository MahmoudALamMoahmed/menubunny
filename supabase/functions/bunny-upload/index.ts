import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STORAGE_ZONE = "menuss";
const STORAGE_HOSTNAME = "storage.bunnycdn.com";
const CDN_HOSTNAME = "menuss.b-cdn.net";

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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string;

    if (!file || !path) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing file or path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Uploading to Bunny: ${path}, size: ${file.size}`);

    const fileBuffer = await file.arrayBuffer();

    const response = await fetch(
      `https://${STORAGE_HOSTNAME}/${STORAGE_ZONE}/${path}`,
      {
        method: "PUT",
        headers: {
          AccessKey: accessKey,
          "Content-Type": "application/octet-stream",
        },
        body: fileBuffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bunny upload failed:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Upload failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://${CDN_HOSTNAME}/${path}`;
    console.log("Upload successful:", url);

    return new Response(
      JSON.stringify({ success: true, url, path }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in bunny-upload:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
