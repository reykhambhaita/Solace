import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Premium display font - modern, geometric, distinctive
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

// Premium monospace font for code
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Solace | AI-Powered Code Analysis",
  description: "Next-generation code analysis platform with AI-powered review, translation, and learning resources. Analyze, understand, and improve your code with intelligence.",
  keywords: ["code analysis", "AI code review", "code translation", "developer tools", "code quality"],
  authors: [{ name: "Solace Team" }],
  openGraph: {
    title: "Solace | AI-Powered Code Analysis",
    description: "Next-generation code analysis platform with AI-powered review, translation, and learning resources.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          {/* Noise texture overlay for premium feel */}
          <div className="noise-overlay pointer-events-none fixed inset-0 z-[100]" aria-hidden="true" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
