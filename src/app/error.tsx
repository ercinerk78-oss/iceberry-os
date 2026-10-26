"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f4] p-6">
      <section className="w-full max-w-lg rounded-lg border bg-white p-7 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#477533]">Iceberry OS</p>
        <h1 className="mt-3 text-2xl font-semibold">İşlem tamamlanamadı</h1>
        <p className="mt-2 text-sm text-[#65705f]">Beklenmeyen bir durum oluştu. Sayfayı yeniden deneyebilir veya ana menüden devam edebilirsiniz.</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={reset}>Tekrar Dene</Button>
        </div>
      </section>
    </main>
  );
}
