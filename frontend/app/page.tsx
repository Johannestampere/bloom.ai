"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMindmapStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const currentUser = useMindmapStore((state) => state.currentUser);

  useEffect(() => {
    if (currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-slate-950 text-slate-200 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-3xl text-center space-y-8 px-6">
        <div className="space-y-4">
          <h1 className="text-6xl sm:text-7xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            bloom.ai
          </h1>
          <p className="text-xl sm:text-2xl text-slate-400 font-light max-w-xl mx-auto leading-relaxed">
            Collaborative mindmapping powered by AI.
            <br />
            <span className="text-slate-500">Brainstorm together, think bigger.</span>
          </p>
        </div>

        <div className="pt-4">
          <p className="text-sm text-slate-500">
            Sign in above to get started
          </p>
        </div>
      </div>
    </div>
  );
}
