"use client";

export function DeleteButton({
  action,
  id,
  children
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("정말 삭제하시겠습니까?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-red-600 hover:underline">
        {children}
      </button>
    </form>
  );
}
