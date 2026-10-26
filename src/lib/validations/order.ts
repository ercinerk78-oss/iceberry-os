import { z } from "zod";

const optionalMoney = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return 0;
  return value;
}, z.coerce.number().min(0, "Tutar negatif olamaz.").default(0));

export const orderSchema = z.object({
  franchiseeId: z.string().min(1, "Şube grubu seçmelisiniz."),
  branchId: z.string().optional(),
  warehouseId: z.string().min(1, "Depo seçmelisiniz."),
  requestedDeliveryDate: z.string().optional(),
  invoicePreference: z.enum(["CREATE_PARASUT_INVOICE", "CREATE_LATER", "NOT_REQUIRED"]).default("CREATE_LATER"),
  notes: z.string().max(1000, "Not en fazla 1000 karakter olabilir.").optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive("Miktar sıfırdan büyük olmalıdır."),
  })).min(1, "Sepetiniz boş."),
});

export const productSchema = z.object({
  name: z.string().min(2, "Ürün adı zorunludur."),
  sku: z.string().min(2, "SKU zorunludur."),
  barcode: z.string().optional(),
  categoryId: z.string().min(1, "Kategori seçmelisiniz."),
  unit: z.string().min(1),
  vatRate: optionalMoney,
  purchasePrice: optionalMoney,
  salePrice: optionalMoney,
  currency: z.string().default("TRY"),
  minimumStockLevel: optionalMoney,
  description: z.string().optional(),
});
