"use client";

import { useActionState } from "react";
import { LocalizedInput } from "./LocalizedInput";
import type { LocalizedText } from "@/types/common";

interface SpotFormProps {
  action: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  defaultValues?: {
    id?: string;
    nameKo?: string;
    names?: LocalizedText;
    description?: LocalizedText;
    addresses?: LocalizedText;
    latitude?: number | null;
    longitude?: number | null;
    phone?: string | null;
    website?: string | null;
    rating?: number | null;
    images?: string[];
    isActive?: boolean;
  };
}

export function SpotForm({ action, defaultValues = {} }: SpotFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {defaultValues.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      <div>
        <label className="block text-sm font-medium">한국어 이름 *</label>
        <input
          name="nameKo"
          required
          defaultValue={defaultValues.nameKo ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <LocalizedInput
        name="names"
        label="다국어 이름"
        defaultValues={defaultValues.names}
      />

      <LocalizedInput
        name="description"
        label="다국어 설명"
        defaultValues={defaultValues.description}
        multiline
      />

      <LocalizedInput
        name="addresses"
        label="다국어 주소"
        defaultValues={defaultValues.addresses}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">위도</label>
          <input
            name="latitude"
            type="number"
            step="any"
            defaultValue={defaultValues.latitude ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">경도</label>
          <input
            name="longitude"
            type="number"
            step="any"
            defaultValue={defaultValues.longitude ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">전화번호</label>
          <input
            name="phone"
            defaultValue={defaultValues.phone ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">웹사이트</label>
          <input
            name="website"
            defaultValue={defaultValues.website ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">별점 (0-5)</label>
        <input
          name="rating"
          type="number"
          step="0.1"
          min="0"
          max="5"
          defaultValue={defaultValues.rating ?? ""}
          className="mt-1 w-32 rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">이미지 URL (줄바꿈으로 구분)</label>
        <textarea
          name="images"
          rows={3}
          defaultValue={defaultValues.images?.join("\n") ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          id="isActive"
          value="true"
          defaultChecked={defaultValues.isActive ?? true}
        />
        <label htmlFor="isActive" className="text-sm">활성</label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-[#0077B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#005F92] disabled:opacity-50"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
