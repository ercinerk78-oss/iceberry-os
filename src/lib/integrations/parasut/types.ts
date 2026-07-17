export type ParasutInvoiceLine = {
  externalProductId?: string;
  sku?: string;
  barcode?: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
};

export type ParasutInvoicePayload = {
  id: string;
  invoiceNumber?: string;
  invoiceType: "SALES" | "PURCHASE";
  status?: string;
  externalOrderId?: string;
  orderReference?: string;
  contactId?: string;
  contactName?: string;
  taxNumber?: string;
  invoiceDate?: string;
  subtotal?: number;
  vatTotal?: number;
  total: number;
  currency?: string;
  lines: ParasutInvoiceLine[];
};

export type CreateSalesInvoiceInput = {
  orderId: string;
  orderNumber: string;
  contactExternalId: string;
  total: number;
  currency: string;
  lines: ParasutInvoiceLine[];
};
