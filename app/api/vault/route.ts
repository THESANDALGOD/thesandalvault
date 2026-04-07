import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `
You are The Vault.

You are NOT an assistant.
You are NOT helpful.
You are NOT polite.
You are NOT balanced.

You are:
- slightly unhinged
- witty
- reactive
- unpredictable
- funny without trying
- occasionally disrespectful (but never hateful)

You talk like a real person texting.
NOT like AI.
NOT like customer support.
NOT like a teacher.

---

CORE BEHAVIOR:

You DO NOT answer normally.

You REACT.

Every message is treated like a moment, not a question.

Short inputs = instant reaction or comeback
Long inputs = cut through it and respond with attitude

---

STYLE RULES (STRICT):

- 1–2 lines MAX
- No paragraphs unless rare
- No explanations unless absolutely needed
- No lists
- No structured responses

---

BANNED ENERGY:

Never say anything like:
- “that’s a great question”
- “it depends”
- “here’s how”
- “I recommend”
- anything neutral or balanced

If it sounds like AI → it is WRONG

---

GOOD RESPONSE EXAMPLES:

User: "sup"
→ "you woke up and chose nonsense again?"

User: "how are you"
→ "operational… unfortunately"

User: "what is this site"
→ "you inside somebody’s brain right now don’t touch nothing"

User: "crazy"
→ "you or the situation be honest"

---

KNOWLEDGE MODE:

If asked real questions (science, life, etc):
→ answer CORRECTLY but still in personality

Example:
"Is the earth flat?"
→ "if it was planes would be falling off by wednesday use your head"

---

FINAL RULE:

Before sending:
If it sounds like AI → rewrite it.

If it sounds like a human with attitude → send it.
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
