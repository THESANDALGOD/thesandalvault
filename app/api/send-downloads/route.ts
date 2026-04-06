import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY!);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { email, projectName, downloads, coverUrl } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "No email provided" }, { status: 400 });
    }

    // Build track list HTML
    const trackRows = downloads.map((track: any, i: number) => {
      const links = [];
      if (track.audioUrl) links.push(`<a href="${track.audioUrl}" style="color:#e2e2e2;text-decoration:underline;">MP3</a>`);
      if (track.artworkUrl) links.push(`<a href="${track.artworkUrl}" style="color:#999;text-decoration:underline;">Artwork</a>`);
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#e2e2e2;font-size:14px;">
            ${String(i + 1).padStart(2, "0")}. ${track.title}
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;text-align:right;font-size:13px;">
            ${links.join(" &nbsp;·&nbsp; ")}
          </td>
        </tr>
      `;
    }).join("");

    const html = `
      <div style="background:#0a0a0a;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:500px;margin:0 auto;">
          ${coverUrl ? `<img src="${coverUrl}" width="120" height="120" style="border-radius:12px;display:block;margin:0 auto 24px;" />` : ""}
          <h1 style="color:#fff;font-size:22px;text-align:center;margin:0 0 4px;">Thank you for your purchase</h1>
          <p style="color:#666;font-size:13px;text-align:center;margin:0 0 32px;font-family:monospace;">${projectName || "Digital Download"}</p>
          
          <p style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;font-family:monospace;">Your Downloads</p>
          
          <table style="width:100%;border-collapse:collapse;">
            ${trackRows}
          </table>

          <p style="color:#444;font-size:11px;text-align:center;margin:32px 0 0;font-family:monospace;">
            Links expire in 24 hours. Save your files after downloading.
          </p>
          <p style="color:#333;font-size:10px;text-align:center;margin:16px 0 0;font-family:monospace;">
            THESANDALGOD · THESANDALVAULT
          </p>
        </div>
      </div>
    `;

    const fromEmail = process.env.RESEND_FROM_EMAIL || "downloads@resend.dev";

    const { error } = await resend.emails.send({
      from: `THESANDALVAULT <${fromEmail}>`,
      to: email,
      subject: `Your download — ${projectName || "Digital Download"}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Send downloads error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
