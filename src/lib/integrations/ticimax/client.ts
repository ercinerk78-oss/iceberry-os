import { INTEGRATION_ERROR_CODES } from "@/lib/integrations/constants";
import type { TicimaxOrderPayload } from "@/lib/integrations/ticimax/types";

export class TicimaxClient {
  private readonly baseUrl = process.env.TICIMAX_API_URL ?? "";
  private readonly apiKey = process.env.TICIMAX_API_KEY ?? "";

  isConfigured() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async testConnection() {
    if (!this.isConfigured()) throw new Error(`${INTEGRATION_ERROR_CODES.AUTHENTICATION_ERROR}: Ticimax API bilgileri eksik.`);
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/health`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Ticimax bağlantı testi başarısız: ${response.status}`);
    return true;
  }

  async getOrder(orderId: string): Promise<TicimaxOrderPayload> {
    if (!this.isConfigured()) throw new Error(`${INTEGRATION_ERROR_CODES.AUTHENTICATION_ERROR}: Ticimax API bilgileri eksik.`);
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Ticimax siparişi alınamadı: ${response.status}`);
    return response.json() as Promise<TicimaxOrderPayload>;
  }
}
