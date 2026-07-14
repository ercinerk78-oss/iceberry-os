export type AccountingContact={id:string;name:string};
export type AccountingProduct={id:string;name:string;sku:string};
export type InvoiceInput={orderId:string;orderNumber:string;contactName:string;total:number;currency:string};
export type InvoiceResult={id:string;number:string;status:string};
export interface AccountingService{findOrCreateContact(name:string,taxNumber?:string|null):Promise<AccountingContact>;findOrCreateProduct(input:{name:string;sku:string}):Promise<AccountingProduct>;createSalesInvoice(input:InvoiceInput):Promise<InvoiceResult>;getInvoiceStatus(id:string):Promise<string>;cancelInvoice(id:string):Promise<void>}

