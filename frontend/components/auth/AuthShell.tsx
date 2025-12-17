"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useMindmapStore } from "@/lib/store";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const setCurrentUser = useMindmapStore((state) => state.setCurrentUser);

  useEffect(() => {
    const syncUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const user = session.user;

        const username =
          (user.user_metadata as any)?.username ||
          (user.user_metadata as any)?.full_name ||
          user.email ||
          "";

        setCurrentUser({
          id: user.id,
          email: user.email ?? "",
          username,
        });
      } else {
        setCurrentUser(null);
      }
    };
    syncUser().catch(() => {});
  }, [setCurrentUser]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        const username =
          (user.user_metadata as any)?.username ||
          (user.user_metadata as any)?.full_name ||
          user.email ||
          "";

        setCurrentUser({
          id: user.id,
          email: user.email ?? "",
          username,
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setCurrentUser]);

  return <>{children}</>;
}
