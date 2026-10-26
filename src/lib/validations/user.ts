import { z } from "zod";

export const userSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad zorunludur."),
  email: z.string().email("Geçerli bir e-posta girin.").transform((value) => value.toLowerCase()),
  phone: z.string().optional(),
  role: z.string().trim().min(1, "Rol seçmelisiniz."),
  password: z.string().min(10, "Şifre en az 10 karakter olmalıdır.").optional().or(z.literal("")),
});
