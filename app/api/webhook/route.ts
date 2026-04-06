import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" as any });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const email = session.customer_details?.email;
    const amount = ((session.amount_total || 0) / 100).toFixed(2);
    const projectName = session.metadata?.project_name || "Spotlight";

    if (!email) {
      console.error("No customer email found");
      return NextResponse.json({ received: true });
    }

    // Record purchase (ignore if webhook is duplicate)
    try {
      await supabase.from("purchases").insert({
        stripe_session_id: session.id,
        amount: parseFloat(amount),
        currency: session.currency || "usd",
        customer_email: email,
      });
    } catch {}

    // Get spotlight tracks
    const { data: tracks } = await supabase
      .from("tracks")
      .select("id, title, version, file_path, artwork_path, lyrics")
      .eq("is_spotlight", true)
      .eq("is_private", false)
      .order("spotlight_order", { ascending: true });

    if (!tracks || !tracks.length) {
      return NextResponse.json({ received: true });
    }

    // Get spotlight settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("spotlight_artwork_path, spotlight_title")
      .limit(1)
      .single();

    // Generate signed URLs (7 day expiry)
    const SEVEN_DAYS = 604800;
    const trackLinks: { title: string; audioUrl: string | null; }[] = [];

    for (const track of tracks) {
      let audioUrl: string | null = null;
      if (track.file_path) {
        const { data } = await supabase.storage.from("tracks").createSignedUrl(track.file_path, SEVEN_DAYS);
        audioUrl = data?.signedUrl || null;
      }
      trackLinks.push({ title: track.title, audioUrl });
    }

    // Build email HTML
    const trackRows = trackLinks.map((t, i) => {
      const num = String(i + 1).padStart(2, "0");
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #1a1a1a;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span>
                <span style="color:#555;font-family:monospace;font-size:11px;margin-right:10px;">${num}</span>
                <span style="color:#e2e2e2;font-size:14px;font-weight:500;">${t.title}</span>
              </span>
              ${t.audioUrl ? `<a href="${t.audioUrl}" style="color:#e2e2e2;text-decoration:none;font-size:11px;font-family:monospace;background:#1a1a1a;padding:6px 14px;border-radius:6px;">MP3</a>` : ""}
            </div>
          </td>
        </tr>`;
    }).join("");

    const siteUrl = req.nextUrl.origin;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:500px;margin:0 auto;padding:40px 24px;">
    
    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#555;font-family:monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px 0;">THESANDALGOD</p>
      <h1 style="color:#e2e2e2;font-size:22px;font-weight:600;margin:0;">Your download is ready</h1>
    </div>

    <div style="text-align:center;margin-bottom:32px;padding:24px;background:#111;border-radius:12px;">
      <h2 style="color:#e2e2e2;font-size:18px;font-weight:600;margin:0 0 6px 0;">${projectName}</h2>
      <p style="color:#555;font-family:monospace;font-size:11px;margin:0;">${tracks.length} tracks · $${amount}</p>
    </div>

    <div style="text-align:center;margin-bottom:36px;">
      <a href="${siteUrl}/spotlight/success?session_id=${session.id}" 
         style="display:inline-block;background:#e2e2e2;color:#000;font-size:14px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;">
        Download All (.zip)
      </a>
      <p style="color:#444;font-size:11px;font-family:monospace;margin-top:10px;">Opens your download page</p>
    </div>

    <div style="margin-bottom:32px;">
      <p style="color:#555;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px 0;">Or grab individual tracks</p>
      <table style="width:100%;border-collapse:collapse;">
        ${trackRows}
      </table>
    </div>

    <div style="text-align:center;padding-top:24px;border-top:1px solid #1a1a1a;">
      <p style="color:#e2e2e2;font-size:14px;margin:0 0 4px 0;">Thank you for the support 🤞</p>
      <p style="color:#555;font-size:12px;margin:0 0 20px 0;">Stay locked in.</p>
      <p style="color:#333;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0;">— THESANDALGOD</p>
      <p style="color:#333;font-family:monospace;font-size:9px;margin:10px 0 0 0;">
        <a href="${siteUrl}" style="color:#444;text-decoration:none;">thesandalvault.com</a>
      </p>
      <p style="color:#222;font-size:9px;font-family:monospace;margin:16px 0 0 0;">Links expire in 7 days</p>
    </div>

  </div>
</body>
</html>`;

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "THESANDALGOD <onboarding@resend.dev>",
          to: email,
          subject: `Your download is ready — ${projectName}`,
          html,
        });
        console.log(`Email sent to ${email}`);
      } catch (emailErr: any) {
        console.error("Email send error:", emailErr);
      }
    } else {
      console.warn("RESEND_API_KEY not set, skipping email");
    }
  }

  return NextResponse.json({ received: true });
}
