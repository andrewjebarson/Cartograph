import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cartograph",
  description: "Dependency maps for Angular and Spring Boot codebases",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const themeClass = theme === "dark" ? "dark" : theme === "light" ? "light" : "";

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} ${themeClass} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var d = document.documentElement;
                var t = d.getAttribute('data-theme') || 'system';
                var isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  d.classList.add('dark');
                  d.classList.remove('light');
                  d.style.colorScheme = 'dark';
                } else {
                  d.classList.add('light');
                  d.classList.remove('dark');
                  d.style.colorScheme = 'light';
                }
              } catch(e) {}
            })()`,
          }}
        />
      </head>
      <body className="flex h-full flex-col overflow-hidden">{children}</body>
    </html>
  );
}
