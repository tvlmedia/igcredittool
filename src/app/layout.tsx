import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";

export const metadata: Metadata = {
  title: "IronGlass Credit Tracker",
  description: "Premium credit tracking for IronGlass ambassadors."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
