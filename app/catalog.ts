export type Product = {
  priceId: string;
  name: string;
  price: number;
  icon: string;
  description: string;
  features: string[];
  objectKey: string;
  downloadName: string;
  contentType: string;
};

export const products: Product[] = [
  {
    priceId: "price_1Twab9PYKu4xpUEiRoAtvScJ",
    name: "100+ ChatGPT Prompts for Ultimate Productivity",
    price: 999,
    icon: "📝",
    description:
      "103 battle-tested prompts for content writing, business, marketing, productivity and more.",
    features: ["103 prompts", "7 categories", "Copy-paste ready", "Lifetime access"],
    objectKey: "products/ChatGPT-Prompts-Pack.txt",
    downloadName: "ChatGPT-Prompts-Pack.txt",
    contentType: "text/plain; charset=utf-8",
  },
  {
    priceId: "price_1Twab9PYKu4xpUEiSneZ9NS9",
    name: "Python Automation Scripts Toolkit",
    price: 1999,
    icon: "🔧",
    description:
      "20 ready-to-use Python scripts for web scraping, data processing, email automation and more.",
    features: ["20 scripts", "Full source code", "Usage examples", "Lifetime access"],
    objectKey: "products/Python-Automation-Toolkit.zip",
    downloadName: "Python-Automation-Toolkit.zip",
    contentType: "application/zip",
  },
  {
    priceId: "price_1Twab9PYKu4xpUEiikoiIE2E",
    name: "50 SEO Blog Post Templates",
    price: 999,
    icon: "📋",
    description:
      "50 blog post templates with built-in SEO structure: how-tos, listicles, reviews and case studies.",
    features: ["50 templates", "9 categories", "SEO optimized", "Lifetime access"],
    objectKey: "products/SEO-Blog-Post-Templates.txt",
    downloadName: "SEO-Blog-Post-Templates.txt",
    contentType: "text/plain; charset=utf-8",
  },
  {
    priceId: "price_1TwabAPYKu4xpUEiDeng8Yyr",
    name: "100+ Midjourney Prompts for Marketing",
    price: 799,
    icon: "🎨",
    description:
      "111 marketing-focused prompts for social media, product photography, brand identity and ads.",
    features: ["111 prompts", "10 categories", "Marketing focused", "Lifetime access"],
    objectKey: "products/Midjourney-Marketing-Prompts.txt",
    downloadName: "Midjourney-Marketing-Prompts.txt",
    contentType: "text/plain; charset=utf-8",
  },
  {
    priceId: "price_1TwabAPYKu4xpUEiAJYpoEC2",
    name: "Data Analysis Excel Template Pack",
    price: 1499,
    icon: "📊",
    description:
      "8 professional Excel-ready templates with formulas for revenue, KPI and budget analysis.",
    features: ["8 templates", "Built-in formulas", "Dashboard layouts", "Lifetime access"],
    objectKey: "products/Excel-Data-Analysis-Templates.md",
    downloadName: "Excel-Data-Analysis-Templates.md",
    contentType: "text/markdown; charset=utf-8",
  },
  {
    priceId: "price_1TwabBPYKu4xpUEikNb8z60M",
    name: "The Ultimate AI Side Hustle Guide",
    price: 1499,
    icon: "🤖",
    description:
      "35 practical ways to make money with AI, with step-by-step instructions and pitfalls to avoid.",
    features: ["35 side hustles", "Step-by-step", "Realistic earnings", "Lifetime access"],
    objectKey: "products/AI-Side-Hustle-Guide.md",
    downloadName: "AI-Side-Hustle-Guide.md",
    contentType: "text/markdown; charset=utf-8",
  },
];

export const productByPriceId = new Map(products.map((product) => [product.priceId, product]));
