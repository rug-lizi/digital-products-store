# 🛒 Digital Products Store | 数字产品独立站

> Self-hosted digital product store with Stripe payments, instant delivery, and analytics dashboard.
> 基于 Stripe 支付的自建数字产品销售网站，支持自动发货 + 流量监控。

🔗 **Live Store**: [shop.liyw.top](https://shop.liyw.top) · **Admin Dashboard**: [shop.liyw.top/admin](https://shop.liyw.top/admin)

---

## ✨ 6 Digital Products for Sale

### 1. 📝 100+ ChatGPT Prompts for Ultimate Productivity — $9.99

103 battle-tested prompts across 7 categories. Copy-paste ready.

**Free Sample — 5 Prompts:**

<details>
<summary>📂 Content Writing Prompts (click to expand)</summary>

```
Prompt: Blog Post Outline Generator
---
I need a blog post about [TOPIC] targeting [AUDIENCE]. Create a detailed outline with:
- A compelling headline (give 3 options)
- Introduction hook (2-3 sentences that grab attention)
- 5-7 main sections with subpoints
- Key statistics or data points to include
- A conclusion with a clear call-to-action
- 3 meta description options for SEO
```

```
Prompt: SEO-Optimized Article Writer
---
Write a 1500-word SEO-optimized article about [TOPIC]. Requirements:
- Use the keyword "[KEYWORD]" naturally 8-12 times
- Include H2 and H3 subheadings
- Write in a [TONE: conversational/professional/casual] style
- Add a meta description (155 characters max)
- Include 3 internal linking suggestions
- End with an FAQ section (5 questions)
```

```
Prompt: Social Media Caption Pack
---
Create 10 social media captions for [PLATFORM] about [TOPIC]. Each caption should:
- Be under [CHARACTER LIMIT] characters
- Include a hook in the first line
- Use 2-3 relevant emojis
- End with a call-to-action
- Suggest an image/pairing idea
Provide captions in 3 tones: professional, casual, witty
```

```
Prompt: Email Newsletter Writer
---
Write a newsletter email about [TOPIC] for [AUDIENCE]. Include:
- Subject line (give 5 options, A/B test friendly)
- Preview text (40-90 characters)
- Opening hook
- 3 key sections with actionable insights
- A personal anecdote or case study
- Clear CTA button text
- P.S. line for engagement
```

```
Prompt: Landing Page Copy Generator
---
Write conversion-focused landing page copy for [PRODUCT/SERVICE]. Include:
- Hero headline (10 words max, benefit-driven)
- Subheadline (expand on the promise)
- 3 benefit blocks (icon + title + description)
- Social proof section (testimonial template)
- Feature comparison table
- FAQ section (5 objections)
- CTA button text (3 urgency variations)
```

</details>

**Full pack includes:** 103 prompts · 7 categories (Content Writing, Business Strategy, Data Analysis, Marketing, Productivity, Problem-Solving, Automation) · Lifetime access

---

### 2. 🔧 Python Automation Scripts Toolkit — $19.99

20 production-ready Python scripts with full source code, error handling, and usage examples.

**Free Sample — Bulk Email Sender:**

<details>
<summary>📂 Script 1: Bulk Email Sender (click to expand)</summary>

```python
"""
Bulk Email Sender — Send personalized emails to a list of recipients.
Uses: Marketing outreach, client communication, newsletter distribution
Requirements: pip install yagmail pandas
"""

import yagmail
import pandas as pd
import time
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    filename=f'email_log_{datetime.now().strftime("%Y%m%d")}.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# ===== CONFIGURATION =====
GMAIL_USER = 'your_email@gmail.com'
GMAIL_PASSWORD = 'your_app_password'
RECIPIENTS_FILE = 'recipients.csv'
SUBJECT_TEMPLATE = "Quick question about {company}"
BODY_TEMPLATE = """
Hi {name},

I noticed your work at {company} and wanted to reach out.

[Your personalized message here]

Best regards,
[Your Name]
"""

# ===== MAIN LOGIC =====
def send_bulk_emails():
    df = pd.read_csv(RECIPIENTS_FILE)
    yag = yagmail.SMTP(GMAIL_USER, GMAIL_PASSWORD)

    for idx, row in df.iterrows():
        try:
            subject = SUBJECT_TEMPLATE.format(**row.to_dict())
            body = BODY_TEMPLATE.format(**row.to_dict())
            yag.send(to=row['email'], subject=subject, contents=body)
            logging.info(f"✅ Sent to {row['email']}")
            time.sleep(2)  # Rate limiting
        except Exception as e:
            logging.error(f"❌ Failed for {row['email']}: {e}")

if __name__ == '__main__':
    send_bulk_emails()
```

</details>

**Full toolkit includes:** 20 scripts covering web scraping, file management, data processing, email automation, API integration, PDF manipulation, image processing, and more.

---

### 3. 📋 50 SEO Blog Post Templates — $9.99

Ready-to-use blog post structures with built-in SEO. 9 content categories.

**Free Sample — Step-by-Step Tutorial Template:**

<details>
<summary>📂 Template: Step-by-Step Tutorial (click to expand)</summary>

```
SEO Elements:
- H1: How to [Task] in [Number] Easy Steps (Complete Guide)
- Meta: Learn how to [task] with this step-by-step guide.
  Follow [number] proven steps to [achieve outcome].
- Primary Keyword: how to [task]
- Secondary Keywords: [task] tutorial, [task] for beginners

Template Structure:

## Introduction (150 words)
- Hook: "If you've ever struggled with [common pain point], you're not alone."
- Promise: "By the end of this guide, you'll be able to [outcome]."
- [Primary Keyword] used naturally in first sentence

## Prerequisites (100 words)
- What you need before starting
- Estimated time to complete
- Difficulty level

## Step 1: [First Action] (300 words)
- Clear instruction with screenshot placeholder
- Why this step matters
- Common mistake to avoid

## Step 2: [Second Action] (300 words)
- ...

## Step N: [Final Action] (200 words)
- ...

## Pro Tips (150 words)
- 3-5 advanced tips for better results

## Conclusion (100 words)
- Summary of what was accomplished
- Next steps / related guides
- CTA: "Try [tool/method] and share your results!"

## FAQ (5 questions)
- Address common objections and follow-up questions
```

</details>

**Full pack includes:** 50 templates · 9 categories (How-To, Listicle, Comparison, Review, Case Study, Roundup, Opinion, Beginner Guide, Ultimate Guide) · SEO metadata for each

---

### 4. 🎨 100+ Midjourney Prompts for Marketing — $7.99

111 marketing-focused Midjourney prompts across 10 categories.

**Free Sample — 3 Marketing Prompts:**

<details>
<summary>📂 Social Media & Branding Prompts (click to expand)</summary>

```
Instagram Carousel Hero Slide:
---
minimalist product showcase layout, floating skincare bottle on soft
peach gradient background, subtle water droplets, clean white sans-serif
text placeholder, luxury beauty brand aesthetic, soft studio lighting,
flat design elements with 3D product,
--ar 4:5 --s 750 --style raw

Pro Tip: Replace "skincare bottle" with your product. Change "peach gradient"
to match your brand accent color.
```

```
LinkedIn Thought Leadership Post:
---
professional business infographic card, dark navy background with gold
accent lines, abstract geometric brain icon, data visualization elements,
corporate modern typography placeholder, executive insight aesthetic,
clean minimal layout,
--ar 1:1 --s 600 --style raw

Pro Tip: Swap "brain icon" for your industry symbol (e.g., "abstract circuit
icon" for tech, "abstract chart icon" for finance).
```

```
TikTok Brand Intro Overlay:
---
vibrant motion graphics frame, glitch text effect overlay, neon pink and
electric blue color scheme, retro-futuristic cyberpunk aesthetic, dynamic
diagonal lines, energy burst particles, youth culture brand identity,
--ar 9:16 --s 800

Pro Tip: Adjust color scheme to match your brand. "glitch text effect"
creates eye-catching movement even in a static frame.
```

</details>

**Full pack includes:** 111 prompts · 10 categories (Social Media, Product Photography, Brand Identity, Ad Creatives, Email Headers, Blog Graphics, Presentation Slides, Packaging Design, Event Materials, Print Marketing) · Aspect ratio + style params for each

---

### 5. 📊 Data Analysis Excel Template Pack — $14.99

8 professional Excel templates with built-in formulas and conditional formatting.

**Free Sample — Revenue Dashboard Formula:**

<details>
<summary>📂 Monthly Revenue Dashboard (click to expand)</summary>

| Column | Header | Formula | Purpose |
|--------|--------|---------|---------|
| A | Month | Dropdown | Jan-Dec |
| B | Revenue | Input | Total revenue |
| C | COGS | Input | Cost of goods sold |
| D | Gross Profit | `=B2-C2` | Revenue minus cost |
| E | Margin % | `=IF(B2=0,0,D2/B2)` | Profit margin |
| F | MoM Growth | `=IF(B1=0,0,(B2-B1)/B1)` | Month-over-month |
| G | Cumulative | `=SUM($B$2:B2)` | Running total |

**KPI Dashboard:**
```
Total Revenue:    =SUM(Revenue_Data!B:B)
Average Monthly:  =AVERAGE(Revenue_Data!B:B)
Best Month:       =MAX(Revenue_Data!B:B)
Avg Growth Rate:  =AVERAGE(Revenue_Data!F:F)
YTD Gross Margin: =SUM(D:D)/SUM(B:B)
Target Progress:  =SUM(B:B)/Revenue_Target
```

**Conditional Formatting:**
- Revenue: 🟢 ≥$10,000 | 🔴 <$5,000
- Margin: 🟢 ≥60% | 🟡 40-60% | 🔴 <40%
- Growth: 🟢 ≥5% | 🔴 <0%

</details>

**Full pack includes:** 8 templates (Revenue Dashboard, KPI Scorecard, Budget Planner, Customer Analytics, A/B Test Tracker, Sales Pipeline, Inventory Manager, ROI Calculator)

---

### 6. 🤖 The Ultimate AI Side Hustle Guide — $14.99

35 proven ways to make money with AI. Step-by-step instructions with realistic earnings.

**Free Sample — Table of Contents:**

<details>
<summary>📂 35 AI Side Hustles Overview (click to expand)</summary>

**Part 1: Quick Start — $0 to Start (5 hustles)**
1. AI-Powered Freelance Writing
2. ChatGPT Prompt Selling
3. AI Social Media Content Creation
4. AI Resume & Cover Letter Services
5. AI Translation & Proofreading Services

**Part 2: Content & Creative (8 hustles)**
6. AI Blog & Article Writing for Clients
7. AI eBook & Whitepaper Ghostwriting
8. AI Graphic Design & Logo Creation
9. AI Video Script & Content Production
10. AI Music & Audio Production
11. AI Podcast Show Notes & Transcription
12. AI Email Marketing & Copywriting
13. AI Storytelling & Creative Fiction

**Part 3: Technical & Code (5 hustles)**
14. AI-Powered Workflow Automation
15. Micro-SaaS with AI APIs
16. AI Code Generation & Script Selling
17. AI Data Analysis & Reporting Services
18. AI Chatbot Building for Small Businesses

**Part 4: Services & Freelancing (7 hustles)**
19. AI Consulting & Strategy Advisory
20. AI Tool Training & Onboarding
21. AI Setup & Integration Services
22. AI-Powered SEO & Marketing Services
23. AI Personal Branding & LinkedIn Optimization
24. AI Presentation & Pitch Deck Creation
25. AI Research & Competitive Intelligence

**Part 5: Products & Passive (5 hustles)**
26. AI-Generated Digital Products & Templates
27. AI Online Courses & Training Programs
28. AI Notion & Productivity Templates
29. AI Spreadsheet & Financial Models
30. AI Stock Photography & Image Packs

**Part 6: Advanced & Emerging (5 hustles)**
31-35. (Advanced strategies in the full guide)

</details>

**Full guide includes:** 35 chapters · 6 parts · Step-by-step instructions · Realistic earnings estimates · Tools needed · Pitfalls to avoid

---

## 🏗️ Tech Stack

```
Browser → Caddy HTTPS → Node.js → Stripe Checkout
                              ↘ SQLite orders and permissions
```

| Component | Role |
|-----------|------|
| [Caddy](https://caddyserver.com/) | HTTPS and reverse proxy to `127.0.0.1:3000` |
| [Node.js](https://nodejs.org/) | Store, admin session, checkout, webhook, and protected download APIs |
| [Stripe](https://stripe.com/) | Hosted checkout and signed payment events |
| SQLite | Persistent orders, webhook IDs, sessions, analytics, and download grants |

### Fulfillment security

1. The checkout API validates the product and creates a pending order.
2. Stripe hosts the payment page.
3. The webhook endpoint verifies `Stripe-Signature` against the raw request body.
4. A unique Stripe event marks the matching order paid; duplicate delivery is harmless.
5. The success page polls the local order record and exposes a limited download only after payment.
6. Download grants survive process restarts, expire after a configured period, have a use limit, and are revoked on refund.

Paid product files are deliberately excluded from this repository. They belong in the server-only directory configured by `PRODUCT_ROOT`.

---

## 🚀 Deploy

Requirements: Node.js 20+, Caddy, a Stripe account, ports 80/443, and a domain pointed at the server.

```bash
npm ci
sudo install -m 600 .env.example /etc/digital-shop.env
# Edit /etc/digital-shop.env directly on the server; never commit its values.

sudo cp deploy/digital-shop.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now digital-shop

sudo cp Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Create a Stripe webhook endpoint at `https://shop.liyw.top/api/webhook` for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `charge.refunded`

Copy its signing secret into `/etc/digital-shop.env` as `STRIPE_WEBHOOK_SECRET`.

Run `npm test` before deployment.

---

## 📊 Admin Dashboard

`/admin` uses an encrypted-in-transit, `HttpOnly`, `Secure`, `SameSite=Strict` session cookie. The password and session are not stored in browser JavaScript. Five failed attempts from one IP trigger a 15-minute login cooldown.

---

## ⚠️ Lessons Learned (避免踩坑)

| Approach | Why It Failed |
|----------|--------------|
| Fiverr freelancing | Anti-bot detection (PerimeterX), scam inquiries |
| Gumroad | Blocked by GFW in China |
| Lemon Squeezy | Stripe doesn't support China merchants (KYC verifies real identity) |
| PayPal | Account permanently banned, cannot re-register |

**Working path:** Self-hosted store + Stripe (Hong Kong account) + Caddy HTTPS

---

## 📁 Project Structure

```
├── server.js                 # Production entry point
├── src/                      # App, database, config, and security modules
├── test/                     # Node integration tests
├── index.html                # Store frontend
├── admin.html                # Analytics dashboard
├── products.json             # Public product metadata and server-relative file mapping
├── products/*/product.md     # Public product descriptions only
├── deploy/digital-shop.service
├── Caddyfile
├── .env.example
└── PROJECT-HANDOFF.md
```

---

## License

All rights reserved. Paid product content is not part of the source repository or any source-code license.
