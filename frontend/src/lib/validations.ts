import { Role } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
  inviteToken: z.string().optional(),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export const saveYdocStateSchema = z.object({
  ydocState: z.string().min(1),
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

export const userSearchSchema = z.object({
  q: z.string().min(2).max(100),
  documentId: z.string().min(1),
});

export const createInviteSchema = z.object({
  role: z.nativeEnum(Role).refine((role) => role !== Role.OWNER, {
    message: "Cannot invite as OWNER",
  }),
  email: z.string().email().optional(),
});

export const summarizeSchema = z.object({
  plainText: z.string().min(1).max(50_000),
});
