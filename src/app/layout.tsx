import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstaAgent — Instagram AI Automation Dashboard",
  description:
    "Manage your Instagram DM inbox with an AI agent and automate comment-to-DM campaigns — all from one premium dashboard powered by Supabase.",
  keywords: [
    "Instagram automation",
    "comment to DM",
    "Instagram AI agent",
    "Instagram DM bot",
    "comment reply automation",
  ],
  authors: [{ name: "InstaAgent" }],
  openGraph: {
    title: "InstaAgent — Instagram AI Automation Dashboard",
    description:
      "AI-powered Instagram inbox + comment-to-DM campaign automation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
