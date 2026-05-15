import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "./components/ThemeProvider";
import "./globals.css";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "../lib/theme";

export const metadata: Metadata = {
  title: "Support Platform",
  description: "Internal support platform connected to Monday.com",
};

const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d=${JSON.stringify(DEFAULT_THEME)};var t=localStorage.getItem(k);document.documentElement.dataset.theme=(t==="light"||t==="dark")?t:d;}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)};}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
