import { logoutAction } from "@/actions/admin-auth.actions";

interface AdminHeaderProps {
  adminName: string;
}

export function AdminHeader({ adminName }: AdminHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4">
      <span className="text-sm font-bold">VIA BUSAN Admin</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-600">
          {adminName}
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            로그아웃
          </button>
        </form>
      </div>
    </header>
  );
}
