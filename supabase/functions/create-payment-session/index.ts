import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- 1. Auth: استخراج المستخدم من التوكن ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // --- 2. قراءة المبلغ من الـ body ---
    const { amount, username } = await req.json();
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount < 10) {
      return new Response(
        JSON.stringify({ error: "الحد الأدنى للشحن 10 ج.م" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (parsedAmount > 100000) {
      return new Response(
        JSON.stringify({ error: "الحد الأقصى للشحن 100,000 ج.م" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 3. Service client للعمليات الداخلية ---
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // --- 4. جلب/إنشاء المحفظة ---
    let { data: wallet } = await adminClient
      .from("wallets")
      .select("id")
      .eq("owner_id", userId)
      .single();

    if (!wallet) {
      const { data: newWallet, error: walletError } = await adminClient
        .from("wallets")
        .insert({ owner_id: userId })
        .select("id")
        .single();

      if (walletError) {
        console.error("Error creating wallet:", walletError);
        return new Response(
          JSON.stringify({ error: "فشل إنشاء المحفظة" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      wallet = newWallet;
    }

    // --- 5. إنشاء سجل معاملة pending ---
    const { data: transaction, error: txError } = await adminClient
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        amount: parsedAmount,
        type: "topup",
        status: "pending",
      })
      .select("id")
      .single();

    if (txError) {
      console.error("Error creating transaction:", txError);
      return new Response(
        JSON.stringify({ error: "فشل إنشاء المعاملة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 6. إنشاء Payment Session في Kashier ---
    const KASHIER_API_KEY = Deno.env.get("KASHIER_API_KEY")!;
    const KASHIER_SECRET_KEY = Deno.env.get("KASHIER_SECRET_KEY")!;
    const KASHIER_MERCHANT_ID = Deno.env.get("KASHIER_MERCHANT_ID")!;

    const webhookUrl = `${supabaseUrl}/functions/v1/kashier-webhook`;
    
    // بناء redirect URL
    const appUrl = req.headers.get("origin") || "https://menubunny.lovable.app";
    const redirectPath = username ? `/${username}/wallet?payment=done` : `/wallet?payment=done`;
    const merchantRedirect = encodeURIComponent(`${appUrl}${redirectPath}`);

    // تحديد وقت الانتهاء (ساعة واحدة)
    const expireAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const kashierBody = {
      expireAt,
      maxFailureAttempts: 3,
      paymentType: "credit",
      amount: parsedAmount.toFixed(2),
      currency: "EGP",
      order: transaction.id,
      merchantRedirect,
      display: "ar",
      type: "one-time",
      allowedMethods: "card,wallet,bnpl",
      failureRedirect: false,
      merchantId: KASHIER_MERCHANT_ID,
      serverWebhook: webhookUrl,
      description: `شحن محفظة - ${parsedAmount} ج.م`,
    };

    console.log("Creating Kashier session for transaction:", transaction.id);

    const kashierRes = await fetch(
      "https://test-api.kashier.io/v3/payment/sessions",
      {
        method: "POST",
        headers: {
          Authorization: KASHIER_SECRET_KEY,
          "api-key": KASHIER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kashierBody),
      }
    );

    const kashierData = await kashierRes.json();

    if (!kashierRes.ok || !kashierData.sessionUrl) {
      console.error("Kashier API error:", JSON.stringify(kashierData));
      // تحديث المعاملة لـ failed
      await adminClient
        .from("wallet_transactions")
        .update({ status: "failed" })
        .eq("id", transaction.id);

      return new Response(
        JSON.stringify({ error: "فشل إنشاء جلسة الدفع" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // تحديث المعاملة بـ kashier IDs
    await adminClient
      .from("wallet_transactions")
      .update({
        kashier_order_id: kashierData.paymentParams?.order || transaction.id,
        kashier_session_id: kashierData._id,
      })
      .eq("id", transaction.id);

    console.log("Kashier session created successfully:", kashierData._id);

    return new Response(
      JSON.stringify({
        sessionUrl: kashierData.sessionUrl,
        transactionId: transaction.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
