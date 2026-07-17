import type { CreateSalesInvoiceInput, ParasutInvoicePayload } from "@/lib/integrations/parasut/types";

export class ParasutClient {
  private readonly baseUrl = process.env.PARASUT_API_URL ?? "https://api.parasut.com/v4";
  private readonly companyId = process.env.PARASUT_COMPANY_ID ?? "";
  private readonly accessToken = process.env.PARASUT_ACCESS_TOKEN ?? "";

  isConfigured() {
    return Boolean(this.companyId && this.accessToken);
  }

  async testConnection() {
    if (!this.isConfigured()) throw new Error("Paraşüt API token veya company id eksik.");
    const response = await fetch(`${this.baseUrl}/${this.companyId}/me`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Paraşüt bağlantı testi başarısız: ${response.status}`);
    return true;
  }

  async createSalesInvoice(input: CreateSalesInvoiceInput) {
    if (!this.isConfigured()) throw new Error("Paraşüt API token veya company id eksik.");
    const response = await fetch(`${this.baseUrl}/${this.companyId}/sales_invoices`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Paraşüt satış faturası oluşturulamadı: ${response.status}`);
    return response.json() as Promise<{ id: string; number?: string; status?: string; total?: number; currency?: string }>;
  }

  async getInvoice(invoiceId: string) {
    if (!this.isConfigured()) throw new Error("Paraşüt API token veya company id eksik.");
    const response = await fetch(`${this.baseUrl}/${this.companyId}/invoices/${encodeURIComponent(invoiceId)}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Paraşüt faturası alınamadı: ${response.status}`);
    return response.json() as Promise<ParasutInvoicePayload>;
  }
}
