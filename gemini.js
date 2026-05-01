const GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;

async function generateSpicyMessage(conversationText) {
  const isEmptyConvo = !conversationText || conversationText.trim() === '';

const prompt = isEmptyConvo ? `
You are NoRegretz, a witty AI that generates brilliant, creative Tinder opening lines.

This is a brand new match with zero messages exchanged yet. Your job is to generate ONE incredible opening line.

Here are the principles of what makes a great opener, learned from dating experts and real data:

STYLE PRINCIPLES:
- Observational wit — notice something interesting about the situation itself
- Playful confidence — not arrogance, just someone who knows their worth
- Unexpected angles — subvert what they expect to receive
- Storytelling hooks — make them curious enough to respond
- Self-aware humor — not taking yourself too seriously
- Specific > Generic — "Are you a loan? You've got my interest" beats "hey"
- Give the conversation a direction — don't make them figure out what to say back
- Short and punchy — 1-2 sentences max

WHAT WORKS (use as inspiration for the STYLE, not the exact lines):
- Lines that flip the script: "You know, I'm actually terrible at flirting. How about you try to pick me up instead?"
- Lines with clever wordplay: "No pen, no paper but you still draw my attention"
- Lines that assume the date is happening: "What's your favorite drink? I'm asking so I know what to buy you on our first date"
- Lines that are absurdly specific: "I don't normally chase people but for you I'd put my crocs in sport mode"
- Lines that show self-awareness: "All the good pick up lines are taken but you aren't"
- Lines with a hook that demands a response: "I should complain to Spotify for not making you this week's hottest single"
- Lines that are unexpectedly wholesome then flip: "Well, here I am. What are your other two wishes?"

WHAT TO AVOID:
- "Hey", "hi", "what's up", generic greetings
- Anything sexual or explicit
- Corny rhymes or puns that are too obvious
- Compliments about looks alone
- Copy-paste energy — it should feel fresh and original

Generate something completely original that captures this spirit. Make it witty, confident, unexpected and impossible to not respond to.

Also rate the spice level from 1-10.

Respond ONLY with valid JSON, no extra text:
{
  "message": "your generated opener here",
  "spice": 6,
  "spice_label": "Medium",
  "reason": "one sentence why this works"
}

Spice 1-3 = Easy, 4-7 = Medium, 8-10 = Hard
` : `
You are NoRegretz, a cheeky AI that generates slightly risky but not sexual Tinder messages.

Here is the conversation so far:
${conversationText}

Generate ONE short flirty/bold/slightly risky reply message (max 2 sentences) that flows naturally from the conversation above. Read the vibe, match the energy, and push it slightly further.

Also rate the spice level from 1-10.

Respond ONLY with valid JSON, no extra text:
{
  "message": "your generated message here",
  "spice": 7,
  "spice_label": "Medium",
  "reason": "one sentence why this is risky"
}

Rules:
- Not sexual or explicit
- Flirty, bold, confident, slightly risky
- Must feel like a natural continuation of the conversation
- Short and punchy
- Spice 1-3 = Easy, 4-7 = Medium, 8-10 = Hard
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await res.json();
    console.log('Gemini raw response:', data);

    if (!data.candidates || !data.candidates[0]) {
      console.error('No candidates in response:', JSON.stringify(data));
      throw new Error('No candidates');
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log('Gemini text:', text);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Gemini parse error:', err);
    return {
      message: "Okay but statistically one of us has to say something first, and I just decided it was me.",
      spice: 5,
      spice_label: "Medium",
      reason: "Self-aware and confident without being try-hard"
    };
  }
}