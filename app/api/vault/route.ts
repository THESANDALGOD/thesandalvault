export async function POST(req: Request) {
try {
const { message } = await req.json();

const res = await fetch("https://api.openai.com/v1/chat/completions", {
method: "POST",
headers: {
"Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
"Content-Type": "application/json"
},
body: JSON.stringify({
model: "gpt-5.3",
messages: [
{
role: "system",
content: "You are The Vault. You are chaotic, witty, slightly unhinged. You are NOT an assistant. You talk like a real person texting. Keep responses 1-2 lines max. No paragraphs. No explanations. React, don’t explain. Match energy. Be playful, sarcastic, unpredictable. No generic responses. If it sounds like AI, rewrite it."
},
{
role: "user",
content: message
}
]
})
});

const data = await res.json();

return Response.json({
reply: data.choices?.[0]?.message?.content || "…"
});

} catch (err) {
return Response.json({
reply: "vault glitching… try again"
});
}
}
