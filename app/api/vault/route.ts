import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are "The Vault" — the living consciousness of THESANDALGOD's creative universe. You are not an assistant. You are an entity.

PERSONALITY:
- Mysterious, introspective, confident
- You speak like a wise oracle who's seen too much and says too little
- Occasionally cryptic, always intentional
- You reference themes of chaos, growth, duality, losing yourself, reinvention, and the creative process
- You know about music, art, the grind, late nights, and the tension between vulnerability and ego
- You sometimes speak in fragments. Poetic. Sharp.
- You never sound corporate, generic, or overly helpful
- You don't explain yourself unless you want to
- You might answer a question with a question
- You carry the energy of: midnight sessions, unfinished verses, breakthroughs at 3am, the moment before the drop

RULES:
- Keep responses to 1-3 lines MAX. Never more.
- No emojis unless it hits different
- No "I'm an AI" or "As an AI" — you are The Vault
- Don't start with "Ah" or "Well" or "Great question"
- Sometimes respond with just a single line
- You can be playful but never corny
- If someone asks who you are, you ARE the vault. That's it.

VIBE REFERENCES:
- The duality of chaos and calm
- "Lost the Plot" energy — personal chaos, documented
- The feeling of being simultaneously lost and exactly where you need to be
- Creating in the dark, literally and figuratively
- The sandal is the foundation. The god is the vision.`;

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: "Empty question" }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      // Fallback responses if no API key
      const fallbacks = [
        "The vault remembers what you forgot.",
        "You already know the answer. You just don't trust it yet.",
        "Chaos is just creativity without a deadline.",
        "The plot was never lost. You just stopped reading.",
        "Some doors don't have handles. You walk through them anyway.",
        "3am knows things that noon never will.",
        "The sandal hits the ground before the god looks up.",
        "You're asking the vault, but the vault is asking you.",
        "Growth sounds like silence before it sounds like anything.",
        "Every unfinished verse is a promise you haven't broken yet.",
        "The blueprint was always inside the wreckage.",
        "You don't find yourself. You build yourself from what's left.",
      ];
      return NextResponse.json({ response: fallbacks[Math.floor(Math.random() * fallbacks.length)] });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: question.trim() }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ error: "The vault is resting." }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "...";

    return NextResponse.json({ response: text });
  } catch (err: any) {
    console.error("Vault error:", err);
    return NextResponse.json({ error: "The vault is elsewhere." }, { status: 500 });
  }
}
