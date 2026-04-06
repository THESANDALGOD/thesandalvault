import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" as any });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Record purchase if not already recorded (webhook may have done it first)
    const { data: existing } = await supabase
      .from("purchases")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .single();

    if (!existing) {
      await supabase.from("purchases").insert({
        stripe_session_id: sessionId,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || "usd",
        customer_email: session.customer_details?.email || null,
      });
    }

    // Get spotlight tracks
    const { data: tracks } = await supabase
      .from("tracks")
      .select("id, title, version, file_path, artwork_path, lyrics")
      .eq("is_spotlight", true)
      .eq("is_private", false)
      .order("spotlight_order", { ascending: true });

    if (!tracks || !tracks.length) {
      return NextResponse.json({ error: "No tracks found" }, { status: 404 });
    }

    // Generate signed download URLs (24 hour expiry)
    const downloads = [];
    for (const track of tracks) {
      const { data: audioUrl } = await supabase.storage.from("tracks").createSignedUrl(track.file_path, 86400);

      let artUrl = null;
      if (track.artwork_path) {
        const { data } = await supabase.storage.from("tracks").createSignedUrl(track.artwork_path, 86400);
        artUrl = data?.signedUrl || null;
      }

      downloads.push({
        id: track.id,
        title: track.title,
        version: track.version,
        audioUrl: audioUrl?.signedUrl || null,
        artworkUrl: artUrl,
        lyrics: track.lyrics || null,
      });
    }

    // Get spotlight settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("spotlight_artwork_path, spotlight_title")
      .limit(1)
      .single();

    let coverUrl = null;
    if (settings?.spotlight_artwork_path) {
      const { data } = await supabase.storage.from("tracks").createSignedUrl(settings.spotlight_artwork_path, 86400);
      coverUrl = data?.signedUrl || null;
    }

    return NextResponse.json({
      success: true,
      amount: (session.amount_total || 0) / 100,
      email: session.customer_details?.email || null,
      projectName: settings?.spotlight_title || "Spotlight",
      coverUrl,
      downloads,
    });
  } catch (err: any) {
    console.error("Verify error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
