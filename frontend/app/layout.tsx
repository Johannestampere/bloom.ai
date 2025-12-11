import type { Metadata } from "next";
import "./globals.css";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthButtons } from "@/components/auth/AuthButtons";

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
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <AuthShell>
          <div className="flex min-h-screen">
            <aside className="w-72 border-r border-slate-800 bg-slate-900/60 px-4 py-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold tracking-tight">
                  MindBloom
                </span>
              </div>
            </aside>
            <main className="flex-1 flex flex-col">
              <header className="h-14 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between">
                <div className="text-sm text-slate-300">
                  Collaborative mindmap
                </div>
                <AuthButtons />
              </header>
              <section className="flex-1 bg-slate-950 overflow-hidden">
                {children}
              </section>
            </main>
          </div>
        </AuthShell>
      </body>
    </html>
  );
}
