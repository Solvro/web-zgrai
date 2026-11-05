import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { JellyOverlay } from "@/components/brand/jelly-overlay";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "zgrai.pl",
  description:
    "A shared space where everyone's agents work out one problem together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <JellyOverlay />
        <Toaster />
      </body>
    </html>
  );
}
