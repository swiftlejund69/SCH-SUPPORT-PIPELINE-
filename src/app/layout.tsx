import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "./components/ThemeProvider";
import "./globals.css";
import { LOGIN_THEME } from "../lib/theme";

export const metadata: Metadata = {
  title: "Support Platform",
  description: "Internal support platform connected to Monday.com",
};

/** Sign-in always starts light; saved theme applies after authentication. */
const themeInitScript = `(function(){document.documentElement.dataset.theme=${JSON.stringify(LOGIN_THEME)};document.documentElement.style.colorScheme=${JSON.stringify(LOGIN_THEME)};})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
