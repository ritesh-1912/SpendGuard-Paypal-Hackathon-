import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpendGuard | Policy Engine for AI Shopping",
  description: "Deterministic guardrail policy engine for AI shopping agents with PayPal checkout.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
