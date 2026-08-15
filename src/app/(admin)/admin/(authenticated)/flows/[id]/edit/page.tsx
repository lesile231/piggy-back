import { notFound } from "next/navigation";
import { eq, asc, inArray } from "drizzle-orm";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { flows, flowSteps, flowOptions } from "@/lib/db/schema";
import { LocalizedInput } from "@/components/admin/LocalizedInput";
import {
  updateFlowAction,
  createStepAction,
  updateStepAction,
  deleteStepAction,
  createOptionAction,
  deleteOptionAction,
} from "@/actions/flow.actions";
import type { LocalizedText } from "@/types/common";

export default async function FlowEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);

  const flowRows = await db.select().from(flows).where(eq(flows.id, id)).limit(1);
  const flow = flowRows[0];
  if (!flow) notFound();

  const steps = await db
    .select()
    .from(flowSteps)
    .where(eq(flowSteps.flowId, id))
    .orderBy(asc(flowSteps.stepOrder));

  // Load all options in one query to avoid N+1
  const stepIds = steps.map((s) => s.id);
  const allOptions =
    stepIds.length > 0
      ? await db
          .select()
          .from(flowOptions)
          .where(inArray(flowOptions.stepId, stepIds))
          .orderBy(asc(flowOptions.sortOrder))
      : [];

  const optionsByStep: Record<string, typeof flowOptions.$inferSelect[]> = {};
  for (const opt of allOptions) {
    if (!optionsByStep[opt.stepId]) {
      optionsByStep[opt.stepId] = [];
    }
    optionsByStep[opt.stepId]!.push(opt);
  }

  const displayNames = flow.displayNames as LocalizedText;
  const maxStepOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.stepOrder)) : 0;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">플로우 편집: {flow.name}</h1>

      {/* Flow basic info */}
      <form action={updateFlowAction} className="mt-6 space-y-4 rounded border p-4">
        <input type="hidden" name="id" value={flow.id} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">이름</label>
            <input name="name" defaultValue={flow.name} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">아이콘</label>
            <input name="icon" defaultValue={flow.icon ?? ""} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </div>
        </div>
        <LocalizedInput name="displayNames" label="다국어 표시 이름" defaultValues={displayNames} />
        <div className="flex items-center gap-2">
          <input type="checkbox" name="isActive" value="true" defaultChecked={flow.isActive} />
          <label className="text-sm">활성</label>
        </div>
        <button type="submit" className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800">
          플로우 정보 저장
        </button>
      </form>

      {/* Steps */}
      <h2 className="mt-8 text-lg font-semibold">스텝 목록</h2>
      {steps.map((step) => {
        const msgs = step.messages as LocalizedText;
        const opts = optionsByStep[step.id] ?? [];
        return (
          <div key={step.id} className="mt-4 rounded border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Step {step.stepOrder} — {step.type}
              </span>
              <form action={deleteStepAction}>
                <input type="hidden" name="id" value={step.id} />
                <input type="hidden" name="flowId" value={flow.id} />
                <button type="submit" className="text-xs text-red-600 hover:underline">삭제</button>
              </form>
            </div>
            <form action={updateStepAction} className="mt-2 space-y-2">
              <input type="hidden" name="id" value={step.id} />
              <input type="hidden" name="flowId" value={flow.id} />
              <div>
                <label className="text-xs font-medium">Type</label>
                <select name="type" defaultValue={step.type} className="ml-2 rounded border px-2 py-1 text-xs">
                  <option value="text_input">text_input</option>
                  <option value="button_select">button_select</option>
                  <option value="api_call">api_call</option>
                  <option value="result">result</option>
                </select>
              </div>
              <LocalizedInput name="messages" label="메시지" defaultValues={msgs} />
              <div>
                <label className="text-xs font-medium">API Action</label>
                <input name="apiAction" defaultValue={step.apiAction ?? ""} className="ml-2 rounded border px-2 py-1 text-xs" />
              </div>
              <button type="submit" className="rounded bg-zinc-800 px-3 py-1 text-xs text-white">스텝 저장</button>
            </form>

            {/* Options */}
            {opts.length > 0 && (
              <div className="mt-3 ml-4 space-y-2">
                <span className="text-xs font-medium text-zinc-500">옵션:</span>
                {opts.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2 text-xs">
                    <span>{(opt.labels as LocalizedText).ko ?? (opt.labels as LocalizedText).en ?? opt.value}</span>
                    <span className="text-zinc-400">= {opt.value}</span>
                    <form action={deleteOptionAction} className="inline">
                      <input type="hidden" name="id" value={opt.id} />
                      <input type="hidden" name="flowId" value={flow.id} />
                      <button type="submit" className="text-red-500 hover:underline">×</button>
                    </form>
                  </div>
                ))}
              </div>
            )}

            {/* Add option */}
            <form action={createOptionAction} className="mt-2 flex gap-2">
              <input type="hidden" name="stepId" value={step.id} />
              <input type="hidden" name="flowId" value={flow.id} />
              <input name="value" placeholder="value" className="rounded border px-2 py-1 text-xs" />
              <input name="labels.ko" placeholder="한국어" className="rounded border px-2 py-1 text-xs" />
              <input name="labels.en" placeholder="English" className="rounded border px-2 py-1 text-xs" />
              <input name="sortOrder" type="number" defaultValue="0" className="w-12 rounded border px-2 py-1 text-xs" />
              <button type="submit" className="rounded bg-zinc-600 px-2 py-1 text-xs text-white">옵션 추가</button>
            </form>
          </div>
        );
      })}

      {/* Add new step */}
      <form action={createStepAction} className="mt-4 flex gap-2 rounded border p-3">
        <input type="hidden" name="flowId" value={flow.id} />
        <input type="hidden" name="stepOrder" value={maxStepOrder + 1} />
        <select name="type" className="rounded border px-2 py-1 text-sm">
          <option value="text_input">text_input</option>
          <option value="button_select">button_select</option>
          <option value="api_call">api_call</option>
          <option value="result">result</option>
        </select>
        <input name="messages.ko" placeholder="한국어 메시지" className="flex-1 rounded border px-2 py-1 text-sm" />
        <input name="messages.en" placeholder="English message" className="flex-1 rounded border px-2 py-1 text-sm" />
        <button type="submit" className="rounded bg-zinc-900 px-3 py-1 text-sm text-white">스텝 추가</button>
      </form>
    </div>
  );
}
