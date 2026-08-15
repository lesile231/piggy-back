import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AuthenticatedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let admin;
  try {
    admin = await verifyAdminSession();
  } catch {
    redirect("/admin/login");
  }

  return (
    <html lang="ko" className="h-full">
      <body className="flex h-full flex-col">
        <AdminHeader adminName={admin.name} />
        <div className="flex flex-1 overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
