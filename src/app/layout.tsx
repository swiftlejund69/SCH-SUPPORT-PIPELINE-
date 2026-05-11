import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Support Platform",
  description: "Internal support platform connected to Monday.com",
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
