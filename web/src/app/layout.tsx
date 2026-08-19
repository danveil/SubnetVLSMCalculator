import type { Metadata } from "next";
import type { ReactNode } from "react";

import { brand } from "@/config/brand";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: `${brand.name} — ${brand.productCategory}`,
  description: brand.description,
  openGraph: {
    type: "website",
    url: "/",
    siteName: brand.name,
    title: `${brand.name} — ${brand.productCategory}`,
    description: brand.description,
    images: [
      {
        url: "/og.png",
        width: 1731,
        height: 909,
        alt: `${brand.name} IPv4 and VLSM address planning workspace`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — ${brand.productCategory}`,
    description: brand.description,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
