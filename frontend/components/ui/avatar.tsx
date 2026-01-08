"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

// Consistent color palette for avatars
const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-green-100", text: "text-green-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
];

function getColorFromId(id: string): typeof AVATAR_COLORS[0] {
  // Generate consistent color based on user ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

type AvatarProps = {
  userId: string;
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
};

export function Avatar({
  userId,
  name,
  email,
  size = "md",
  className,
  showTooltip = true,
}: AvatarProps) {
  const color = useMemo(() => getColorFromId(userId), [userId]);
  const initials = useMemo(() => getInitials(name, email), [name, email]);
  const displayName = name || email || "Unknown";

  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full font-medium select-none",
        color.bg,
        color.text,
        sizeClasses[size],
        className
      )}
      title={showTooltip ? displayName : undefined}
    >
      {initials}
    </div>
  );
}

type AvatarStackProps = {
  users: Array<{
    id: string;
    name?: string | null;
    email?: string | null;
  }>;
  max?: number;
  size?: "sm" | "md" | "lg";
};

export function AvatarStack({ users, max = 4, size = "sm" }: AvatarStackProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  const overlapClass = {
    sm: "-ml-2",
    md: "-ml-2.5",
    lg: "-ml-3",
  };

  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  return (
    <div className="flex items-center">
      {visible.map((user, index) => (
        <Avatar
          key={user.id}
          userId={user.id}
          name={user.name}
          email={user.email}
          size={size}
          className={cn(
            "ring-2 ring-white",
            index > 0 && overlapClass[size]
          )}
        />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 font-medium ring-2 ring-white",
            sizeClasses[size],
            overlapClass[size]
          )}
          title={`${overflow} more collaborator${overflow === 1 ? "" : "s"}`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
