import { UserInfo } from "@/lib/types/users";

interface UserStatusProps {
  user: UserInfo;
}

export function UserStatus({ user }: UserStatusProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
        user.isLocked ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
      }`}
    >
      {user.isLocked
        ? `Locked${user.lockReason ? `: ${user.lockReason}` : ""}`
        : "Active"}
    </span>
  );
}
