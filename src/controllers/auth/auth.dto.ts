import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  body: z.object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can contain only letters, numbers, and underscores",
      )
      .transform((value) => value.trim()),
    password: passwordSchema,
    displayName: z.string().min(2).max(50).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
    password: z.string().min(1),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .email()
      .transform((value) => value.trim().toLowerCase()),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: passwordSchema,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  }),
});
