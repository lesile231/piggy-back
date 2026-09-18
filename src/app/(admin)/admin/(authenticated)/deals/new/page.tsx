import { DealForm } from "@/components/admin/DealForm";
import { createDealAction } from "@/actions/deal.actions";

export const dynamic = "force-dynamic";

export default function NewDealPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">혜택 등록</h1>
      <div className="mt-6">
        <DealForm action={createDealAction} />
      </div>
    </div>
  );
}
