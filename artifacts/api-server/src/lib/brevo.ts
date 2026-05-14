type BrevoRecipient = { email: string; name?: string };

type BrevoEmailPayload = {
  sender: { name: string; email: string };
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
};

export type BrevoResult =
  | { ok: true; messageId: string }
  | { ok: false; status: number; message: string };

export async function sendBrevoEmail(payload: BrevoEmailPayload): Promise<BrevoResult> {
  const apiKey = process.env["BREVO_API_KEY"];
  if (!apiKey) {
    return { ok: false, status: 503, message: "BREVO_API_KEY is not configured" };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Unknown error" }));
    return { ok: false, status: res.status, message: (body as any).message ?? String(res.status) };
  }

  const body = await res.json().catch(() => ({}));
  return { ok: true, messageId: (body as any).messageId ?? "" };
}

export function brevoSender(): { name: string; email: string } {
  return {
    name: process.env["BREVO_SENDER_NAME"] ?? "Mon Frigo",
    email: process.env["BREVO_SENDER_EMAIL"] ?? "",
  };
}
