import { SpotForm } from "@/components/admin/SpotForm";
import { createSpotAction } from "@/actions/spot.actions";

export default function NewSpotPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">관광지 등록</h1>
      <div className="mt-6">
        <SpotForm action={createSpotAction} />
      </div>
    </div>
  );
}
