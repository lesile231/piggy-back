"use client";

import { useActionState } from "react";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "id", label: "Indonesia" },
  { value: "th", label: "ไทย" },
];

interface SpotOption {
  id: string;
  nameKo: string;
}

interface AliasFormProps {
  action: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  spots: SpotOption[];
  defaultValues?: {
    id?: string;
    alias?: string;
    language?: string;
    spotId?: string;
    type?: string;
  };
}

export function AliasForm({ action, spots, defaultValues = {} }: AliasFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {defaultValues.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      <div>
        <label className="block text-sm font-medium">검색어 (alias) *</label>
        <input
          name="alias"
          required
          defaultValue={defaultValues.alias ?? ""}
          placeholder="예: jigang, gijang"
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-zinc-500">
          사용자가 입력할 수 있는 검색어 변형을 입력하세요.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium">언어 *</label>
        <select
          name="language"
          required
          defaultValue={defaultValues.language ?? "en"}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">타입 *</label>
        <select
          name="type"
          required
          defaultValue={defaultValues.type ?? "place"}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="place">장소 (Place)</option>
          <option value="area">지역 (Area)</option>
        </select>
        <div className="mt-2 rounded bg-zinc-50 p-3 text-xs text-zinc-600 space-y-2">
          <div>
            <span className="font-semibold">장소 (Place)</span>
            <span className="ml-1">— 특정 관광지 하나를 가리키는 검색어</span>
            <br />
            <span className="text-zinc-400 ml-3">
              예: &quot;국제시장&quot;, &quot;해운대&quot;, &quot;jagalchi market&quot;
            </span>
            <br />
            <span className="text-zinc-400 ml-3">
              검색 시 해당 관광지가 메인으로 표시되고, 주변 관광지는 참고용으로 함께 표시됩니다.
            </span>
          </div>
          <div>
            <span className="font-semibold">지역 (Area)</span>
            <span className="ml-1">— 특정 관광지가 아닌 지역/구역 이름</span>
            <br />
            <span className="text-zinc-400 ml-3">
              예: &quot;기장&quot;, &quot;gijang&quot;, &quot;서면&quot;
            </span>
            <br />
            <span className="text-zinc-400 ml-3">
              검색 시 연결 장소 좌표를 중심으로 반경 10km 내 모든 관광지를 동등하게 나열합니다.
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">연결 장소 *</label>
        <select
          name="spotId"
          required
          defaultValue={defaultValues.spotId ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">장소를 선택하세요</option>
          {spots.map((spot) => (
            <option key={spot.id} value={spot.id}>
              {spot.nameKo}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          장소 타입: 이 관광지로 바로 안내합니다. 지역 타입: 이 관광지의 좌표를 중심점으로 주변을 검색합니다.
        </p>
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
