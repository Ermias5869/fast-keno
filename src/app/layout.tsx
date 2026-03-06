import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SyntaxKeno - Fast Keno Betting Platform",
  description: "Enterprise-grade Keno-style betting platform with Telegram WebApp integration. Choose numbers, place bets, win big.",
  keywords: ["keno", "betting", "casino", "telegram", "web3"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
        style={{
          fontFamily: "'Inter', sans-serif",
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {children}
      </body>
    </html>
  );
}
