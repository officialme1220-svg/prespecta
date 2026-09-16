import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
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

// ─── Gemini Client ────────────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

// ═════════════════════════════════════════════════════════════════════════
// ROUTE: Brand Analysis (multimodal — text + optional screenshots)
// ═════════════════════════════════════════════════════════════════════════
app.post('/api/analyze', upload.array('screenshots', 6), async (req, res) => {
  try {
    const { brandData } = req.body;
    if (!brandData) return res.status(400).json({ success: false, error: 'Brand data is required.' });

    const brand = JSON.parse(brandData);
    const files = req.files || [];

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
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString('base64')
        }
      });
    }

    // Run audit and scoring in parallel, with auto-retry for 503 overload
    const [auditResponse, scoreResponse] = await Promise.all([
      withRetry(() => ai.models.generateContent({
        model: 'gemini-3.6-flash',
        config: { systemInstruction: Prespecta_SYSTEM_PROMPT },
        contents: [{ role: 'user', parts: contentParts }]
      })),
      withRetry(() => ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{
          role: 'user',
          parts: [{
            text: `You are a brand diagnostics engine. Score this brand HONESTLY and return a raw JSON object only — no markdown, no explanation, no code fences.

Brand: ${brand.name}
Industry: ${brand.industry}
Target Audience: ${brand.targetAudience}
Followers: ${brand.followers || 'unknown'}
Avg Likes: ${brand.avgLikes || 'unknown'}
Avg Comments: ${brand.avgComments || 'unknown'}
Bio: ${brand.bio || 'not provided'}
Sample Captions: ${brand.captions || 'not provided'}
Challenge: ${brand.challenge || 'not provided'}

Return ONLY this exact JSON structure:
{
  "overallScore": <integer 0-100>,
  "contentScore": <integer 0-100>,
  "audienceScore": <integer 0-100>,
  "positioningScore": <integer 0-100>,
  "messagingScore": <integer 0-100>,
  "detectedArchetype": "<one of the 12 Jungian archetypes>",
  "archetypeDescription": "<one vivid sentence about the current archetype energy — honest>",
  "emotionalTone": "<2-4 word description of current brand tone e.g. 'Confident but distant' or 'Warm but invisible'>"
}`
          }]
        }]
      }))
    ]);

    // Parse scores safely
    let scores = {
      overallScore: 55,
      contentScore: 60,
      audienceScore: 50,
      positioningScore: 52,
      messagingScore: 58,
      detectedArchetype: 'Creator',
      archetypeDescription: 'Building something real but not yet showing the full picture to the world.',
      emotionalTone: 'Ambitious but unclear'
    };

    try {
      const rawScore = scoreResponse.text
        .replace(/```json\n?|\n?```/gi, '')
        .trim();
      const parsed = JSON.parse(rawScore);
      scores = { ...scores, ...parsed };
    } catch (parseErr) {
      console.warn('Score parse failed, using defaults:', parseErr.message);
    }

    res.json({
      success: true,
      analysis: auditResponse.text,
      scores,
      brandContext: brand
    });

  } catch (err) {
    const raw = JSON.stringify(err?.message || err) || '';
    console.error('❌ /api/analyze error:', raw);

    let userMessage = 'Analysis failed. Please try again.';
    if (raw.includes('API_KEY') || raw.includes('API key') || raw.includes('PERMISSION_DENIED'))
      userMessage = 'Invalid or missing Gemini API key. Check your .env file and restart the server.';
    else if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand'))
      userMessage = 'Gemini is experiencing high demand right now. Please wait 30 seconds and try again.';
    else if (raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED'))
      userMessage = 'API quota exceeded. Check your usage at aistudio.google.com.';

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

    // Build conversation history
    const contents = history
      .slice(-10) // keep last 10 turns to manage context
      .map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      config: { systemInstruction: Prespecta_SYSTEM_PROMPT + brandContextBlock },
      contents
    });

    res.json({ success: true, reply: response.text });

  } catch (err) {
    console.error('❌ /api/chat error:', err.message);
    res.status(500).json({ success: false, error: 'Chat failed. Please try again.' });
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

    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3.6-flash',
      config: { systemInstruction: CONTENT_SYSTEM_PROMPT },
      contents: [{ role: 'user', parts: [{ text: contentPrompt }] }]
    }));

    res.json({ success: true, content: response.text });

  } catch (err) {
    const raw = JSON.stringify(err?.message || err) || '';
    console.error('❌ /api/content-strategy error:', raw);
    let userMessage = 'Content generation failed. Please try again.';
    if (raw.includes('503') || raw.includes('UNAVAILABLE')) userMessage = 'Gemini is busy right now. Please wait 30 seconds and try again.';
    res.status(500).json({ success: false, error: userMessage });
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    apiKeySet: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here',
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
