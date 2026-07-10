import { Role } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export const shareDocumentSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).refine((role) => role !== Role.OWNER, {
    message: "Cannot assign OWNER role via share",
  }),
});

export const createVersionSchema = z.object({
  ydocSnapshot: z.string().min(1),
  plainText: z.string().optional(),
  label: z.string().max(200).optional(),
});

export const restoreVersionSchema = z.object({
  ydocSnapshot: z.string().min(1),
});
