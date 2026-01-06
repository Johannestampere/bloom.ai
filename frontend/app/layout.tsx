import type { Metadata } from "next";
import "./globals.css";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthButtons } from "@/components/auth/AuthButtons";
import Link from "next/link";
import { redirect } from "next/dist/server/api-utils";

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
      <body className="h-screen overflow-hidden bg-slate-950 text-slate-50 antialiased">
        <AuthShell>
          <div className="flex h-screen flex-col">
            <header className="h-14 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between">
              <Link href="/dashboard">bloom.ai</Link>
              <AuthButtons />
            </header>
            <main className="flex-1 min-h-0 bg-slate-950 overflow-hidden">
              {children}
            </main>
          </div>
        </AuthShell>
      </body>
    </html>
  );
}
