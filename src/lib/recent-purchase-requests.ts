export const PURCHASE_REQUEST_WARNING_HOURS = 72;

export function recentPurchaseRequestWhere(productIds: string[], now = new Date()) {
  return {
    productId: { in: [...new Set(productIds)] },
    purchaseRequest: {
      createdAt: { gte: new Date(now.getTime() - PURCHASE_REQUEST_WARNING_HOURS * 60 * 60 * 1000), lte: now },
      status: { notIn: ["CANCELLED", "REJECTED"] },
    },
  };
}

export type RecentPurchaseRequest = {
  productId: string;
  requestNumber: string;
  createdAt: string;
  warehouseName: string;
  quantity: number;
  unit: string;
};
