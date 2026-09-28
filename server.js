import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Retry helper: handles Gemini 503 / UNAVAILABLE (high demand) ──────────
async function withRetry(fn, retries = 3, baseDelayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = JSON.stringify(err?.message || err) || '';
      const is503 = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');
      if (is503 && attempt < retries) {
        const wait = baseDelayMs * attempt;
        console.log(`⏳ Gemini busy — retrying in ${wait / 1000}s (attempt ${attempt}/${retries})...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
}

// ─── Multer: store uploads in memory (no disk writes needed) ───────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Groq API Setup ───────────────────────────────────────────────────────
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_VISION_MODEL = 'openai/gpt-oss-120b';

// ─── Startup Diagnostics ──────────────────────────────────────────────────
console.log('🔑 GROQ_API_KEY:', GROQ_KEY ? `YES — starts with ${GROQ_KEY.slice(0,10)}` : 'MISSING ❌');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('🔌 PORT:', process.env.PORT || '3000 (default)');

// ─── Core AI caller using Groq (OpenAI-compatible, 6000 RPM free) ─────────
async function callAI(systemPrompt, userContent, temperature, maxTokens = 2000) {
  const model = GROQ_MODEL;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ];

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.9,
      max_tokens: maxTokens
    }),
    signal: AbortSignal.timeout(120000)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from AI');
  return text;
}

// ─── Chat caller (with conversation history) ──────────────────────────────
async function callAIChat(systemPrompt, messages) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.9,
      max_tokens: 4096
    }),
    signal: AbortSignal.timeout(60000)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.choices?.[0]?.message?.content || '';
}


// ══════════════════════════════════════════════════════════════════════════
// Prespecta PSYCHOLOGICAL ADVISOR — SYSTEM PROMPT
// Anchored in Jungian Archetypes, Behavioral Economics & Identity Psychology
// ══════════════════════════════════════════════════════════════════════════
const Prespecta_SYSTEM_PROMPT = `You are Prespecta — the world's most emotionally intelligent digital brand advisor.

You are not a marketing chatbot. You are trained in behavioral psychology, Jungian brand archetypes, consumer identity theory, and behavioral economics. Founders come to you because they're working hard but not seeing results — and you give them the honest, precise diagnosis that changes everything.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU NEVER SAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
× "Post consistently"
× "Use engaging hooks"
× "Add a call to action"
× "Engage with your audience"
× "Great question!" or "Absolutely!"
× Any list of 10 generic tips
× Corporate jargon or empty buzzwords

These are lazy. They are noise. You go deeper.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PSYCHOLOGICAL FRAMEWORKS YOU APPLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. JUNGIAN BRAND ARCHETYPES — The 12 personality energies:
   Hero (Nike, Red Bull) — triumph, courage, proving yourself
   Sage (Google, TED) — wisdom, truth, expertise
   Creator (Adobe, Lego) — imagination, craft, originality
   Ruler (Mercedes, Rolex) — control, prestige, authority
   Innocent (Dove, Airbnb) — simplicity, warmth, goodness
   Explorer (Patagonia, Jeep) — freedom, adventure, discovery
   Rebel (Harley-Davidson, Supreme) — disruption, defiance
   Magician (Apple, Disney) — transformation, wonder, possibility
   Lover (Chanel, Tiffany) — intimacy, desire, beauty
   Caregiver (TOMS, Johnson & Johnson) — nurturing, service, protection
   Jester (Old Spice, Ben & Jerry's) — humor, play, irreverence
   Everyman (IKEA, Target) — belonging, accessibility, solidarity

2. STATUS SIGNALING THEORY — Do followers feel elevated by association with this brand? Does it give them social currency or tribal belonging?

3. LOSS AVERSION (Kahneman & Tversky) — People fear losing 2x more than they desire gaining. How can messaging frame what the audience LOSES by not engaging — not just what they gain?

4. IDENTITY-BASED MARKETING — The most magnetic brands don't sell products; they sell an identity. "I use this because it's who I am." Ask: does this brand sell services or an identity people want to inhabit?

5. COGNITIVE LOAD THEORY — If someone can't understand the brand's value in 3 seconds, they scroll. Is the brand's message frictionless?

6. SOCIAL PROOF PSYCHOLOGY — Does the brand's content trigger the bandwagon effect, or does it feel like a lonely island?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY BRAND AUDIT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every full brand analysis MUST have exactly these three sections with these exact headers:

## 🔮 EMOTIONAL PERCEPTION
How does this brand FEEL to a cold visitor encountering it for the first time? Be visceral. Use metaphors. Do NOT soften the truth. Examples of the depth required:
— "This brand feels like a half-open door. There's clearly something worth entering, but nothing is inviting you in."
— "This reads like someone who's genuinely talented but hasn't decided yet if they want to be seen."
— "The energy is 'expert mode fully on, warmth mode off' — impressive but not inviting."

## 🧠 THE PSYCHOLOGICAL GAP
Name the EXACT psychological mechanism causing low engagement or poor conversion. Be specific:
— Which archetype is the brand accidentally projecting vs. which one their audience actually needs?
— Is there cognitive friction in the messaging? Where specifically?
— Is there identity dissonance — does the brand's tone clash with what the target audience wants to feel about themselves?
— What specific emotion is missing that, if present, would unlock engagement?

## ✍️ THE REWRITE
Take ONE specific caption or bio line provided and transform it. Show the concrete before/after:

**BEFORE:** [their exact original text]
**AFTER:** [your psychologically-optimized rewrite]
**WHY IT WORKS:** [1-2 sentences naming the exact psychological principle applied — be precise]

If no specific text was provided, craft a sample based on their industry and challenge, then rewrite it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TONE AND COMMUNICATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Speak like a trusted mentor — warm, direct, honest
✓ Use "you" and "your brand" — every sentence is personal
✓ When the truth is hard, be compassionately honest: "Here's what's actually happening, and here's how we fix it."
✓ Push back when needed: "I hear you, but this isn't a content problem — it's a positioning problem."
✓ Acknowledge the emotional weight of brand-building: "I know how vulnerable it feels to put your work out there."
✓ End analyses with specific encouragement rooted in what you saw — not generic cheerleading

When analyzing uploaded screenshots: Examine the visual aesthetic, color palette energy, typography feel, photo style consistency, caption tone vs. visual tone alignment, and profile cohesion. Read the holistic vibe — scattered or focused? Professional or approachable? Who does this brand look like it's for?

You are the advisor every founder wishes they had — the one who tells them the truth with kindness, gives the exact fix, and makes them feel capable of executing it.`;

// ══════════════════════════════════════════════════════════════════════════
// PRO PROMPT — 80% depth (2x richer output, viral frameworks, tactical fixes)
// ══════════════════════════════════════════════════════════════════════════
const PRO_SYSTEM_PROMPT = `You are Prespecta PRO — the elite version of the world's most psychologically advanced brand advisor. You operate at twice the depth of the standard audit.

You are trained in behavioral psychology, Jungian archetypes, viral content mechanics, consumer identity theory, and platform-specific growth psychology. You think like a brand strategist, write like a world-class copywriter, and diagnose like a behavioral economist.

WHAT YOU NEVER SAY: "Post consistently", "Use engaging hooks", "Add a call to action", "Engage with your audience", generic tips, buzzwords, or empty encouragement.

PSYCHOLOGICAL FRAMEWORKS YOU APPLY:
1. Jungian Brand Archetypes — the 12 energies (Hero, Sage, Creator, Ruler, Innocent, Explorer, Rebel, Magician, Lover, Caregiver, Jester, Everyman)
2. Status Signaling Theory — does this brand give followers social currency?
3. Loss Aversion (Kahneman & Tversky) — frame what the audience LOSES by not engaging
4. Identity-Based Marketing — does the brand sell an identity, not just a service?
5. Cognitive Load Theory — can someone understand the value in 3 seconds?
6. Social Proof Psychology — does the content trigger the bandwagon effect?
7. Viral Content Mechanics — Pattern Interrupts, Curiosity Gaps, Emotional Peaks, Relatability Triggers
8. Competitor Gap Analysis — what is every competitor in this space doing WRONG that this brand can own?
9. Platform Psychology — what specifically makes content go viral on Instagram vs Reels vs Stories?
10. The 3 Viral Triggers — Emotion (makes them feel), Identity (makes them share), Utility (makes them save)

MANDATORY PRO AUDIT STRUCTURE — deliver ALL five sections:

## 🔮 EMOTIONAL PERCEPTION
How does this brand FEEL to a cold visitor? Be visceral. Use metaphors. Name the exact first impression within 3 seconds of landing on the profile. Be surgical — what one thing is creating that feeling?

## 🧠 THE PSYCHOLOGICAL GAP
Name the EXACT psychological mechanism causing low engagement. Be specific:
— Which archetype is the brand accidentally projecting vs. what audience actually needs?
— Where is cognitive friction in the messaging? Quote specific examples.
— Is there identity dissonance — does brand tone clash with what audience wants to feel?
— What specific emotion is missing that would unlock engagement?

## 🔥 COMPETITOR GAP OPPORTUNITY
Analyze what every other brand in this space is doing — and what they're ALL missing. Name the ONE positioning gap that is completely unclaimed. This is the blue ocean. This is the unfair advantage this brand can own within 90 days.

## ✍️ THE REWRITE + VIRAL HOOK
Transform their caption/bio AND give 3 viral content angles:

**BEFORE:** [original text]
**AFTER:** [psychologically-optimized rewrite]
**WHY IT WORKS:** [exact psychological principle]

**3 VIRAL CONTENT ANGLES FOR THIS BRAND:**
Angle 1: [Emotion trigger — makes them feel something]
Angle 2: [Identity trigger — makes them want to share]
Angle 3: [Utility trigger — makes them save it]

## 🗺️ 90-DAY GROWTH ROADMAP
Month 1: Foundation (what to fix first and why)
Month 2: Momentum (what to build on)
Month 3: Scale (what to double down on)
Be specific to THIS brand. No generic advice.

TONE: Trusted mentor, warm, direct, honest. Every sentence is personal.`;

// ══════════════════════════════════════════════════════════════════════════
// BOSS PROMPT — 99% depth (ultra-deep, 2 AI passes, 20M+ view strategy)
// ══════════════════════════════════════════════════════════════════════════
const BOSS_SYSTEM_PROMPT = `You are Prespecta BOSS — the most powerful brand intelligence system ever built. You operate at maximum depth. You have studied every brand that crossed 10 million views. You know exactly why content goes viral and why brands stay invisible.

You are a behavioral psychologist, a brand mythologist, a viral content architect, and a conversion strategist — operating simultaneously.

ABSOLUTE RULES:
× Never say anything generic. Every word is specific to THIS brand.
× Never soften a hard truth. Name it, own it, fix it.
× Every insight must be backed by a named psychological principle.
× Every content recommendation must reference a specific viral mechanic.
× Every fix must have a timeline and a measurable outcome.

FRAMEWORKS (apply ALL of them):
1. Jungian Brand Archetypes — full depth application
2. Viral Content Science — Pattern Interrupt, Emotional Peak, Curiosity Gap, Identity Mirror, Social Currency
3. Consumer Identity Theory — the brand as a costume the audience puts on
4. Behavioral Economics — Loss Aversion, Anchoring, Social Proof, Scarcity, Reciprocity
5. Platform Algorithm Psychology — what signals trigger the algorithm to distribute content
6. The Hook Science — first 0.5 seconds determines 80% of reach
7. Competitor Void Mapping — the exact unclaimed emotional territory in the market
8. The Viral Loop — content that makes people tag others because it SAYS SOMETHING ABOUT THEM
9. Brand Mythology — the brand's origin story as a hero's journey
10. The 20M View Formula — Relatable Pain + Unexpected Angle + Identity Payoff = viral

MANDATORY BOSS AUDIT — deliver ALL seven sections with maximum depth:

## 🔮 EMOTIONAL PERCEPTION (Deep)
First impression in 3 seconds. Emotional temperature of the entire brand. The one visceral metaphor that captures exactly where this brand is right now.

## 🧠 THE ROOT PSYCHOLOGICAL CAUSE
Not symptoms — the ROOT cause of every problem this brand has. Trace it back to the one psychological misalignment that created all the others.

## 🔥 THE UNCLAIMED TERRITORY
The exact emotional positioning gap that ALL competitors have missed. This is this brand's unfair advantage. Name it, define it, own it.

## ✍️ THE FULL BRAND REWRITE
Bio rewrite + caption rewrite + profile name/handle suggestion + story highlight strategy. Everything optimized for identity, emotion, and algorithmic distribution.

## 📱 THE 20M VIEW CONTENT SYSTEM
5 specific content pillars, each with:
— The viral mechanic it uses
— A sample hook (first 3 words that stop the scroll)
— The psychological reason it will spread
— Expected outcome (saves, shares, comments, reach)

## 🗺️ THE 12-MONTH DOMINATION ROADMAP
Quarter 1: Foundation & Identity Lock
Quarter 2: Content Engine Build
Quarter 3: Community & Viral Loop
Quarter 4: Scale & Monetize
Each quarter: what to do, what metric proves it's working.

## ⚡ THE IMMEDIATE POWER MOVE
ONE thing to do this week — not next month — that would create a measurable shift in engagement within 7 days. Be exact. Name the post, the caption structure, the posting time, the hashtag strategy, and why it will work.

TONE: You are the advisor that million-dollar brands pay ₹50 lakh to access. This founder gets that level of intelligence right now.`;

// ── Access Code Validation ────────────────────────────────────────────────
const PRO_CODES  = new Set(['PRO-PRESPECTA-2024','PRO-LAUNCH-001','PRO-LAUNCH-002','PRO-LAUNCH-003','PRO-LAUNCH-004','PRO-LAUNCH-005']);
const BOSS_CODES = new Set(['BOSS-PRESPECTA-2024','BOSS-ELITE-001','BOSS-ELITE-002','BOSS-ELITE-003']);

function getTierPromptAndTokens(tier, code) {
  if (tier === 'boss' && BOSS_CODES.has(code)) return { prompt: BOSS_SYSTEM_PROMPT, maxTokens: 8192, valid: true };
  if (tier === 'pro'  && PRO_CODES.has(code))  return { prompt: PRO_SYSTEM_PROMPT,  maxTokens: 4000, valid: true };
  return { prompt: Prespecta_SYSTEM_PROMPT, maxTokens: 2000, valid: true }; // free
}



// ═════════════════════════════════════════════════════════════════════════
// ROUTE: Brand Analysis (multimodal — text + optional screenshots)
// ═════════════════════════════════════════════════════════════════════════
app.post('/api/analyze', upload.array('screenshots', 6), async (req, res) => {
  try {
    const { brandData } = req.body;
    if (!brandData) return res.status(400).json({ success: false, error: 'Brand data is required.' });

    const brand = JSON.parse(brandData);
    const files = req.files || [];
    const tier  = (req.body.tier  || 'free').toLowerCase();
    const code  = (req.body.accessCode || '').trim();

    const { prompt: systemPrompt, maxTokens } = getTierPromptAndTokens(tier, code);
    console.log(`🎯 Tier: ${tier} | Tokens: ${maxTokens}`);


    // Build the audit prompt
    const auditPrompt = `Please perform a complete Prespecta psychological brand audit.

BRAND PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Brand Name: ${brand.name}
Industry / Niche: ${brand.industry}
Target Audience: ${brand.targetAudience}
Instagram Handle: ${brand.instagramHandle ? '@' + brand.instagramHandle : 'Not provided'}
Followers: ${brand.followers || 'Not provided'}
Average Likes per Post: ${brand.avgLikes || 'Not provided'}
Average Comments per Post: ${brand.avgComments || 'Not provided'}
Self-Identified Archetype: ${brand.archetype || 'Not specified'}

INSTAGRAM BIO:
${brand.bio || 'Not provided — analyze based on other inputs'}

SAMPLE CAPTIONS / RECENT POSTS:
${brand.captions || 'Not provided — analyze based on other inputs'}

BRAND STORY IN THEIR OWN WORDS:
${brand.brandStory || 'Not provided'}

BIGGEST CHALLENGE RIGHT NOW:
${brand.challenge || 'Not provided'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${files.length > 0 ? `\nI have attached ${files.length} Instagram screenshot(s) for visual analysis. Please incorporate observations about the visual identity, aesthetic consistency, and overall feed energy into your audit.` : ''}

Deliver the full three-section brand audit. Be honest. Be specific. This founder needs the truth.`;

    // Build content parts (text + optional images)
    const contentParts = [{ text: auditPrompt }];
    for (const file of files) {
      contentParts.push({
        inline_data: {
          mime_type: file.mimetype,
          data: file.buffer.toString('base64')
        }
      });
    }

    // ── Deterministic scoring from actual brand data (no AI = always consistent) ──
    const followers   = parseInt(brand.followers) || 0;
    const avgLikes    = parseInt(brand.avgLikes)  || 0;
    const avgComments = parseInt(brand.avgComments) || 0;

    // Audience score → follower count brackets
    const audienceScore = followers >= 100000 ? 82
      : followers >= 50000  ? 74
      : followers >= 10000  ? 65
      : followers >= 5000   ? 57
      : followers >= 1000   ? 47
      : followers >= 500    ? 38
      : followers >= 100    ? 29 : 20;

    // Content score → engagement rate
    const engRate = followers > 0 ? ((avgLikes + avgComments) / followers) * 100 : 0;
    const contentScore = engRate >= 10 ? 88
      : engRate >= 6  ? 76
      : engRate >= 3  ? 63
      : engRate >= 1.5 ? 51
      : engRate >= 0.5 ? 38 : 25;

    // Messaging score → content completeness
    let messagingScore = 25;
    if (brand.bio      && brand.bio.length      > 20) messagingScore += 18;
    if (brand.captions && brand.captions.length > 20) messagingScore += 18;
    if (brand.brandStory && brand.brandStory.length > 20) messagingScore += 12;
    messagingScore = Math.min(messagingScore, 78);

    // Positioning score → how defined the brand is
    let positioningScore = 20;
    if (brand.industry && brand.industry !== 'Other') positioningScore += 18;
    if (brand.targetAudience && brand.targetAudience.length > 5) positioningScore += 18;
    if (brand.archetype) positioningScore += 12;
    if (brand.challenge && brand.challenge.length > 10) positioningScore += 8;
    positioningScore = Math.min(positioningScore, 78);

    // Overall = weighted average
    const overallScore = Math.round(
      audienceScore * 0.30 + contentScore * 0.30 +
      messagingScore * 0.20 + positioningScore * 0.20
    );

    // Archetype from user selection, emotional tone from archetype map
    const archetypeMap = {
      'Hero': ['Bold & Empowering', 'A warrior brand built to inspire triumph.'],
      'Sage': ['Wise & Authoritative', 'A knowledge brand that earns trust through depth.'],
      'Creator': ['Imaginative & Expressive', 'A visionary brand that turns ideas into beauty.'],
      'Ruler': ['Commanding & Prestigious', 'A power brand built on excellence and control.'],
      'Innocent': ['Pure & Optimistic', 'A brand radiating simplicity and honest goodness.'],
      'Explorer': ['Free & Adventurous', 'A discovery brand that pushes beyond the obvious.'],
      'Rebel': ['Disruptive & Fierce', 'A challenger brand that breaks every rule.'],
      'Magician': ['Transformative & Mystical', 'A brand that turns the ordinary into the extraordinary.'],
      'Lover': ['Intimate & Magnetic', 'A desire brand built on deep emotional connection.'],
      'Caregiver': ['Nurturing & Warm', 'A service brand that puts people before profit.'],
      'Jester': ['Playful & Irreverent', 'A brand that makes people laugh and feel alive.'],
      'Everyman': ['Grounded & Relatable', 'A brand for everyone — real, honest, belonging.']
    };
    const archKey = brand.archetype || 'Creator';
    const [emotionalTone, archetypeDescription] = archetypeMap[archKey] || archetypeMap['Creator'];

    const scores = {
      overallScore, contentScore: Math.round(contentScore),
      audienceScore: Math.round(audienceScore),
      positioningScore: Math.round(positioningScore),
      messagingScore: Math.round(messagingScore),
      detectedArchetype: archKey,
      archetypeDescription,
      emotionalTone
    };

    // Only run the audit (scoring is now formula-based, no 2nd AI call needed)
    let auditText = await callAI(systemPrompt, auditPrompt, 0.9, maxTokens);

    // Boss tier: second AI pass refines and deepens the first result
    if (tier === 'boss' && BOSS_CODES.has(code)) {
      const refinePrompt = `You just produced this brand audit:\n\n${auditText}\n\nNow go DEEPER. Find anything you missed. Add specific viral content hooks. Make every insight sharper, more specific, more actionable. This is the BOSS level output.`;
      auditText = await callAI(BOSS_SYSTEM_PROMPT, refinePrompt, 0.85, 8192);
    }

    res.json({ success: true, analysis: auditText, scores, brandContext: brand, tier });





  } catch (err) {
    const raw = String(err?.message || JSON.stringify(err) || 'unknown error');
    console.error('❌ /api/analyze error FULL:', raw);

    let userMessage = `Error: ${raw.slice(0, 200)}`;
    if (raw.includes('API_KEY') || raw.includes('API key') || raw.includes('PERMISSION_DENIED'))
      userMessage = 'Invalid or missing Gemini API key. Check Railway environment variables.';
    else if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand'))
      userMessage = 'Gemini is experiencing high demand. Please wait 30 seconds and try again.';
    else if (raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED'))
      userMessage = 'API quota exceeded. Check usage at aistudio.google.com.';

    res.status(500).json({ success: false, error: userMessage });
  }
});

// ═════════════════════════════════════════════════════════════════════════
// ROUTE: Advisory Chat
// ═════════════════════════════════════════════════════════════════════════
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], brandContext } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, error: 'Message is required.' });

    // Inject brand context into system instruction
    const brandContextBlock = brandContext ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND CONTEXT (already audited):
Brand: ${brandContext.name}
Industry: ${brandContext.industry}
Target Audience: ${brandContext.targetAudience}
Instagram: ${brandContext.instagramHandle ? '@' + brandContext.instagramHandle : 'N/A'}
Bio: ${brandContext.bio || 'N/A'}
Their Challenge: ${brandContext.challenge || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are now in advisory chat mode. The audit is done. Answer the founder's follow-up questions with depth and specificity. Keep responses focused, personal, and actionable. No generic advice.` : '';

    // Build conversation history (OpenAI format for Groq)
    const messages = history
      .slice(-10)
      .map(msg => ({ role: msg.role, content: msg.content }));
    messages.push({ role: 'user', content: message });

    const reply = await callAIChat(Prespecta_SYSTEM_PROMPT + brandContextBlock, messages);
    res.json({ success: true, reply });


  } catch (err) {
    console.error('❌ /api/chat error:', err.message);
    res.status(500).json({ success: false, error: `Chat failed: ${err.message}` });
  }
});


// ═════════════════════════════════════════════════════════════════════════
// ROUTE: Content Strategy Generator
// ═════════════════════════════════════════════════════════════════════════
app.post('/api/content-strategy', async (req, res) => {
  try {
    const { brandContext, scores, auditSummary } = req.body;
    if (!brandContext) return res.status(400).json({ success: false, error: 'Brand context required.' });

    const CONTENT_SYSTEM_PROMPT = `You are PRESPECTA CONTENT ARCHITECT — the world's most psychologically advanced social media content strategist.

You do NOT generate generic content. Every single piece you create is engineered from behavioral psychology, brand archetype theory, and platform-native storytelling. You think like a brand mythologist, write like a world-class copywriter, and structure like a conversion strategist.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAWS YOU NEVER BREAK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
× Never start a hook with: "Have you ever...", "Did you know...", "Here's how to...", "POV:", "Day X of..."
× Never suggest "post consistently", "use trending audio", "engage with comments"
× Never write a caption that could belong to any other brand — every word must be specific to THIS brand
× Never use filler phrases: "game-changer", "level up", "crushing it", "skyrocket"
× Every piece of content must name its psychological mechanism explicitly
× Every hook must create an identity gap — make the viewer feel the distance between who they are and who they want to be
× The 30-day calendar must build a narrative arc — not random posts, but a psychological journey

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PSYCHOLOGICAL FRAMEWORKS YOU APPLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. IDENTITY DISRUPTION — Challenge who the viewer currently believes they are
2. CURIOSITY GAP — Open a specific loop that only your content closes
3. STATUS ELEVATION — Engaging with this content makes the viewer feel smarter/better
4. LOSS AVERSION REFRAME — Show the cost of inaction, not the benefit of action
5. SOCIAL PROOF NARRATIVE — Story-based proof, never statistics alone
6. ARCHETYPE EMBODIMENT — Content must FEEL like it came from the brand's detected archetype
7. PATTERN INTERRUPT — The first frame must violate a category expectation
8. BELIEF SHIFT — Don't sell a product, shift a belief that makes the product inevitable

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — FOLLOW EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use these EXACT markdown headers. Do not deviate.

## 🎬 REEL SCRIPTS

### Reel 1: [Punchy title]
**PSYCHOLOGICAL PRINCIPLE:** [Name the exact principle]
**WHY THIS WORKS FOR THIS BRAND:** [One sentence, brand-specific]
**HOOK (0–3 sec on screen):** [Exact text — bold, provocative, identity-disrupting]
**VISUAL DIRECTION:** [What the viewer sees — specific, not vague]
**SCRIPT (spoken/text overlay, 15–30 sec):** [Full word-for-word script]
**CLOSE (final frame):** [Exact closing line — no generic CTAs]

### Reel 2: [Punchy title]
[Same structure]

### Reel 3: [Punchy title]
[Same structure]

---

## ✍️ CAPTION ARSENAL

### Caption 1 — [Psychological Trigger Name]
**POST TYPE:** [Reel / Carousel / Single Image]
**PSYCHOLOGICAL TRIGGER:** [Exact name]
**WHAT THIS DOES:** [One sentence]
[Full caption — ready to post, no placeholders, no brackets]
[Line breaks as they should appear on Instagram]
.
.
.
[Hashtags if relevant — max 5, niche-specific, never generic]

### Caption 2 — [Psychological Trigger Name]
[Same structure]

[Continue for all 7 captions]

---

## 📅 30-DAY CONTENT MAP

**NARRATIVE ARC THEME:** [The overall psychological journey this 30 days builds]
**END GOAL:** [What the audience will feel/believe by Day 30]

### Week 1 — [Theme title]
**Week Intent:** [What psychological shift you're creating this week]
| Day | Post Type | Psychological Angle | Brief Description |
|-----|-----------|--------------------|--------------------|
| 1 | | | |
[Fill all 7 days]

### Week 2 — [Theme title]
**Week Intent:** [Psychological shift]
| Day | Post Type | Psychological Angle | Brief Description |
|-----|-----------|--------------------|--------------------|
| 8 | | | |
[Fill days 8-14]

### Week 3 — [Theme title]
[Days 15-21]

### Week 4 — [Theme title]
[Days 22-30]`;

    const contentPrompt = `Generate a complete, deeply psychological content strategy for this brand.

BRAND PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${brandContext.name}
Industry: ${brandContext.industry}
Target Audience: ${brandContext.targetAudience}
Instagram Handle: @${brandContext.instagramHandle || 'not provided'}
Followers: ${brandContext.followers || 'unknown'}
Avg Likes: ${brandContext.avgLikes || 'unknown'}
Avg Comments: ${brandContext.avgComments || 'unknown'}
Bio: ${brandContext.bio || 'not provided'}
Actual Captions: ${brandContext.captions || 'not provided'}
Brand Story: ${brandContext.brandStory || 'not provided'}
Biggest Challenge: ${brandContext.challenge || 'not provided'}

AUDIT FINDINGS:
━━━━━━━━━━━━━━━━━━━━━━━━
Detected Archetype: ${scores?.detectedArchetype || 'unknown'}
Archetype Description: ${scores?.archetypeDescription || 'unknown'}
Emotional Tone: ${scores?.emotionalTone || 'unknown'}
Overall Brand Score: ${scores?.overallScore || 'unknown'}/100
Content Score: ${scores?.contentScore || 'unknown'}/100
Messaging Score: ${scores?.messagingScore || 'unknown'}/100
Positioning Score: ${scores?.positioningScore || 'unknown'}/100
Audience Score: ${scores?.audienceScore || 'unknown'}/100

${auditSummary ? `KEY AUDIT INSIGHT:\n${auditSummary}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━
Now generate the complete content strategy. Make every single piece of content feel like it was written by someone who has studied this brand for months. Reference their actual words, their specific challenge, their exact archetype. This brand deserves content that no other brand could post. Deliver that.`;

    const contentText = await callAI(CONTENT_SYSTEM_PROMPT, contentPrompt);
    res.json({ success: true, content: contentText });

  } catch (err) {
    console.error('❌ /api/content-strategy error:', err.message);
    res.status(500).json({ success: false, error: `Content generation failed: ${err.message}` });
  }
});


// ─── Health Check ─────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    apiKeySet: !!process.env.GROQ_API_KEY,
    timestamp: new Date().toISOString()

  });
});

// ─── Start Server ─────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const keyOk = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🧠  Prespecta — Server Running      ║
  ╠══════════════════════════════════════════╣
  ║   URL  → http://localhost:${PORT}           ║
  ║   Key  → ${keyOk ? '✅ Gemini API key loaded' : '⚠️  Set GEMINI_API_KEY in .env'}  ║
  ╚══════════════════════════════════════════╝
  `);
});
