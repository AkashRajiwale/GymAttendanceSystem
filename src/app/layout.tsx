import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GYM_NAME } from "@/lib/brand";
import { THEME_COLORS, themeScript } from "@/lib/theme";
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
  title: GYM_NAME,
  description: `Attendance and monthly fees for ${GYM_NAME}`,
  // iPhone "Add to Home Screen": open full-screen as an app, with the dark status bar.
  appleWebApp: { capable: true, title: GYM_NAME.split(" ")[0], statusBarStyle: "black" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLORS.dark,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: themeScript may set data-theme on <html> before React loads.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Chrome may fire this before React loads, so keep the event for the Install app button. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__vfInstall=e;window.dispatchEvent(new Event("vf-install"))});window.addEventListener("appinstalled",function(){window.__vfInstall=null;window.dispatchEvent(new Event("vf-install"))});`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
