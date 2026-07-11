import { Role } from "@prisma/client";
import nodemailer from "nodemailer";
import { roleLabel } from "@/lib/roles";

export type InviteEmailParams = {
  to: string;
  inviteUrl: string;
  documentTitle: string;
  inviterName: string;
  role: Role;
};

export function isEmailConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function getTransporter() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function accessLabel(role: Role): string {
  return role === Role.EDITOR ? "edit" : "view";
}

export async function sendDocumentInviteEmail(
  params: InviteEmailParams
): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn("[email] SMTP not configured — skipping invite email");
    return;
  }

  const from =
    process.env.SMTP_FROM ?? `DocSync <${process.env.SMTP_USER}>`;
  const { to, inviteUrl, documentTitle, inviterName, role } = params;
  const permission = accessLabel(role);

  const subject = `${inviterName} invited you to collaborate on "${documentTitle}"`;
  const text = [
    `${inviterName} invited you to ${permission} the document "${documentTitle}" on DocSync.`,
    "",
    "Create your account and open the document:",
    inviteUrl,
    "",
    `You will have ${roleLabel(role)} access.`,
    "",
    "This invite link expires in 7 days.",
  ].join("\n");

  const html = `
    <p><strong>${inviterName}</strong> invited you to <strong>${permission}</strong> the document <strong>${documentTitle}</strong> on DocSync.</p>
    <p><a href="${inviteUrl}">Accept invite and create your account</a></p>
    <p>You will have <strong>${roleLabel(role)}</strong> access.</p>
    <p style="color:#71717A;font-size:13px;">This invite link expires in 7 days.</p>
  `;

  const transporter = getTransporter();
  await transporter.sendMail({ from, to, subject, text, html });
}

export function queueDocumentInviteEmail(params: InviteEmailParams): boolean {
  if (!isEmailConfigured()) return false;

  void sendDocumentInviteEmail(params).catch((err) => {
    console.error("[email] Failed to send invite email:", err);
  });

  return true;
}
