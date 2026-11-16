// Supabase Edge Function: send-order-email
// Deploy with: supabase functions deploy send-order-email
// Configure secret: supabase secrets set RESEND_API_KEY=re_... ORDER_FROM_EMAIL="Teefahs Clothier <orders@teefahsclothier.com>"

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('ORDER_FROM_EMAIL') || 'Teefahs Clothier <orders@teefahsclothier.com>';

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          sent: false,
          status: 'not_configured',
          message: 'RESEND_API_KEY secret is not configured on Supabase Edge Function.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      order_reference,
      customer_name,
      customer_email,
      status,
      subtotal_ngn,
      confirmed_delivery_fee_ngn,
      delivery_country,
      delivery_city,
      carrier_name,
      tracking_reference,
      note,
    } = body || {};

    if (!customer_email || !order_reference) {
      return new Response(
        JSON.stringify({ sent: false, status: 'failed', message: 'Missing order_reference or customer_email.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedStatus = String(status || 'awaiting_confirmation').replace(/_/g, ' ').toUpperCase();
    const trackingUrl = `https://www.teefahsclothier.com/track-order?ref=${encodeURIComponent(order_reference)}`;

    const html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; padding: 32px;">
        <p style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #065f46; margin: 0 0 8px;">Teefahs Clothier · Order Update</p>
        <h1 style="font-size: 24px; margin: 0 0 16px; font-weight: normal;">Order ${order_reference}</h1>
        <p style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.6; color: #44403c;">
          Assalamu Alaikum ${customer_name || 'Valued Client'},<br/>
          Your order status has been updated to: <strong>${formattedStatus}</strong>.
        </p>
        ${note ? `<p style="font-family: system-ui, sans-serif; font-size: 13px; background: #fafaf9; padding: 12px; border-left: 3px solid #065f46; color: #292524;">${note}</p>` : ''}
        <table style="width: 100%; font-family: system-ui, sans-serif; font-size: 13px; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px 0; color: #78716c;">Destination</td><td style="padding: 8px 0; text-align: right;">${delivery_city ? `${delivery_city}, ` : ''}${delivery_country || 'NG'}</td></tr>
          <tr><td style="padding: 8px 0; color: #78716c;">Garments Subtotal</td><td style="padding: 8px 0; text-align: right;">₦${Number(subtotal_ngn || 0).toLocaleString()}</td></tr>
          ${confirmed_delivery_fee_ngn !== null && confirmed_delivery_fee_ngn !== undefined ? `<tr><td style="padding: 8px 0; color: #78716c;">Confirmed Delivery Fee</td><td style="padding: 8px 0; text-align: right;">₦${Number(confirmed_delivery_fee_ngn).toLocaleString()}</td></tr>` : ''}
          ${carrier_name ? `<tr><td style="padding: 8px 0; color: #78716c;">Courier Carrier</td><td style="padding: 8px 0; text-align: right;">${carrier_name}</td></tr>` : ''}
          ${tracking_reference ? `<tr><td style="padding: 8px 0; color: #78716c;">Tracking Reference</td><td style="padding: 8px 0; text-align: right;">${tracking_reference}</td></tr>` : ''}
        </table>
        <p style="margin: 24px 0;">
          <a href="${trackingUrl}" style="display: inline-block; background: #1c1917; color: #ffffff; text-decoration: none; padding: 12px 24px; font-family: system-ui, sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em;">Track Your Order</a>
        </p>
        <p style="font-family: system-ui, sans-serif; font-size: 12px; color: #78716c;">
          Need styling or dispatch help? Message us on WhatsApp at +234 802 899 1921.
        </p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [customer_email],
        subject: `Teefahs Clothier · Order ${order_reference} (${formattedStatus})`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ sent: false, status: 'failed', message: errText }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ sent: true, status: 'sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ sent: false, status: 'failed', message: err?.message || 'Unhandled email error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
