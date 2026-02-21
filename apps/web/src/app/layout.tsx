import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";

import { IconSprite } from "@/components/icon-sprite";
import { LocaleBoundary } from "@/components/locale-boundary";
import { ProgressBoundary } from "@/components/progress-boundary";
import { WalletProvider } from "@/providers/wallet-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { StructuredData } from "@/components/seo/structured-data";
import {
  organizationStructuredData,
  platformStructuredData,
  rootLayoutMetadata,
  websiteStructuredData,
} from "@/lib/seo";

const THEME_STORAGE_KEY = "theme";
const LANGUAGE_STORE_KEY = "hermis-language-store";
const LANGUAGE_FALLBACK_KEY = "hermis-language";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = rootLayoutMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const inlineSettingsScript = `
    (function() {
      try {
        var storedTheme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
        var themeValue = storedTheme || "system";
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        var isDark = themeValue === 'dark' || (themeValue === 'system' && prefersDark);
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        /* no-op */
      }

      try {
        var language = localStorage.getItem(${JSON.stringify(LANGUAGE_FALLBACK_KEY)});
        if (!language) {
          var persisted = localStorage.getItem(${JSON.stringify(LANGUAGE_STORE_KEY)});
          if (persisted) {
            try {
              var parsed = JSON.parse(persisted);
              language = parsed && parsed.state && parsed.state.language;
            } catch (error) {
              language = null;
            }
          }
        }

        if (language !== 'en' && language !== 'zh') {
          language = 'en';
        }

        document.documentElement.setAttribute('lang', language);
        window.__hermisLanguage = language;
        localStorage.setItem(${JSON.stringify(LANGUAGE_FALLBACK_KEY)}, language);
        var maxAge = 60 * 60 * 24 * 365;
        document.cookie = 'NEXT_LOCALE=' + language + '; path=/; max-age=' + maxAge;
      } catch (error) {
        /* no-op */
      }
    })();
  `;

  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: inlineSettingsScript }} />
        <StructuredData data={websiteStructuredData} />
        <StructuredData data={platformStructuredData} />
        <StructuredData data={organizationStructuredData} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <IconSprite />
        <ProgressBoundary>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <I18nProvider>
              <LocaleBoundary>
                <WalletProvider>{children}</WalletProvider>
              </LocaleBoundary>
            </I18nProvider>
            <Toaster />
          </ThemeProvider>
        </ProgressBoundary>
      </body>
    </html>
  );
}
