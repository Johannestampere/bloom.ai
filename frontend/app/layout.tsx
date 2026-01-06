import type { Metadata } from "next";
import "./globals.css";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthButtons } from "@/components/auth/AuthButtons";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MindBloom",
  description: "Collaborative AI-powered mindmap",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-neutral-50 text-neutral-900 antialiased">
        <AuthShell>
          <div className="flex h-screen flex-col">
            <header className="h-12 border-b border-neutral-200 bg-white px-6 flex items-center justify-between">
              <Link href="/dashboard" className="text-sm font-medium text-neutral-900 hover:text-neutral-600 transition-colors">
                bloom.ai
              </Link>
              <AuthButtons />
            </header>
            <main className="flex-1 min-h-0 bg-neutral-50 overflow-hidden">
              {children}
            </main>
          </div>
        </AuthShell>
      </body>
    </html>
  );
}
