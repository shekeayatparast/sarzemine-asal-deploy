import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "سرزمین عسل | فروشگاه تخصصی عسل طبیعی",
  description:
    "سرزمین عسل، فروشگاه تخصصی فروش عسل طبیعی گون، کنار و چند گیاه. عسل خالص و اصل با ارسال به سراسر کشور.",
  keywords: ["عسل", "عسل طبیعی", "عسل گون", "عسل کنار", "سرزمین عسل", "خرید عسل", "عسل چند گیاه"],
  authors: [{ name: "سرزمین عسل" }],
  icons: {
    icon: "/images/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </body>
    </html>
  );
}
