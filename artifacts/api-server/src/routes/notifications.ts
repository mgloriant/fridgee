import { Router } from "express";
import { sendBrevoEmail, brevoSender } from "../lib/brevo";

const router = Router();

type ExpiringItem = {
  name: string;
  brand?: string;
  expiryDate?: string;
  daysLeft: number;
};

function urgencyColor(daysLeft: number): string {
  if (daysLeft < 0) return "#DC2626";
  if (daysLeft === 0) return "#DC2626";
  if (daysLeft <= 3) return "#EA580C";
  if (daysLeft <= 7) return "#CA8A04";
  return "#16A34A";
}

function daysLabel(daysLeft: number): string {
  if (daysLeft < 0) return "Expiré";
  if (daysLeft === 0) return "Expire aujourd'hui";
  if (daysLeft === 1) return "Expire demain";
  return `Dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

router.post("/notifications/send-email", async (req, res) => {
  const { userEmail, items, daysThreshold } = req.body as {
    userEmail: string;
    items: ExpiringItem[];
    daysThreshold: number;
  };

  if (!userEmail || !items?.length) {
    return res.status(400).json({ error: "userEmail and items are required" });
  }

  const sender = brevoSender();
  if (!sender.email) {
    return res.status(503).json({ error: "Email service not configured (BREVO_SENDER_EMAIL missing)" });
  }

  const count = items.length;

  const itemRows = items
    .map(
      item => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0;">
          <strong style="color: #1E293B; font-size: 14px;">${item.name}</strong>
          ${item.brand ? `<br/><span style="color: #94A3B8; font-size: 12px;">${item.brand}</span>` : ""}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: center;">
          <span style="font-size: 12px; color: #64748B;">${formatDate(item.expiryDate)}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: right;">
          <span style="
            background-color: ${urgencyColor(item.daysLeft)}22;
            color: ${urgencyColor(item.daysLeft)};
            border: 1px solid ${urgencyColor(item.daysLeft)}44;
            border-radius: 6px;
            padding: 3px 8px;
            font-size: 12px;
            font-weight: 600;
          ">${daysLabel(item.daysLeft)}</span>
        </td>
      </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alerte péremption — Mon Frigo</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #EFF6FF; margin: 0; padding: 32px 16px;">
  <div style="background: #fff; border-radius: 20px; max-width: 520px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #0A1929 0%, #1E3A5F 100%); padding: 32px 32px 24px; text-align: center;">
      <h1 style="color: #60A5FA; font-size: 24px; margin: 0 0 6px;">Mon Frigo</h1>
      <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 0;">Alerte péremption</p>
    </div>
    <div style="padding: 24px 32px;">
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        ${count} produit${count > 1 ? "s" : ""} dans votre frigo
        ${daysThreshold === 0
          ? "expire aujourd'hui"
          : `expire${count > 1 ? "nt" : ""} dans les <strong>${daysThreshold} prochain${daysThreshold > 1 ? "s" : ""} jour${daysThreshold > 1 ? "s" : ""}</strong>`
        } :
      </p>
      <table style="width: 100%; border-collapse: collapse; background: #F8FAFC; border-radius: 12px; overflow: hidden;">
        <thead>
          <tr style="background: #F1F5F9;">
            <th style="padding: 10px 16px; text-align: left; font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Produit</th>
            <th style="padding: 10px 16px; text-align: center; font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">DLC</th>
            <th style="padding: 10px 16px; text-align: right; font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      <p style="color: #94A3B8; font-size: 12px; margin: 20px 0 0; text-align: center;">
        Ouvrez l'application Mon Frigo pour gérer vos produits.
      </p>
    </div>
  </div>
</body>
</html>`.trim();

  const result = await sendBrevoEmail({
    sender,
    to: [{ email: userEmail }],
    subject: `Mon Frigo — ${count} produit${count > 1 ? "s" : ""} à consommer bientôt`,
    htmlContent: html,
  });

  if (!result.ok) {
    req.log.error({ err: result.message }, "[notifications] Brevo error");
    return res.status(result.status === 503 ? 503 : 500).json({ error: result.message });
  }

  return res.json({ success: true, messageId: result.messageId });
});

export default router;
