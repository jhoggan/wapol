import { Suspense } from "react";
import { CommitteesNotAvailableContent } from "./not-available-content";

export default function CommitteesNotAvailablePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-neutral-500">
          Loading…
        </div>
      }
    >
      <CommitteesNotAvailableContent />
    </Suspense>
  );
}
