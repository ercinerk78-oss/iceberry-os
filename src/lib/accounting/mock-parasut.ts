import type{AccountingService,InvoiceInput}from"./types";
export class MockParasutService implements AccountingService{
 async findOrCreateContact(name:string){return{id:`mock-contact-${slug(name)}`,name}}
 async findOrCreateProduct(input:{name:string;sku:string}){return{id:`mock-product-${input.sku}`, ...input}}
 async createSalesInvoice(input:InvoiceInput){return{id:`mock-invoice-${input.orderId}`,number:`PS-${input.orderNumber}`,status:"CREATED"}}
 async getInvoiceStatus(){return"CREATED"}
 async cancelInvoice(){return}
}
function slug(value:string){return value.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/gi,"-")}

