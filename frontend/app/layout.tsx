import type { Metadata } from "next";
import "./globals.css";

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
        <div className="flex min-h-screen">
          <aside className="w-72 border-r border-slate-800 bg-slate-900/60 px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-semibold tracking-tight">
                MindBloom
              </span>
            </div>
            {/* TODO: mindmap list, filters, user info */}
          </aside>
          <main className="flex-1 flex flex-col">
            <header className="h-14 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between">
              {/* TODO: mindmap title, actions, collaborator pills */}
              <div className="text-sm text-slate-300">
                Collaborative mindmap
              </div>
            </header>
            <section className="flex-1 bg-slate-950 overflow-hidden">
              {children}
            </section>
          </main>
        </div>
      </body>
    </html>
  );
}
