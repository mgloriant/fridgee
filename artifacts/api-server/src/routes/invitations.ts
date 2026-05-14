import { Router } from "express";
import { sendBrevoEmail, brevoSender } from "../lib/brevo";

const router = Router();

router.post("/invitations/send-email", async (req, res) => {
  const { invitedEmail, inviterEmail, fridgeName, fridgeIcon, appName = "Mon Frigo" } = req.body;

  if (!invitedEmail || !fridgeName) {
    return res.status(400).json({ error: "invitedEmail and fridgeName are required" });
  }

  const sender = brevoSender();
  if (!sender.email) {
    return res.status(503).json({ error: "Email service not configured (BREVO_SENDER_EMAIL missing)" });
  }

  const fridgeLabel = [fridgeIcon, fridgeName].filter(Boolean).join(" ");

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitation Mon Frigo</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #EFF6FF; margin: 0; padding: 32px 16px; }
    .card { background: #fff; border-radius: 20px; max-width: 480px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0A1929 0%, #1E3A5F 100%); padding: 32px 32px 24px; text-align: center; }
    .header h1 { color: #60A5FA; font-size: 26px; margin: 0 0 4px; }
    .header p { color: rgba(255,255,255,0.6); font-size: 13px; margin: 0; }
    .body { padding: 32px; }
    .fridge-chip { display: inline-flex; align-items: center; gap: 8px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 10px 16px; font-size: 16px; font-weight: 600; color: #1E3A5F; margin: 16px 0; }
    .msg { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
    .footer { text-align: center; color: #94A3B8; font-size: 12px; padding: 20px 32px 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${appName}</h1>
      <p>Gestion intelligente de votre frigo</p>
    </div>
    <div class="body">
      <p class="msg">
        ${inviterEmail ? `<strong>${inviterEmail}</strong> vous a invité(e) à rejoindre le frigo&nbsp;:` : "Vous avez été invité(e) à rejoindre le frigo&nbsp;:"}
      </p>
      <div class="fridge-chip">${fridgeLabel}</div>
      <p class="msg">
        Ouvrez l'application <strong>${appName}</strong> et rendez-vous dans <strong>Réglages → Invitations reçues</strong> pour accepter l'invitation.
      </p>
    </div>
    <div class="footer">
      Si vous n'attendiez pas cette invitation, ignorez simplement cet email.
    </div>
  </div>
</body>
</html>`.trim();

  const result = await sendBrevoEmail({
    sender,
    to: [{ email: invitedEmail }],
    subject: `Invitation à rejoindre le frigo "${fridgeName}" sur ${appName}`,
    htmlContent: html,
  });

  if (!result.ok) {
    req.log.error({ err: result.message }, "[invitations] Brevo error");
    return res.status(result.status === 503 ? 503 : 500).json({ error: result.message });
  }

  return res.json({ success: true, messageId: result.messageId });
});

export default router;
