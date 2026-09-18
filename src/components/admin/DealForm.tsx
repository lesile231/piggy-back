"use client";

import { useActionState } from "react";
import { LocalizedInput } from "./LocalizedInput";
import type { LocalizedText } from "@/types/common";

interface DealFormProps {
  action: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  defaultValues?: {
    id?: string;
    nameKo?: string;
    names?: LocalizedText;
    description?: LocalizedText;
    discount?: LocalizedText;
    providerName?: string;
    locationName?: LocalizedText;
    addressKo?: string | null;
    imageUrl?: string | null;
    linkUrl?: string | null;
    category?: string;
    validFrom?: Date | null;
    validUntil?: Date | null;
    sortOrder?: number;
    isActive?: boolean;
  };
}

function formatDatetime(d?: Date | null): string {
  if (!d) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function DealForm({ action, defaultValues = {} }: DealFormProps) {
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

      <LocalizedInput name="names" label="다국어 이름" defaultValues={defaultValues.names} />
      <LocalizedInput name="description" label="다국어 설명" defaultValues={defaultValues.description} multiline />
      <LocalizedInput name="discount" label="다국어 할인내용 (예: 20% OFF, 1+1)" defaultValues={defaultValues.discount} />

      <div>
        <label className="block text-sm font-medium">제공처 *</label>
        <input
          name="providerName"
          required
          defaultValue={defaultValues.providerName ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <LocalizedInput name="locationName" label="다국어 사용처" defaultValues={defaultValues.locationName} />

      <div>
        <label className="block text-sm font-medium">한국어 주소</label>
        <input
          name="addressKo"
          defaultValue={defaultValues.addressKo ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">카테고리 *</label>
        <select
          name="category"
          required
          defaultValue={defaultValues.category ?? "general"}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="general">General</option>
          <option value="attraction">Attraction</option>
          <option value="food">Food</option>
          <option value="shopping">Shopping</option>
          <option value="transport">Transport</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">유효기간 시작</label>
          <input
            name="validFrom"
            type="datetime-local"
            defaultValue={formatDatetime(defaultValues.validFrom)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">유효기간 종료</label>
          <input
            name="validUntil"
            type="datetime-local"
            defaultValue={formatDatetime(defaultValues.validUntil)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">이미지 URL</label>
        <input
          name="imageUrl"
          defaultValue={defaultValues.imageUrl ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">혜택 링크 URL</label>
        <input
          name="linkUrl"
          defaultValue={defaultValues.linkUrl ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">정렬 순서</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={defaultValues.sortOrder ?? 0}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="isActive" id="dealIsActive" value="true" defaultChecked={defaultValues.isActive ?? true} />
        <label htmlFor="dealIsActive" className="text-sm">활성</label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={isPending} className="rounded bg-[#0077B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#005F92] disabled:opacity-50">
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
