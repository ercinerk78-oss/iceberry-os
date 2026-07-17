export const FINANCE_CURRENCIES = ["TRY", "EUR", "USD"] as const;

export const ROYALTY_MODELS = [
  "PERCENTAGE_OF_REVENUE",
  "FIXED_AMOUNT",
  "GREATER_OF_FIXED_OR_PERCENTAGE",
  "LOWER_OF_FIXED_OR_PERCENTAGE",
  "TIERED_PERCENTAGE",
  "HYBRID",
  "NONE",
] as const;

export const ROYALTY_CALCULATION_BASES = [
  "GROSS_REVENUE",
  "NET_REVENUE",
  "VAT_EXCLUDED_REVENUE",
  "APPROVED_REVENUE",
  "CUSTOM_BASE",
] as const;

export const ROYALTY_PERIODS = ["MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"] as const;

export const ROYALTY_STATUSES = [
  "DRAFT",
  "CALCULATED",
  "REVIEW_REQUIRED",
  "APPROVED",
  "INVOICING_PENDING",
  "INVOICED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "DISPUTED",
  "CANCELLED",
  "REVERSED",
] as const;

export const LEDGER_ENTRY_TYPES = [
  "OPENING_BALANCE",
  "ROYALTY_DEBIT",
  "PRODUCT_SALE_DEBIT",
  "SERVICE_FEE_DEBIT",
  "ADVERTISING_FEE_DEBIT",
  "TRAINING_FEE_DEBIT",
  "PROJECT_FEE_DEBIT",
  "OPENING_SUPPORT_DEBIT",
  "PENALTY_DEBIT",
  "LATE_FEE_DEBIT",
  "MANUAL_DEBIT",
  "PAYMENT_CREDIT",
  "ADVANCE_PAYMENT_CREDIT",
  "RETURN_CREDIT",
  "DISCOUNT_CREDIT",
  "CREDIT_NOTE",
  "SETOFF",
  "MANUAL_CREDIT",
  "REVERSAL",
] as const;

export const PAYMENT_METHODS = [
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "CASH",
  "CHECK",
  "PROMISSORY_NOTE",
  "OFFSET",
  "DIRECT_DEBIT",
  "OTHER",
] as const;

export const PAYMENT_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PARTIALLY_APPLIED",
  "FULLY_APPLIED",
  "CANCELLED",
  "REVERSED",
] as const;

export const FINANCIAL_DISPUTE_TYPES = [
  "REVENUE_AMOUNT",
  "ROYALTY_CALCULATION",
  "INVOICE_AMOUNT",
  "PAYMENT_NOT_REFLECTED",
  "DUPLICATE_CHARGE",
  "RETURN_NOT_REFLECTED",
  "OTHER",
] as const;

export const ROYALTY_MODEL_LABELS: Record<(typeof ROYALTY_MODELS)[number], string> = {
  PERCENTAGE_OF_REVENUE: "Ciro Üzerinden Yüzde",
  FIXED_AMOUNT: "Sabit Tutar",
  GREATER_OF_FIXED_OR_PERCENTAGE: "Sabit veya Yüzdeden Yüksek Olan",
  LOWER_OF_FIXED_OR_PERCENTAGE: "Sabit veya Yüzdeden Düşük Olan",
  TIERED_PERCENTAGE: "Kademeli Yüzde",
  HYBRID: "Hibrit",
  NONE: "Royalty Yok",
};

export const ROYALTY_STATUS_LABELS: Record<(typeof ROYALTY_STATUSES)[number], string> = {
  DRAFT: "Taslak",
  CALCULATED: "Hesaplandı",
  REVIEW_REQUIRED: "İnceleme Gerekli",
  APPROVED: "Onaylandı",
  INVOICING_PENDING: "Fatura Bekliyor",
  INVOICED: "Faturalandı",
  PARTIALLY_PAID: "Kısmi Ödendi",
  PAID: "Ödendi",
  OVERDUE: "Vadesi Geçti",
  DISPUTED: "İtirazlı",
  CANCELLED: "İptal",
  REVERSED: "Ters Kayıt",
};

export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  BANK_TRANSFER: "Banka Havalesi",
  CREDIT_CARD: "Kredi Kartı",
  CASH: "Nakit",
  CHECK: "Çek",
  PROMISSORY_NOTE: "Senet",
  OFFSET: "Mahsup",
  DIRECT_DEBIT: "Otomatik Tahsilat",
  OTHER: "Diğer",
};

export type FinanceCurrency = (typeof FINANCE_CURRENCIES)[number];
export type RoyaltyModel = (typeof ROYALTY_MODELS)[number];
export type RoyaltyStatus = (typeof ROYALTY_STATUSES)[number];
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
