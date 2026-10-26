export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f4] p-6">
      <section className="w-full max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
        <div className="mx-auto size-10 animate-spin rounded-full border-2 border-[#dfe4dc] border-t-[#477533]" />
        <h1 className="mt-5 text-lg font-semibold">Yükleniyor</h1>
        <p className="mt-2 text-sm text-[#65705f]">Iceberry OS verileri hazırlanıyor.</p>
      </section>
    </main>
  );
}
