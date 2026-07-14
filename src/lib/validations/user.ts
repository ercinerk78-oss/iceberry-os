import{z}from"zod";import{USER_ROLES}from"@/lib/permissions";export const userSchema=z.object({name:z.string().trim().min(2,"Ad soyad zorunludur."),email:z.string().email("Geçerli bir e-posta girin.").transform(v=>v.toLowerCase()),phone:z.string().optional(),role:z.enum(USER_ROLES),password:z.string().min(10,"Şifre en az 10 karakter olmalıdır.").optional().or(z.literal(""))});

