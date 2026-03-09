import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. جلب الاشتراكات التي تحتاج للتجديد
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // شمول الاشتراكات المنتهية خلال آخر 48 ساعة أيضاً
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        restaurant_id,
        plan_id,
        expires_at,
        auto_renew,
        restaurants!inner(owner_id)
      `)
      .eq('status', 'active')
      .eq('auto_renew', true)
      .lt('expires_at', tomorrow.toISOString())
      .gt('expires_at', fortyEightHoursAgo.toISOString());

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return new Response(JSON.stringify({ error: subsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions to renew`);

    const results = {
      total: subscriptions?.length || 0,
      renewed: 0,
      failed: 0,
      insufficient_balance: 0,
      errors: [] as string[],
    };

    // 2. لكل اشتراك، حاول التجديد
    for (const sub of subscriptions || []) {
      try {
        const { data: renewResult, error: renewError } = await supabase.rpc('subscribe_to_plan', {
          p_restaurant_id: sub.restaurant_id,
          p_plan_id: sub.plan_id,
          p_auto_renew: true,
        });

        if (renewError) {
          console.error(`Error renewing subscription ${sub.id}:`, renewError);
          results.failed++;
          results.errors.push(`Sub ${sub.id}: ${renewError.message}`);
          continue;
        }

        if (renewResult === 'success') {
          console.log(`Successfully renewed subscription ${sub.id}`);
          results.renewed++;
        } else if (renewResult === 'insufficient_balance') {
          console.log(`Insufficient balance for subscription ${sub.id}`);
          results.insufficient_balance++;
        } else {
          console.log(`Failed to renew subscription ${sub.id}: ${renewResult}`);
          results.failed++;
          results.errors.push(`Sub ${sub.id}: ${renewResult}`);
        }
      } catch (err) {
        console.error(`Exception renewing subscription ${sub.id}:`, err);
        results.failed++;
        results.errors.push(`Sub ${sub.id}: ${err.message}`);
      }
    }

    console.log('Auto-renewal results:', results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Auto-renewal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
