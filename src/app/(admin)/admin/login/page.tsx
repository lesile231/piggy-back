"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/admin-auth.actions";

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, {});

  return (
    <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-center text-xl font-bold">VIA BUSAN Admin</h1>
      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none "
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none "
          />
        </div>
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-[#0077B6] py-2 text-sm font-medium text-white hover:bg-[#005F92] disabled:opacity-50"
        >
          {isPending ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
