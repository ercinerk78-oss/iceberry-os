import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { hasPermissionWithOverrides } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { orderSchema } from "@/lib/validations/order";
import { orderPreviewPdf } from "@/lib/order-preview-pdf";
import { orderPdfFilename } from "@/lib/order-pdf-filename";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

export async function POST(request: Request) {
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Oturum açmalısınız."},{status:401});
  if(!hasPermissionWithOverrides(user.role,"orders",user.permissions))return NextResponse.json({error:"Bu işlem için yetkiniz yok."},{status:403});
  if(request.headers.get("origin") && request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Geçersiz istek kaynağı."},{status:403});
  const raw=await request.text();
  if(Buffer.byteLength(raw)>65536)return NextResponse.json({error:"Sipariş çok büyük."},{status:413});
  let data: unknown;
  try{data=JSON.parse(raw);}catch{return NextResponse.json({error:"Geçersiz sipariş verisi."},{status:400});}
  const parsed=orderSchema.safeParse(data);
  if(!parsed.success || parsed.data.items.length>200)return NextResponse.json({error:"Sipariş alanlarını ve ürün miktarlarını kontrol edin."},{status:400});
  const input=parsed.data;
  if(input.items.some(item=>item.quantity>1_000_000_000))return NextResponse.json({error:"Ürün miktarı izin verilen aralığı aşıyor."},{status:400});
  const delivery=input.requestedDeliveryDate?new Date(input.requestedDeliveryDate+"T12:00:00Z"):null;
  if(delivery&&(!/^\d{4}-\d{2}-\d{2}$/.test(input.requestedDeliveryDate!)||!Number.isFinite(delivery.getTime())||delivery.toISOString().slice(0,10)!==input.requestedDeliveryDate))return NextResponse.json({error:"Geçerli bir teslim tarihi girin."},{status:400});
  const [products,warehouse,branch,group]=await Promise.all([
    prisma.product.findMany({where:{id:{in:input.items.map(item=>item.productId)},isActive:true,archivedAt:null},select:{id:true,name:true,sku:true,unit:true,salePrice:true,currency:true,vatRate:true}}),
    prisma.warehouse.findFirst({where:{id:input.warehouseId,isActive:true},select:{name:true}}),
    input.branchId?prisma.branch.findFirst({where:{id:input.branchId,archivedAt:null},select:{branchName:true,address:true,city:true,district:true}}):null,
    !input.branchId&&input.franchiseeId?prisma.franchisee.findFirst({where:{id:input.franchiseeId,archivedAt:null},select:{companyName:true,address:true,city:true,district:true}}):null,
  ]);
  if(!warehouse||products.length!==input.items.length||(!branch&&!group))return NextResponse.json({error:"Şube, depo veya ürün kaydı bulunamadı."},{status:400});
  const currency=products[0].currency;
  if(products.some(product=>product.currency!==currency))return NextResponse.json({error:"Farklı para birimlerindeki ürünler ayrı sipariş verilmelidir."},{status:400});
  try {
    const address=branch??group!;
    const bytes=await orderPreviewPdf({
      customer:branch?.branchName??group!.companyName,address:[address.address,address.district,address.city].filter(Boolean).join(", "),warehouse:warehouse.name,
      deliveryDate:delivery?new Intl.DateTimeFormat("tr-TR",{dateStyle:"short",timeZone:"Europe/Istanbul"}).format(delivery):undefined,notes:input.notes,currency,
      items:input.items.map(item=>{const product=products.find(p=>p.id===item.productId)!;return{name:product.name,sku:product.sku,unit:product.unit,quantity:item.quantity,unitPrice:product.salePrice,vatRate:product.vatRate,manualShortShipment:item.manualShortShipment};}),
    });
    const filename=orderPdfFilename(branch?.branchName??group!.companyName);
    return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${filename}"`,"X-Iceberry-Pdf-Filename":filename,"Cache-Control":"private, no-store"}});
  } catch {
    console.error("Order preview PDF generation failed");
    return NextResponse.json({error:"PDF oluşturulamadı. Lütfen tekrar deneyin."},{status:500});
  }
}
