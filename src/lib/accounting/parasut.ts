import type{AccountingService,AccountingContact,AccountingProduct,InvoiceInput,InvoiceResult}from"./types";
export class ParasutService implements AccountingService{
 private unavailable():never{throw new Error("Gerçek Paraşüt bağlantısı henüz etkin değil.")}
 async findOrCreateContact(name:string,taxNumber?:string|null):Promise<AccountingContact>{void name;void taxNumber;return this.unavailable()}
 async findOrCreateProduct(input:{name:string;sku:string}):Promise<AccountingProduct>{void input;return this.unavailable()}
 async createSalesInvoice(input:InvoiceInput):Promise<InvoiceResult>{void input;return this.unavailable()}
 async getInvoiceStatus(id:string):Promise<string>{void id;return this.unavailable()}
 async cancelInvoice(id:string):Promise<void>{void id;return this.unavailable()}
}
