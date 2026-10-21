const elements = require('../elements.json');

const FAMILY = {info:'Information & Learning', delib:'Deliberation & Discourse', elect:'Electoral Participation', direct:'Direct Action & Dissent', acct:'Accountability & Oversight', org:'Organizing & Association', adv:'Advocacy & Influence', gov:'Governing & Public Service', econ:'Economic & Everyday Democracy'};

function extractJSON(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  const a = clean.indexOf('{'), b = clean.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('No JSON in model reply');
  return JSON.parse(clean.slice(a, b + 1));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://democracytable.com');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'The analyzer is not configured yet (missing ANTHROPIC_API_KEY).' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { mode, description, element } = body || {};
  const desc = String(description || '').trim().slice(0, 2500);
  if (!desc) return res.status(400).json({ error: 'Describe your initiative first.' });

  const catalogue = elements.map(e => `${e.z} ${e.n} (${FAMILY[e.f].split(' ')[0]})`).join('; ');
  let system, user, maxTokens;

  if (mode === 'suggest') {
    const el = elements.find(e => e.z === Number(element));
    if (!el) return res.status(400).json({ error: 'Unknown element.' });
    system = 'You are an experienced civic organizer and democratic-design consultant. You give concrete, specific, realistic advice for small organizations and individuals. No platitudes. Respond ONLY with valid JSON, no prose before or after.';
    user = `The initiative:\n${desc}\n\nThe element to add to it:\n${el.z}. ${el.n} (${FAMILY[el.f]}) — ${el.d}\nCommon tools and on-ramps for this element: ${el.t}\n\nGive 3 to 5 ways this particular initiative could incorporate this element. Each should be specific to what the initiative actually is, name a concrete first step someone could take this week, and estimate effort. Also give one honest caution about doing it badly.\n\nJSON shape:\n{"summary":"one sentence on why this element would strengthen this initiative","suggestions":[{"title":"short name","how":"2-3 sentences, specific to the initiative","first_step":"one concrete action","effort":"low|medium|high"}],"watch_out":"one sentence"}`;
    maxTokens = 900;
  } else {
    system = 'You are an analyst of democratic participation who knows the Periodic Table of Democratic Engagement well. You are strict: an initiative "meets" an element only if it actually does that thing, not if it is vaguely related. Respond ONLY with valid JSON, no prose before or after.';
    user = `The catalogue of 118 elements:\n${catalogue}\n\nThe initiative:\n${desc}\n\nTasks:\n1. List the elements this initiative already meets. Mark each "strong" (clearly a core part of what it does) or "partial" (present but minor or implicit). Typically 4 to 12 elements. Give a reason of at most 12 words each.\n2. Pick the 3 to 5 elements that are missing and would most strengthen it, with a reason of at most 12 words each. Prefer elements adjacent to what it already does.\n3. Write a two-sentence read of the initiative's democratic character: which families it lives in and how deep in the table it reaches.\n\nJSON shape:\n{"read":"...","matches":[{"z":1,"strength":"strong","why":"..."}],"gaps":[{"z":1,"why":"..."}]}`;
    maxTokens = 1100;
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: (data && data.error && data.error.message) || 'Model request failed.' });
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const parsed = extractJSON(text);
    const valid = z => elements.some(e => e.z === Number(z));
    if (parsed.matches) parsed.matches = parsed.matches.filter(m => valid(m.z));
    if (parsed.gaps) parsed.gaps = parsed.gaps.filter(g => valid(g.z));
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Could not parse the analysis. Please try again.' });
  }
};
