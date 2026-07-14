import { AppShell } from "@/components/app-shell";
import { LeadInbox } from "@/components/leads/lead-inbox";
import { prisma } from "@/lib/prisma";
import { toLead } from "@/lib/leads";
export const dynamic="force-dynamic";
export default async function LeadsPage(){const records=await prisma.lead.findMany({include:{activities:{orderBy:{createdAt:"desc"}}},orderBy:{leadDate:"desc"}});return <AppShell activeHref="/leads" eyebrow="Dönüşüm öncesi inceleme" title="Lead Havuzu"><LeadInbox leads={records.map(toLead)}/></AppShell>}
