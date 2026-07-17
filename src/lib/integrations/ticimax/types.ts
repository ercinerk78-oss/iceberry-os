export type TicimaxOrderLine = {
  externalProductId?: string;
  sku?: string;
  barcode?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

export type TicimaxOrderPayload = {
  id: string;
  orderNumber: string;
  version?: string;
  customerId?: string;
  dealerId?: string;
  storeId?: string;
  customerCode?: string;
  customerName?: string;
  taxNumber?: string;
  phone?: string;
  email?: string;
  branchName?: string;
  currency?: string;
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  createdAt?: string;
  status?: string;
  lines: TicimaxOrderLine[];
};

export type TicimaxWebhookPayload = {
  eventType?: string;
  eventId?: string;
  order?: TicimaxOrderPayload;
  orderId?: string;
  orderNumber?: string;
  version?: string;
};
