import{AppShell}from"@/components/app-shell";import{OrderTable}from"@/components/orders/order-table";import{prisma}from"@/lib/prisma";export const dynamic="force-dynamic";
export default async function WarehouseOrders(){const orders=await prisma.franchiseOrder.findMany({where:{status:{in:["WAREHOUSE_QUEUE","PREPARING","READY"]}},include:{franchisee:true,branch:true,items:true},orderBy:{requestedDeliveryDate:"asc"}});return <AppShell activeHref="/warehouse/orders" eyebrow="Merkez depo" title="Hazırlanacak Siparişler"><OrderTable orders={orders}/></AppShell>}

