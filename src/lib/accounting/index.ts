import type{AccountingService}from"./types";import{MockParasutService}from"./mock-parasut";import{ParasutService}from"./parasut";
export function accountingService():AccountingService{return process.env.ACCOUNTING_PROVIDER==="parasut"?new ParasutService():new MockParasutService()}

