import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adam Li Digital — Premium Digital Products",
  description:
    "Battle-tested prompts, automation scripts, SEO templates and practical AI guides. Secure payment and instant download.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
