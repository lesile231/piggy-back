"use client";

import { useActionState } from "react";
import { LocalizedInput } from "./LocalizedInput";
import type { LocalizedText } from "@/types/common";

interface EventFormProps {
  action: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  defaultValues?: {
    id?: string;
    nameKo?: string;
    names?: LocalizedText;
    description?: LocalizedText;
    category?: string;
    venueName?: LocalizedText;
    addressKo?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    startsAt?: Date;
    endsAt?: Date;
    recurrence?: string | null;
    priceInfo?: LocalizedText;
    bookingUrl?: string | null;
    images?: string[];
    isActive?: boolean;
  };
}

function formatDatetime(d?: Date): string {
  if (!d) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function EventForm({ action, defaultValues = {} }: EventFormProps) {
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

      <div>
        <label className="block text-sm font-medium">카테고리 *</label>
        <select
          name="category"
          required
          defaultValue={defaultValues.category ?? "festival"}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="festival">Festival</option>
          <option value="concert">Concert</option>
          <option value="exhibition">Exhibition</option>
          <option value="performance">Performance</option>
        </select>
      </div>

      <LocalizedInput name="venueName" label="다국어 장소명" defaultValues={defaultValues.venueName} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">시작일시 *</label>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={formatDatetime(defaultValues.startsAt)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">종료일시 *</label>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={formatDatetime(defaultValues.endsAt)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">반복</label>
        <select
          name="recurrence"
          defaultValue={defaultValues.recurrence ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">없음</option>
          <option value="daily">매일</option>
          <option value="weekly">매주</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">위도</label>
          <input name="latitude" type="number" step="any" defaultValue={defaultValues.latitude ?? ""} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium">경도</label>
          <input name="longitude" type="number" step="any" defaultValue={defaultValues.longitude ?? ""} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <LocalizedInput name="priceInfo" label="다국어 요금 안내" defaultValues={defaultValues.priceInfo} />

      <div>
        <label className="block text-sm font-medium">예약 URL</label>
        <input name="bookingUrl" defaultValue={defaultValues.bookingUrl ?? ""} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium">이미지 URL (줄바꿈으로 구분)</label>
        <textarea name="images" rows={3} defaultValue={defaultValues.images?.join("\n") ?? ""} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="isActive" id="eventIsActive" value="true" defaultChecked={defaultValues.isActive ?? true} />
        <label htmlFor="eventIsActive" className="text-sm">활성</label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={isPending} className="rounded bg-[#0077B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#005F92] disabled:opacity-50">
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
