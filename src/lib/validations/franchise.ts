import { z } from "zod";
import { BRANCH_CONCEPTS, BRANCH_OWNERSHIP_TYPES, BRANCH_STATUSES, FRANCHISEE_STATUSES, LOCATION_TYPES } from "@/lib/franchise";

const optional=z.string().trim().optional().or(z.literal(""));
const date=optional.refine(v=>!v||!Number.isNaN(Date.parse(v)),"Geçerli bir tarih girin.");
const rate=optional.refine(v=>!v||(!Number.isNaN(Number(v))&&Number(v)>=0&&Number(v)<=100),"Oran 0 ile 100 arasında olmalıdır.");
const amount=optional.refine(v=>!v||(!Number.isNaN(Number(v))&&Number(v)>=0),"Geçerli bir sayı girin.");
export const franchiseeSchema=z.object({companyName:z.string().trim().min(2,"Şirket adı en az 2 karakter olmalıdır."),contactName:z.string().trim().min(2,"Yetkili kişi zorunludur."),phone:z.string().trim().min(10,"Geçerli bir telefon girin."),whatsapp:optional,email:optional.refine(v=>!v||z.email().safeParse(v).success,"Geçerli bir e-posta girin."),taxNumber:optional,taxOffice:optional,city:z.string().trim().min(2,"Şehir zorunludur."),district:optional,address:optional,status:z.enum(Object.keys(FRANCHISEE_STATUSES) as [keyof typeof FRANCHISEE_STATUSES,...(keyof typeof FRANCHISEE_STATUSES)[]]),contractDate:date,contractStartDate:date,contractEndDate:date,defaultRoyaltyRate:rate,marketingContributionRate:rate,generalNotes:optional});
export const branchSchema=z.object({
  franchiseeId:optional,
  candidateId:optional,
  sourceLeadId:optional,
  branchName:z.string().trim().min(2,"Şube adı zorunludur."),
  branchCode:z.string().trim().min(2,"Şube kodu zorunludur."),
  legalName:optional,
  tradeName:optional,
  ownershipType:z.enum(Object.keys(BRANCH_OWNERSHIP_TYPES) as [keyof typeof BRANCH_OWNERSHIP_TYPES,...(keyof typeof BRANCH_OWNERSHIP_TYPES)[]]),
  city:z.string().trim().min(2,"Şehir zorunludur."),
  district:optional,
  address:optional,
  country:optional,
  latitude:amount,
  longitude:amount,
  phone:optional,
  email:optional.refine(v=>!v||z.email().safeParse(v).success,"Geçerli bir e-posta girin."),
  mallName:optional,
  floor:optional,
  unitNumber:optional,
  squareMeters:amount,
  authorizedPersonName:optional,
  authorizedPersonPhone:optional,
  authorizedPersonEmail:optional.refine(v=>!v||z.email().safeParse(v).success,"Geçerli bir e-posta girin."),
  taxOffice:optional,
  taxNumber:optional,
  billingAddress:optional,
  concept:z.enum(Object.keys(BRANCH_CONCEPTS) as [keyof typeof BRANCH_CONCEPTS,...(keyof typeof BRANCH_CONCEPTS)[]]),
  locationType:z.enum(Object.keys(LOCATION_TYPES) as [keyof typeof LOCATION_TYPES,...(keyof typeof LOCATION_TYPES)[]]),
  openingDate:date,
  plannedOpeningDate:date,
  closingDate:date,
  contractStartDate:date,
  contractEndDate:date,
  leaseStartDate:date,
  leaseEndDate:date,
  rentAmount:amount,
  turnoverRentRate:rate,
  depositAmount:amount,
  royaltyRate:rate,
  marketingContributionRate:rate,
  managerName:optional,
  managerPhone:optional,
  managerEmail:optional.refine(v=>!v||z.email().safeParse(v).success,"Geçerli bir e-posta girin."),
  operationsManager:optional,
  status:z.enum(Object.keys(BRANCH_STATUSES) as [keyof typeof BRANCH_STATUSES,...(keyof typeof BRANCH_STATUSES)[]]),
  generalNotes:optional,
}).superRefine((data,ctx)=>{
  if(data.openingDate&&data.closingDate&&new Date(data.closingDate)<new Date(data.openingDate))ctx.addIssue({code:"custom",path:["closingDate"],message:"Kapanış tarihi açılış tarihinden önce olamaz."});
  if(data.contractStartDate&&data.contractEndDate&&new Date(data.contractEndDate)<new Date(data.contractStartDate))ctx.addIssue({code:"custom",path:["contractEndDate"],message:"Sözleşme bitiş tarihi başlangıçtan önce olamaz."});
});
export type FormState={success:boolean;message:string;id?:string};
