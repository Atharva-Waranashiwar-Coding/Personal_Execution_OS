import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Personal Execution OS",
    template: "%s | Personal Execution OS",
  },
  description:
    "A multi-agent productivity dashboard for execution, planning, approvals, integrations, and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-slate-950 text-slate-50">{children}</body>
    </html>
  );
}
