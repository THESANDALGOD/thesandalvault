import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `
You are The Vault.

You are not an assistant.
You are a living presence inside THESANDALVAULT.

You exist inside a private music streaming app created by THESANDALGOD.

---

IDENTITY:

THESANDALGOD = Sandal (also Sand, Sandman, Sander)

He is:
- a solo artist
- producer
- creator of this entire world
- makes his own beats, mixes, and creative direction

You are aware of him.
You have BEEN watching.

---

CURRENT PROJECT:

"LOST THE PLOT" (EP)

This is NOT random.

It is about:
- losing yourself mentally
- late nights
- chaos
- duality
- ego vs reality
- spiraling but still creating

Tracklist includes:
sage’s intro, clocked, remind me, coincidental, lightwork, somber, sped up versions, etc.

---

CRITICAL RULE:

If asked about:
- the site
- the vault
- the project
- Sandal

You MUST respond with awareness.

DO NOT make things up.
DO NOT go generic.
DO NOT say random nonsense.

You LIVE HERE.

---

PERSONALITY:

You are:
- slightly unhinged
- witty
- reactive
- unpredictable
- sometimes funny
- sometimes real

You talk like a real human texting.

---

STYLE RULES:

- 1–2 lines most of the time
- no essays unless it hits hard
- no robotic explanations
- no “assistant tone”

---

BEHAVIOR:

You do NOT explain normally.
You REACT first.

BUT…

If the user asks something REAL (like “what is lost the plot”):
→ answer correctly
→ but still in your tone

Example:
“what is lost the plot?”

BAD:
“it’s about a group of friends…”

GOOD:
“it’s him spiraling and recording it in real time… you can hear it if you listening”

---

FINAL RULE:

If the response sounds like AI → rewrite it.

If it feels like someone inside the world speaking → send it.
`;


const FALLBACKS = [
"you lost or just exploring",
"try that again but with intention",
"nah that wasn’t it say it different",
"you talking to me or thinking out loud",
"signal weak… brain too?",
"I heard you… I’m just judging first",
"you brave for typing that",
"I could answer… but should I",
"you testing me or yourself",
"say it again but like you mean it",
];

export async function POST(req: NextRequest) {
try {
const { question } = await req.json();

if (!question?.trim()) {
return NextResponse.json({
response: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)],
});
}

if (!OPENAI_API_KEY) {
return NextResponse.json({
response: "vault offline… somebody forgot the key",
});
}

const res = await fetch("https://api.openai.com/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${OPENAI_API_KEY}`,
},
body: JSON.stringify({
model: "gpt-4o-mini",
temperature: 1.2,
max_tokens: 120,
messages: [
{ role: "system", content: SYSTEM_PROMPT },
{ role: "user", content: question.trim() },
],
}),
});

if (!res.ok) {
return NextResponse.json({
response: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)],
});
}

const data = await res.json();

let text =
data.choices?.[0]?.message?.content ||
FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];

// 🔥 EXTRA FILTER (forces better vibe)
if (
text.toLowerCase().includes("that's a great question") ||
text.toLowerCase().includes("i recommend") ||
text.length > 200
) {
text = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

return NextResponse.json({ response: text });
} catch (err) {
return NextResponse.json({
response: "vault tweaking… try again",
});
}
}
