import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VT Outreach",
  description: "Internal ICP outreach automation dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
