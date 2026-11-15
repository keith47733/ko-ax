import React from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <div className="flex w-full items-center justify-center py-24">
      <LoadingSpinner size="lg" />
    </div>
  );
}

