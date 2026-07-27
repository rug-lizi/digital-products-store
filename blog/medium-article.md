# I Tried 5 Platforms to Sell Digital Products. Only One Actually Worked From China.

## The short version: most platforms don't work if you're outside the US/EU.

I spent two weeks trying to sell digital products online while based in mainland China. Here's what happened — and what finally worked.

---

## The Products

I created 6 digital products using AI (ChatGPT + Claude):

| Product | Price | What It Is |
|---------|-------|-----------|
| ChatGPT Prompts Pack | $9.99 | 103 productivity prompts |
| Python Automation Toolkit | $19.99 | 20 ready-to-use scripts |
| SEO Blog Templates | $9.99 | 50 blog post structures |
| Midjourney Marketing Prompts | $7.99 | 111 marketing visuals prompts |
| Excel Data Templates | $14.99 | 8 data analysis templates |
| AI Side Hustle Guide | $14.99 | 35 ways to make money with AI |

**Total catalog value: $75.99**

I used AI to do the heavy lifting — writing prompts, generating code, creating templates. Each product took 2–3 hours to create. The cost to produce all 6? $0 (just AI subscription time).

---

## Attempt 1: Fiverr — The Scam Trap

I set up a Fiverr profile offering AI-powered writing and translation services. Within 24 hours, I got 3 messages from "clients."

Every single one was a scam.

The pattern was always the same: a friendly message with a link to "view the project details." The link went to a fake Fiverr login page designed to steal credentials. One redirect chain went: `work-deals.com` → `fiverr-order.shop` → credential harvesting form.

**Verdict:** ❌ Scam-ridden. Also, Fiverr's anti-bot system (PerimeterX) blocked my AI automation tools, making it impossible to respond to legitimate clients quickly.

---

## Attempt 2: Gumroad — Blocked by the Great Firewall

Gumroad is the go-to for indie creators selling digital products. Simple setup, 10% flat fee.

But there's a catch if you're in China:

```
$ curl -I https://gumroad.com
HTTP/2 403
```

The entire domain is blocked. No VPN workaround is reliable enough for a business that needs to be always-on.

**Verdict:** ❌ Completely inaccessible from mainland China.

---

## Attempt 3: Lemon Squeezy — The Stripe KYC Wall

Lemon Squeezy seemed perfect. Lower fees than Gumroad (5% + $0.50), beautiful interface, handles VAT. I uploaded my first product and tried to activate the store.

Then I hit this:

> *"Unfortunately, Stripe payouts are currently not available in your country."*

Lemon Squeezy uses Stripe under the hood for all payment processing. Stripe requires KYC (Know Your Customer) verification — government ID + proof of address. And Stripe **does not support merchant accounts in China**.

I tried everything:
- Changing the store country to Singapore → **Stripe still required real ID verification**
- Using a VPN during registration → **Stripe verifies identity documents, not IP addresses**
- Creating a new account → **Same result, Stripe checks the person, not the account**

The brutal truth: **Stripe KYC verifies who you ARE, not where you say you're from.** A Chinese passport = no Stripe merchant account. Period.

**Verdict:** ❌ Dead end. Not a Lemon Squeezy problem — it's a Stripe problem that affects every platform using Stripe.

---

## Attempt 4: PayPal — Permanently Banned

Maybe PayPal could work as an alternative payment method? Many platforms support PayPal checkout.

Nope. My PayPal account was permanently restricted:

> *"You can't use PayPal anymore"*
> *Reference ID: PP-L-648302946446*

Reason: some automated risk flag. The appeal was denied. My balance is frozen for 180 days. I can't create a new account (they track identity, not just email).

**Verdict:** ❌ Permanently banned with no recourse. Don't rely on PayPal as your only payment method.

---

## Attempt 5: Self-Hosted Store — It Actually Works

After four failures, I went back to basics. If I can't use any platform, I'll build my own.

### The Architecture

```
My Domain → Caddy (auto HTTPS) → Node.js (API) → Stripe API
```

- **Caddy** serves the storefront and automatically handles HTTPS via Let's Encrypt
- **Node.js** creates Stripe Checkout Sessions and delivers files after payment
- **Stripe** handles the actual payment processing

The key insight: **I don't need a merchant account in China.** I have a Hong Kong bank account and can register Stripe as a Hong Kong entity. Stripe HK supports Chinese passport holders with a HK address and bank account.

### The Results

Within 48 hours of launching:

- ✅ Store online at custom domain with HTTPS
- ✅ All 6 products listed with instant delivery
- ✅ Stripe Checkout working (charges enabled)
- ✅ Analytics dashboard tracking visitors and sales
- ✅ Zero platform fees (only Stripe's standard 2.9% + $0.30)

**Total setup cost: ~$5/month for the VPS. That's it.**

---

## What I Learned

### 1. Platform dependence is fragile

Every platform that failed me was one I couldn't control. When Stripe decided China wasn't supported, every Stripe-dependent platform became useless overnight. Self-hosting removes that dependency.

### 2. AI makes product creation nearly free

All 6 products were created with AI assistance. The ChatGPT Prompts pack alone contains 103 prompts — that would have taken days to write manually. With AI, it took 3 hours.

### 3. Free samples are the best marketing

I include 10–20% of each product as free samples on my GitHub README. This does double duty:
- **SEO/GEO**: AI search engines (ChatGPT, Perplexity) index public GitHub content. When someone asks "best ChatGPT prompts for productivity," my samples appear in the training data.
- **Trust**: Buyers can verify quality before paying.

### 4. The payment geography problem is real

If you're outside the US/EU/Stripe-supported countries, your options are extremely limited:

| Method | Works From China? |
|--------|:-:|
| Stripe (direct) | ❌ |
| PayPal | ❌ (if banned) |
| Payoneer | ✅ (but can't receive direct card payments) |
| Stripe HK | ✅ (with HK bank account) |
| Crypto | ✅ (but most buyers don't use it) |

**If you have access to a bank account in a Stripe-supported country, use it.** That's the single most important factor.

---

## Free Samples From Each Product

I believe in showing before selling. Here's a taste of each:

### ChatGPT Prompts Pack — Sample
```
Write a 1500-word SEO-optimized article about [TOPIC]. Requirements:
- Use the keyword "[KEYWORD]" naturally 8-12 times
- Include H2 and H3 subheadings
- Write in a conversational style
- Add a meta description (155 characters max)
- End with an FAQ section (5 questions)
```

### Python Automation Toolkit — Sample
```python
# Bulk Email Sender (one of 20 scripts)
import yagmail, pandas as pd
df = pd.read_csv('recipients.csv')
yag = yagmail.SMTP('you@gmail.com', 'app_password')
for _, row in df.iterrows():
    yag.send(to=row['email'], subject=f"Hi {row['name']}", 
             contents=f"Hello {row['name']}...")
```

### SEO Templates — Sample
```
Template: Step-by-Step Tutorial
- H1: How to [Task] in [N] Easy Steps (Complete Guide)
- Structure: Hook → Prerequisites → Steps → Pro Tips → FAQ
- Target: 1,500–2,000 words
- SEO: Primary keyword in H1 + first 100 words + conclusion
```

### Midjourney Marketing Prompts — Sample
```
LinkedIn Thought Leadership Post:
professional business infographic card, dark navy background
with gold accent lines, abstract geometric brain icon, data
visualization elements, corporate modern typography,
--ar 1:1 --s 600 --style raw
```

### Excel Data Templates — Sample
```
Revenue Dashboard KPIs:
Total Revenue:    =SUM(B:B)
Best Month:       =MAX(B:B)
MoM Growth:       =(B2-B1)/B1
YTD Gross Margin: =SUM(D:D)/SUM(B:B)
```

### AI Side Hustle Guide — Sample
**5 zero-investment AI hustles:**
1. AI-Powered Freelance Writing
2. ChatGPT Prompt Selling
3. AI Social Media Content Creation
4. AI Resume & Cover Letter Services
5. AI Translation & Proofreading

---

## The Store

Check it out: [shop.liyw.top](https://shop.liyw.top)

Source code: [github.com/rug-lizi/digital-products-store](https://github.com/rug-lizi/digital-products-store)

If you're in a similar situation — trying to earn online from a restricted geography — self-hosting with Stripe might be your best bet. It took me two weeks of failed attempts to figure that out. Hopefully this saves you some time.

---

*Thanks for reading. If this was helpful, follow me for more posts about building digital products and earning online with AI.*
