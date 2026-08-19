import type { Metadata } from "next";
import type { ReactNode } from "react";

import { brand } from "@/config/brand";

import "./globals.css";

function resolveMetadataBase(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return new URL(configuredUrl);
  }

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (vercelProductionUrl) {
    return new URL(`https://${vercelProductionUrl}`);
  }

  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
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
