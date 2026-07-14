import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iceberry OS",
  description: "Franchise operasyonları için modern yönetim paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
