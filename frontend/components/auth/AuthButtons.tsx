"use client";

import { supabase } from "@/lib/supabase";
import { useMindmapStore } from "@/lib/store";

export function AuthButtons() {
  const currentUser = useMindmapStore((state) => state.currentUser);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/dashboard`
            : undefined,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!currentUser) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400 truncate max-w-[140px]">
        {currentUser.username}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className="text-[11px] text-slate-400 hover:text-slate-200"
      >
        Sign out
      </button>
    </div>
  );
}


