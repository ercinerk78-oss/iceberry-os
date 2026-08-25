import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PrintLabelButton } from "@/components/warehouse/print-label-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProductBarcodeLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { name: true, sku: true, barcode: true },
  });

  if (!product) notFound();

  return (
    <AppShell activeHref="/warehouse/stock" eyebrow="Merkez depo" title="Barkod Etiketi">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button asChild variant="outline">
            <Link href="/warehouse/stock">Stoklara Dön</Link>
          </Button>
          <PrintLabelButton />
        </div>

        <section className="mx-auto w-full max-w-md rounded-xl border bg-white p-6 text-center shadow-sm print:border-0 print:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#65705f]">Iceberry OS</p>
          <h2 className="mt-3 text-xl font-semibold">{product.name}</h2>
          <p className="mt-1 text-sm text-[#65705f]">Ürün kodu: {product.sku}</p>
          {product.barcode ? (
            <>
              <BarcodeBars value={product.barcode} />
              <p className="mt-3 font-mono text-lg tracking-[0.2em]">{product.barcode}</p>
            </>
          ) : (
            <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Bu ürün için barkod tanımlanmamış.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function BarcodeBars({ value }: { value: string }) {
  const chars = `*${value}*`.slice(0, 80).split("");
  let x = 8;
  const bars = chars.flatMap((char, index) => {
    const code = char.charCodeAt(0);
    const widths = [1 + (code % 3), 1, 2 + (code % 2), 1, 1 + ((code + index) % 3)];
    return widths.map((width, widthIndex) => {
      const currentX = x;
      x += width + 2;
      return widthIndex % 2 === 0 ? <rect key={`${index}-${widthIndex}`} x={currentX} y="10" width={width} height="86" fill="#111827" /> : null;
    });
  });

  return (
    <svg viewBox="0 0 420 110" role="img" aria-label={`${value} barkod görseli`} className="mt-6 h-28 w-full rounded-lg bg-white">
      <rect width="420" height="110" fill="white" />
      {bars}
    </svg>
  );
}
