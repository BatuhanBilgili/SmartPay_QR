import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartPay QR — Dijital Menü & Akıllı Ödeme",
  description:
    "QR kod ile menüye eriş, sipariş ver ve hesabı arkadaşlarınla böl. Garson bekleme yok, hesap krizi yok!",
  keywords: "dijital menü, QR kod sipariş, hesap bölme, restoran, kafe",
  openGraph: {
    title: "SmartPay QR — Dijital Menü & Akıllı Ödeme",
    description: "QR kod ile menüye eriş, sipariş ver ve hesabı arkadaşlarınla böl.",
    type: "website",
    locale: "tr_TR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#C41E24",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
