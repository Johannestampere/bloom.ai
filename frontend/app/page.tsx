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
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-200">
      <div className="max-w-xl text-center space-y-4 px-4">
        <h1 className="text-3xl font-semibold tracking-tight">MindBloom</h1>
        <p className="text-sm text-slate-400">
          Sign in to get started.
        </p>
      </div>
    </div>
  );
}
