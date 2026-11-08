import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpendGuard | PayPal AI Guardrail Agent",
  description: "Deterministic guardrail policy engine for AI shopping agents powered by PayPal Orders v2.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
