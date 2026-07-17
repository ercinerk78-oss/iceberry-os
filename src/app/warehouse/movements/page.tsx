import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { dateTime, MOVEMENT_TYPES, warehouseLabel } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function Movements() {
  const rows = await prisma.stockMovement.findMany({
    select: {
      id: true,
      createdAt: true,
      movementType: true,
      quantity: true,
      beforeQuantity: true,
      afterQuantity: true,
      description: true,
      product: { select: { name: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <AppShell activeHref="/warehouse/movements" eyebrow="Merkez depo" title="Stok Hareketleri">
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr>
              {["Tarih", "Ürün", "Depo", "Tür", "Miktar", "Önce / Sonra", "Açıklama"].map((header) => (
                <th key={header} className="p-3 text-left">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{dateTime(row.createdAt)}</td>
                <td className="p-3 font-semibold">{row.product.name}</td>
                <td className="p-3">{row.warehouse.name}</td>
                <td className="p-3">{warehouseLabel(MOVEMENT_TYPES, row.movementType)}</td>
                <td className="p-3">{row.quantity}</td>
                <td className="p-3">
                  {row.beforeQuantity} → {row.afterQuantity}
                </td>
                <td className="p-3">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
