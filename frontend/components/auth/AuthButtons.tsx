"use client";

import { supabase } from "@/lib/supabase";
import { useMindmapStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export function AuthButtons() {
  const currentUser = useMindmapStore((state) => state.currentUser);
  const router = useRouter();
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
    router.push("/");
  };

  if (!currentUser) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className="text-xs font-medium text-neutral-900 hover:text-neutral-600 transition-colors"
      >
        Sign in
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
    >
      Sign out
    </button>
  );
}


