/* ═══════════════════════════════════════════════════════════════════════
   BrandMind AI — Frontend Logic
   Multi-step SPA · Drag-drop uploads · AI analysis · Chat advisor
   ═══════════════════════════════════════════════════════════════════════ */

// ── Jungian Archetype Data ───────────────────────────────────────────────
const ARCHETYPES = [
  { id: 'Hero',      emoji: '⚔️',  desc: 'Triumph & Courage',       brands: 'Nike, Red Bull' },
  { id: 'Sage',      emoji: '🦉',  desc: 'Wisdom & Truth',           brands: 'Google, TED' },
  { id: 'Creator',   emoji: '🎨',  desc: 'Imagination & Craft',      brands: 'Adobe, Lego' },
  { id: 'Ruler',     emoji: '👑',  desc: 'Control & Prestige',       brands: 'Mercedes, Rolex' },
  { id: 'Innocent',  emoji: '🌸',  desc: 'Simplicity & Goodness',    brands: 'Dove, Airbnb' },
  { id: 'Explorer',  emoji: '🧭',  desc: 'Freedom & Discovery',      brands: 'Patagonia, Jeep' },
  { id: 'Rebel',     emoji: '🔥',  desc: 'Disruption & Defiance',    brands: 'Harley-Davidson' },
  { id: 'Magician',  emoji: '✨',  desc: 'Transformation & Wonder',  brands: 'Apple, Disney' },
  { id: 'Lover',     emoji: '💖',  desc: 'Intimacy & Desire',        brands: 'Chanel, Tiffany' },
  { id: 'Caregiver', emoji: '🤝',  desc: 'Nurturing & Service',      brands: 'TOMS, Dove' },
  { id: 'Jester',    emoji: '🃏',  desc: 'Fun & Irreverence',        brands: 'Old Spice' },
  { id: 'Everyman',  emoji: '🌍',  desc: 'Belonging & Ground',       brands: 'IKEA, Target' },
];

// ── App State ────────────────────────────────────────────────────────────
const state = {
  uploadedFiles: [],   // File objects selected by user
  brandContext: null,  // Brand data from form
  scores: null,        // Analysis scores
  chatHistory: [],     // [{role, content}]
  isAnalyzing: false,
  isChatting: false,
};

// ── DOM Refs ─────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// Sections
const SEC = {
  hero:     $('hero'),
  setup:    $('setup'),
  analysis: $('analysis'),
  chat:     $('chat'),
};

// ── Utility: Show/Hide Section ───────────────────────────────────────────
function showSection(name) {
  Object.entries(SEC).forEach(([k, el]) => {
    el.style.display = k === name ? 'block' : 'none';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Utility: Simple Markdown Renderer ────────────────────────────────────
function renderMD(text) {
  if (!text) return '';
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*)/gm, '<h4>$1</h4>')
    .replace(/^## (.*)/gm,  '<h3>$1</h3>')
    .replace(/^# (.*)/gm,   '<h2>$1</h2>')
    // Bold / Italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,     '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Lists
    .replace(/^[\-\*] (.*)/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    // Paragraphs
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<p>${html}</p>`;
}

// ── Utility: Show a dismissible error banner (no browser alert) ──────────
function showErrorBanner(message) {
  // Remove any existing banner
  document.getElementById('errorBanner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'errorBanner';
  banner.style.cssText = `
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    z-index: 9999; max-width: 520px; width: 90%;
    background: rgba(220, 38, 38, 0.12);
    border: 1px solid rgba(220, 38, 38, 0.4);
    backdrop-filter: blur(20px);
    border-radius: 12px; padding: 16px 20px;
    display: flex; align-items: flex-start; gap: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: slideDown 0.3s ease;
  `;
  banner.innerHTML = `
    <span style="font-size:1.3rem;flex-shrink:0">⚠️</span>
    <div style="flex:1">
      <div style="font-weight:600;color:#fca5a5;margin-bottom:4px">Analysis failed</div>
      <div style="font-size:0.88rem;color:#fecaca;line-height:1.5">${message}</div>
    </div>
    <button onclick="this.parentElement.remove()" style="
      background:none;border:none;color:#fca5a5;font-size:1.2rem;
      cursor:pointer;flex-shrink:0;padding:0 4px;line-height:1
    ">×</button>
  `;
  document.body.appendChild(banner);
  // Auto-dismiss after 8 seconds
  setTimeout(() => banner.remove(), 8000);
}


function parseAuditSections(text) {
  const perception = text.match(/##\s*🔮\s*EMOTIONAL PERCEPTION([\s\S]*?)(?=##\s*🧠|$)/i)?.[1]?.trim() || '';
  const gap        = text.match(/##\s*🧠\s*THE PSYCHOLOGICAL GAP([\s\S]*?)(?=##\s*✍️|$)/i)?.[1]?.trim() || '';
  const rewrite    = text.match(/##\s*✍️\s*THE REWRITE([\s\S]*?)$/i)?.[1]?.trim() || '';
  return { perception, gap, rewrite };
}

// ── Utility: Render the Rewrite Section (BEFORE/AFTER/WHY) ──────────────
function renderRewriteSection(text) {
  // Try to extract BEFORE / AFTER / WHY IT WORKS blocks
  const before = text.match(/\*\*BEFORE:\*\*\s*([\s\S]*?)(?=\*\*AFTER:|$)/i)?.[1]?.trim()           || '';
  const after  = text.match(/\*\*AFTER:\*\*\s*([\s\S]*?)(?=\*\*WHY IT WORKS:|$)/i)?.[1]?.trim()     || '';
  const why    = text.match(/\*\*WHY IT WORKS:\*\*\s*([\s\S]*?)$/i)?.[1]?.trim()                    || '';

  if (!before && !after) {
    // Fallback: just render as markdown
    return `<div class="markdown-body">${renderMD(text)}</div>`;
  }

  return `
    <div class="rewrite-block">
      <div class="rewrite-pair">
        <div class="rewrite-before">
          <div class="rw-label before">Before</div>
          <div class="rw-text">${before.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="rewrite-after">
          <div class="rw-label after">After</div>
          <div class="rw-text">${after.replace(/\n/g, '<br>')}</div>
        </div>
      </div>
      ${why ? `
      <div class="rewrite-why">
        <div class="why-label">Why it works</div>
        ${why.replace(/\n/g, '<br>')}
      </div>` : ''}
    </div>
  `;
}

// ── Nav: Scroll behavior ─────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.nav');
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Navigation CTAs ──────────────────────────────────────────────────────
$('heroCTA')?.addEventListener('click', () => showSection('setup'));
$('navCTA')?.addEventListener('click',  () => showSection('setup'));
$('navLogo')?.addEventListener('click', (e) => { e.preventDefault(); showSection('hero'); });
$('navHowItWorks')?.addEventListener('click', () => {
  document.getElementById('howItWorks')?.scrollIntoView({ behavior: 'smooth' });
});
$('restartBtn')?.addEventListener('click', () => showSection('setup'));
$('openChatBtn')?.addEventListener('click', () => {
  showSection('chat');
  populateChatSidebar();
  injectWelcomeMessage();
});
$('backToAnalysisBtn')?.addEventListener('click', () => showSection('analysis'));

// ── Build Archetype Grid ─────────────────────────────────────────────────
function buildArchetypeGrid() {
  const grid = $('archetypeGrid');
  if (!grid) return;
  grid.innerHTML = ARCHETYPES.map(a => `
    <div class="archetype-card" data-id="${a.id}" role="button" tabindex="0" aria-label="${a.id} archetype">
      <div class="ac-emoji">${a.emoji}</div>
      <div class="ac-name">${a.id}</div>
      <div class="ac-desc">${a.desc}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.archetype-card').forEach(card => {
    const select = () => {
      grid.querySelectorAll('.archetype-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      $('selectedArchetype').value = card.dataset.id;
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') select(); });
  });
}
buildArchetypeGrid();

// ── File Drag & Drop ─────────────────────────────────────────────────────
function setupDropZone() {
  const dropZone = $('dropZone');
  const fileInput = $('fileInput');
  if (!dropZone || !fileInput) return;

  const preventDefaults = e => { e.preventDefault(); e.stopPropagation(); };

  ['dragenter','dragover','dragleave','drop'].forEach(ev =>
    dropZone.addEventListener(ev, preventDefaults));

  dropZone.addEventListener('dragenter', () => dropZone.classList.add('dragover'));
  dropZone.addEventListener('dragover',  () => dropZone.classList.add('dragover'));
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

  dropZone.addEventListener('drop', e => {
    dropZone.classList.remove('dragover');
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    addFiles(files);
  });

  fileInput.addEventListener('change', () => {
    addFiles([...fileInput.files]);
    fileInput.value = '';
  });

  dropZone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });
}

function addFiles(newFiles) {
  const remaining = 6 - state.uploadedFiles.length;
  const toAdd = newFiles.slice(0, remaining);
  state.uploadedFiles.push(...toAdd);
  renderPreviews();
}

function removeFile(index) {
  state.uploadedFiles.splice(index, 1);
  renderPreviews();
}

function renderPreviews() {
  const container = $('imagePreviews');
  if (!container) return;
  container.innerHTML = state.uploadedFiles.map((file, i) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="preview-item">
        <img src="${url}" alt="Screenshot ${i + 1}" loading="lazy">
        <button class="preview-remove" aria-label="Remove screenshot ${i + 1}" data-index="${i}">×</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.preview-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFile(Number(btn.dataset.index)));
  });
}

setupDropZone();

// ── Loading Overlay Steps ─────────────────────────────────────────────────
let loadingStepTimer = null;
function startLoadingSteps() {
  const steps = document.querySelectorAll('.ls-step');
  let idx = 0;
  steps.forEach(s => s.classList.remove('active', 'done'));
  steps[0].classList.add('active');

  loadingStepTimer = setInterval(() => {
    if (idx < steps.length - 1) {
      steps[idx].classList.remove('active');
      steps[idx].classList.add('done');
      idx++;
      steps[idx].classList.add('active');
    }
  }, 3500);
}
function stopLoadingSteps() {
  clearInterval(loadingStepTimer);
  document.querySelectorAll('.ls-step').forEach(s => s.classList.remove('active'));
}

function showLoading(visible) {
  const overlay = $('loadingOverlay');
  overlay.style.display = visible ? 'flex' : 'none';
  if (visible) startLoadingSteps();
  else stopLoadingSteps();
}

// ── Form Submission ───────────────────────────────────────────────────────
$('brandForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.isAnalyzing) return;

  const form = e.target;
  const required = ['brandName', 'industry', 'targetAudience'];
  for (const id of required) {
    if (!$(id).value.trim()) {
      $(id).focus();
      $(id).style.borderColor = '#ef4444';
      setTimeout(() => $(id).style.borderColor = '', 2000);
      return;
    }
  }

  const brandData = {
    name:            $('brandName').value.trim(),
    industry:        $('industry').value.trim(),
    targetAudience:  $('targetAudience').value.trim(),
    instagramHandle: $('instagramHandle').value.trim(),
    followers:       $('followers').value.trim(),
    avgLikes:        $('avgLikes').value.trim(),
    avgComments:     $('avgComments').value.trim(),
    bio:             $('bio').value.trim(),
    captions:        $('captions').value.trim(),
    brandStory:      $('brandStory').value.trim(),
    challenge:       $('challenge').value.trim(),
    archetype:       $('selectedArchetype').value,
  };

  state.isAnalyzing = true;
  state.brandContext = brandData;

  // Update button
  const btn = $('analyzeBtn');
  btn.querySelector('.submit-default').style.display = 'none';
  btn.querySelector('.submit-loading').style.display = 'flex';
  btn.disabled = true;

  showLoading(true);

  try {
    // Build FormData (multipart for image uploads)
    const fd = new FormData();
    fd.append('brandData', JSON.stringify(brandData));
    state.uploadedFiles.forEach((file, i) => {
      fd.append('screenshots', file, `screenshot-${i + 1}.${file.type.split('/')[1]}`);
    });

    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: fd,
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Analysis failed');

    // Store results
    state.scores = data.scores;
    state.chatHistory = [];

    // Render analysis
    renderAnalysis(data.analysis, data.scores, brandData);
    showSection('analysis');

  } catch (err) {
    console.error(err);
    showErrorBanner(err.message || 'Something went wrong. Please try again.');
  } finally {
    state.isAnalyzing = false;
    btn.querySelector('.submit-default').style.display = 'flex';
    btn.querySelector('.submit-loading').style.display = 'none';
    btn.disabled = false;
    showLoading(false);
  }
});

// ── Render Analysis Results ───────────────────────────────────────────────
function renderAnalysis(auditText, scores, brand) {
  // ── Brand pill ──
  $('pillAvatar').textContent = brand.name.charAt(0).toUpperCase();
  $('pillName').textContent   = brand.name;
  $('pillSub').textContent    = brand.industry;

  // ── Score ring (SVG gradient via inline defs) ──
  injectSVGGradient();
  animateScoreRing(scores.overallScore || 0);
  animateCounter($('scoreNumber'), scores.overallScore || 0);

  // ── Archetype ──
  $('arArchetypeName').textContent = scores.detectedArchetype || '—';
  $('arArchetypeDesc').textContent = scores.archetypeDescription || '';

  // ── Emotional tone ──
  $('emotionalToneText').textContent = scores.emotionalTone || '—';

  // ── Score bars ──
  animateBar('bar-content',     scores.contentScore     || 0, 'sbar-fill');
  animateBar('bar-audience',    scores.audienceScore    || 0, 'sbar-fill');
  animateBar('bar-positioning', scores.positioningScore || 0, 'sbar-fill');
  animateBar('bar-messaging',   scores.messagingScore   || 0, 'sbar-fill');

  // ── Parse three sections ──
  const sections = parseAuditSections(auditText);

  // Emotional Perception
  $('perceptionBody').className = 'audit-card-body markdown-body';
  $('perceptionBody').innerHTML = sections.perception
    ? renderMD(sections.perception)
    : renderMD(auditText.split('##')[0] || 'Analysis complete.');

  // Psychological Gap
  $('gapBody').className = 'audit-card-body markdown-body';
  $('gapBody').innerHTML = sections.gap
    ? renderMD(sections.gap)
    : '<p>See full analysis above.</p>';

  // The Rewrite
  $('rewriteBody').className = 'audit-card-body';
  $('rewriteBody').innerHTML = sections.rewrite
    ? renderRewriteSection(sections.rewrite)
    : '<div class="markdown-body"><p>Rewrite section not parsed. Check full analysis.</p></div>';
}

// ── SVG gradient injection (for score ring) ──────────────────────────────
function injectSVGGradient() {
  if (document.getElementById('scoreSVGGrad')) return;
  const svg = document.querySelector('.score-ring');
  if (!svg) return;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7c3aed"/>
      <stop offset="50%"  stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
  `;
  defs.id = 'scoreSVGGrad';
  svg.prepend(defs);
}

function animateScoreRing(score) {
  const circle = $('ringFill');
  if (!circle) return;
  const circumference = 2 * Math.PI * 52; // r=52
  const offset = circumference - (circumference * score / 100);
  requestAnimationFrame(() => {
    setTimeout(() => {
      circle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)';
      circle.style.strokeDashoffset = offset;
    }, 300);
  });
}

function animateCounter(el, target) {
  if (!el) return;
  let current = 0;
  const step = target / 60;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.round(current);
    if (current >= target) clearInterval(timer);
  }, 25);
}

function animateBar(barId, score, fillClass) {
  const item = $(barId);
  if (!item) return;
  const fill = item.querySelector('.' + fillClass);
  const val  = item.querySelector('.sbar-val');
  if (!fill || !val) return;

  setTimeout(() => {
    fill.style.width = score + '%';
    val.textContent = score;
  }, 400);
}

// ── Chat: Populate sidebar ───────────────────────────────────────────────
function populateChatSidebar() {
  const brand = state.brandContext;
  if (!brand) return;

  const initial = brand.name.charAt(0).toUpperCase();
  $('sbAvatar').textContent  = initial;
  $('sbName').textContent    = brand.name;
  $('sbScore').textContent   = `Score: ${state.scores?.overallScore ?? '—'}/100`;

  // Quick actions click handlers
  document.querySelectorAll('.qa-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = btn.dataset.msg;
      if (msg) sendChatMessage(msg);
    });
  });
}

// ── Chat: Welcome message ─────────────────────────────────────────────────
function injectWelcomeMessage() {
  const container = $('chatMessages');
  if (!container || container.querySelector('.msg')) return; // already has messages

  const brand = state.brandContext;
  const archetype = state.scores?.detectedArchetype || 'Creator';
  const score     = state.scores?.overallScore ?? '?';
  const tone      = state.scores?.emotionalTone || 'interesting';

  const welcome = `Hey — I've just finished reading ${brand?.name || 'your brand'}. 

Your overall score came in at **${score}/100**, and what I'm seeing is a brand with a **${archetype}** archetype vibe — ${tone.toLowerCase()}.

There's real potential here, and some specific things we need to untangle. The audit breaks it down, but I'm here now if you want to go deeper on anything specific.

What's on your mind? Ask me anything — strategy, captions, why you're stuck, what to post next week. I know your brand context.`;

  appendMessage('ai', welcome);
}

// ── Chat: Append message ─────────────────────────────────────────────────
function appendMessage(role, content) {
  const container = $('chatMessages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `msg msg-${role}`;
  div.innerHTML = `
    <div class="msg-avatar">${role === 'ai' ? '🧠' : '👤'}</div>
    <div class="msg-bubble markdown-body">${renderMD(content)}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ── Chat: Typing indicator ───────────────────────────────────────────────
function showTyping() {
  const container = $('chatMessages');
  if (!container) return null;
  const div = document.createElement('div');
  div.className = 'msg msg-ai';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="msg-avatar">🧠</div>
    <div class="msg-bubble">
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function removeTyping() {
  $('typingIndicator')?.remove();
}

// ── Chat: Send message ────────────────────────────────────────────────────
async function sendChatMessage(text) {
  if (state.isChatting || !text?.trim()) return;

  const input = $('chatInput');
  const sendBtn = $('sendBtn');

  state.isChatting = true;
  sendBtn.disabled = true;

  appendMessage('user', text);
  if (input) input.value = '';
  autoGrowTextarea(input);

  const typingEl = showTyping();

  // Add to history
  state.chatHistory.push({ role: 'user', content: text });

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: state.chatHistory.slice(-10),
        brandContext: state.brandContext,
      }),
    });
    const data = await res.json();

    removeTyping();

    if (!data.success) throw new Error(data.error || 'Chat failed');

    appendMessage('ai', data.reply);
    state.chatHistory.push({ role: 'model', content: data.reply });

  } catch (err) {
    removeTyping();
    appendMessage('ai', `Something went wrong: ${err.message}. Please try again.`);
    console.error(err);
  } finally {
    state.isChatting = false;
    sendBtn.disabled = !$('chatInput')?.value.trim();
  }
}

// ── Chat Input: Auto-grow textarea ─────────────────────────────────────
function autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 150) + 'px';
}

// ── Chat Input: Event Listeners ───────────────────────────────────────────
const chatInput = $('chatInput');
const sendBtn   = $('sendBtn');

chatInput?.addEventListener('input', () => {
  autoGrowTextarea(chatInput);
  if (sendBtn) sendBtn.disabled = !chatInput.value.trim();
});

chatInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (msg) sendChatMessage(msg);
  }
});

sendBtn?.addEventListener('click', () => {
  const msg = chatInput?.value.trim();
  if (msg) sendChatMessage(msg);
});

// ── Check API health on load ──────────────────────────────────────────────
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (!data.apiKeySet) {
      console.warn('⚠️ BrandMind: GEMINI_API_KEY not set in .env. Analysis will fail.');
    }
  } catch (e) {
    console.warn('BrandMind server health check failed:', e.message);
  }
}
checkHealth();

// ── Init: show hero ───────────────────────────────────────────────────────
showSection('hero');

console.log('%c🧠 BrandMind AI', 'font-size:18px;font-weight:bold;color:#a78bfa;');
console.log('%cEmotionally intelligent brand advisor — ready.', 'color:#64748b;');
