import{createFranchisee}from"@/app/franchisees/actions";import{AppShell}from"@/components/app-shell";import{FranchiseeForm}from"@/components/franchisees/franchisee-form";import{Card,CardContent}from"@/components/ui/card";
export const dynamic="force-dynamic";
export default function NewFranchiseePage(){return <AppShell activeHref="/franchisees" eyebrow="Manuel kayıt" title="Yeni Bayi Ekle"><Card className="shadow-none"><CardContent className="p-5"><FranchiseeForm action={createFranchisee} cancelHref="/franchisees"/></CardContent></Card></AppShell>}
