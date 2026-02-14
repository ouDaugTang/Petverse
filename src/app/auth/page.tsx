import { Suspense } from "react";

import { AuthForm } from "@/components/auth";

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-[#e9e3d5] px-4 py-12">
      <div className="relative z-10 pointer-events-auto">
        <Suspense
          fallback={
            <div className="mx-auto max-w-4xl rounded-2xl border border-stone-300 bg-[#f8f4ea] p-6 text-sm text-stone-600">
              Loading auth...
            </div>
          }
        >
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
