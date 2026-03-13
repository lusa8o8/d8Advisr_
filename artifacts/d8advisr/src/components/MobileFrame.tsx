import { ReactNode } from "react";

export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center sm:py-8 sm:px-4">
      <div className="w-full max-w-[430px] min-h-[100dvh] sm:min-h-[844px] sm:h-[844px] bg-background relative overflow-hidden flex flex-col shadow-2xl sm:rounded-[2.5rem] sm:border-[8px] border-gray-900 ring-1 ring-gray-900/10">
        {children}
      </div>
    </div>
  );
}
