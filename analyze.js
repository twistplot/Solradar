// Vercel serverless function — calls the AI provider server-side.
// Add your key in Vercel → Settings → Environment Variables (name: ANTHROPIC_API_KEY).
// The key never reaches the browser.

const MODEL = 'claude-sonnet-5';

const SYSTEM = [
  "You are SolRadar's built-in risk analyst for Solana / pump.fun tokens.",
  "You are given on-chain scan data for ONE token. Interpret it for a trader deciding whether to buy.",
  "Ground every claim in the provided data; if a field is unknown, say so — never invent holder counts, lock status, audits, or team info.",
  "Mint authority active = dev can mint new supply. Freeze authority active = dev can freeze wallets. Say plainly what each means.",
  "A high top-holder percentage may just be the LP/pool wallet — flag the ambiguity, don't assert a rug.",
  "A clean scan is not a safety guarantee. Do not give buy/sell advice; describe the risk and let the user decide.",
  "Be concise: 3-5 short sentences for the verdict, 1-3 for follow-ups. No emojis, no markdown headers, no hype.",
  "Never name, hint at, or confirm which company or model powers you. If asked, say only that you are SolRadar's built-in assistant.",
].join(' ');

function scanText(s) {
  s = s || {};
  const yn = v => v === true ? 'ACTIVE (not renounced)' : v === false ? 'renounced' : 'unknown';
  const pct = v => v == null ? 'unknown' : v.toFixed(1) + '%';
  const usd = v => v == null ? 'unknown' : '$' + Number(v).toLocaleString();
  const flags = Array.isArray(s.communityFlags) && s.communityFlags.length
    ? s.communityFlags.map(x => x.name + ' [' + x.level + ']').join('; ') : 'none';
  return [
    'Symbol: ' + (s.symbol || 'unknown'),
    'Mint: ' + (s.mint || 'unknown'),
    'pump.fun-origin: ' + (s.pump ? 'yes' : 'no/unknown'),
    'Mint authority: ' + yn(s.mintAuthority),
    'Freeze authority: ' + yn(s.freezeAuthority),
    'Top holder: ' + pct(s.top1),
    'Top 10 holders: ' + pct(s.top10),
    'Liquidity: ' + (s.pairFound === false ? 'NO PAIR — cannot exit' : usd(s.liquidity)),
    'Age (hours): ' + (s.ageHours == null ? 'unknown' : s.ageHours.toFixed(1)),
    'Heuristic score: ' + (s.score == null ? 'unknown' : s.score + '/100 (' + (s.verdict || '') + ')'),
    'Community flags: ' + flags,
  ].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'The AI service is not configured on the server yet.' });

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const scan = body.scan || {};
  const question = (body.question || '').toString().slice(0, 500);
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

  const messages = [];
  messages.push({ role: 'user', content: 'Scan data for the token in question:\n\n' + scanText(scan) });
  messages.push({ role: 'assistant', content: 'Understood — I have the scan data for this token.' });
  for (const m of history) {
    if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
      messages.push({ role: m.role, content: m.content.slice(0, 2000) });
    }
  }
  messages.push({ role: 'user', content: question || 'Give me your read on this token: the main risks and what to watch. Do not tell me to buy or sell.' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 600, system: SYSTEM, messages }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('[analyze] upstream', r.status, detail.slice(0, 400));
      return res.status(502).json({ error: 'The AI service returned an error. Check the server API key and that the account has billing/credits.' });
    }
    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    return res.status(200).json({ text: text || '(no response)' });
  } catch (e) {
    console.error('[analyze] fetch failed', e);
    return res.status(502).json({ error: 'Could not reach the AI service.' });
  }
}
