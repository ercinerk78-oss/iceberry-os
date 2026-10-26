"use server";
import { changeLeadCategory, changeLeadStatus, convertLead } from "@/app/leads/actions";
import type { LeadActionState } from "@/lib/validations/lead";
export async function changeLeadStatusForm(leadId:string,_:LeadActionState,formData:FormData):Promise<LeadActionState>{return changeLeadStatus(leadId,String(formData.get("status")))}
export async function changeLeadCategoryForm(leadId:string,_:LeadActionState,formData:FormData):Promise<LeadActionState>{return changeLeadCategory(leadId,formData)}
export async function convertLeadForm(leadId:string,previousState:LeadActionState):Promise<LeadActionState>{void previousState;return convertLead(leadId)}
