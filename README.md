# BrandMind AI 🧠

> Emotionally intelligent digital brand advisor — powered by Behavioral Psychology & Google Gemini AI

---

## What It Does

BrandMind reads the **emotional fingerprint** of your brand and gives you:

1. **🔮 Emotional Perception** — How a cold visitor actually *feels* when they land on your brand
2. **🧠 The Psychological Gap** — The exact psychological mechanism (archetype mismatch, identity dissonance, cognitive friction) causing low engagement
3. **✍️ The Rewrite** — A concrete before/after of your actual bio or caption, with the psychological principle explained

Anchored in **Jungian Brand Archetypes**, **Loss Aversion**, **Status Signaling**, **Identity-Based Marketing**, and **Cognitive Load Theory**.

---

## Setup (5 Minutes)

### Step 1 — Install Node.js

Download and install from **https://nodejs.org** (LTS version recommended).

After installing, open a terminal and verify:
```bash
node --version   # should print v18+ or higher
npm --version
```

### Step 2 — Get a Gemini API Key (Free)

1. Go to **https://aistudio.google.com**
2. Click **"Get API Key"** → Create a key (it's free)
3. Copy the key

### Step 3 — Configure Environment

Open the `.env` file in this folder and replace the placeholder:

```
GEMINI_API_KEY=your_actual_key_here
PORT=3000
```

### Step 4 — Install Dependencies

Open a terminal in this folder and run:

```bash
npm install
```

### Step 5 — Start the Server

```bash
npm start
```

You'll see:
```
╔══════════════════════════════════════════╗
║   🧠  BrandMind AI — Server Running      ║
╠══════════════════════════════════════════╣
║   URL  → http://localhost:3000           ║
║   Key  → ✅ Gemini API key loaded        ║
╚══════════════════════════════════════════╝
```

### Step 6 — Open the App

Navigate to **http://localhost:3000** in your browser.

---

## Project Structure

```
brandmind-ai/
├── server.js           ← Express backend (Gemini API integration)
├── package.json        ← Node dependencies
├── .env                ← Your API key (NEVER commit this)
└── public/
    ├── index.html      ← Full SPA (hero → form → analysis → chat)
    ├── styles.css      ← Glassmorphism + animated gradient UI
    └── app.js          ← Frontend logic
```

---

## API Endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/analyze` | Brand audit — accepts multipart form with brand data + screenshots |
| `POST` | `/api/chat` | Chat advisor — accepts message + history + brand context |
| `GET`  | `/api/health` | Server health + API key status check |

---

## How to Use

1. **Fill the form** — brand name, niche, Instagram details, bio, captions
2. **Drop screenshots** — drag your Instagram feed/post screenshots for visual AI analysis
3. **Get your audit** — see the 3-section psychological breakdown + brand score
4. **Chat** — ask anything: "rewrite my bio", "30-day plan", "why am I stuck?"

---

## Psychological Framework

| Framework | Application |
|---|---|
| Jungian Archetypes (12) | Detect brand personality energy + identify mismatches |
| Loss Aversion | Reframe messaging from "what you gain" to "what you miss" |
| Status Signaling | Analyze social currency and aspirational positioning |
| Identity-Based Marketing | Does the brand sell identity or just products? |
| Cognitive Load Theory | Is the message clear in 3 seconds? |
| Social Proof Psychology | Does the brand feel magnetic or isolated? |

---

## Tips for Best Results

- **Be brutally honest** in your brand description — vague inputs = vague advice
- **Paste real captions** — the ones you feel most uncertain about
- **Drop screenshots** — the visual analysis catches what text misses
- The **challenge field** is the most important: be specific ("stuck at 800 followers for 6 months" > "need more engagement")
