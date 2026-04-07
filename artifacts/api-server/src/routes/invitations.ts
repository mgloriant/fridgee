import { Router } from "express";
import { Resend } from "resend";

const router = Router();

router.post("/invitations/send-email", async (req, res) => {
  const { invitedEmail, inviterEmail, fridgeName, fridgeIcon, appName = "Mon Frigo" } = req.body;

  if (!invitedEmail || !fridgeName) {
    return res.status(400).json({ error: "invitedEmail and fridgeName are required" });
  }

  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.error("[invitations] RESEND_API_KEY is not set");
    return res.status(503).json({ error: "Email service not configured" });
  }

  const resend = new Resend(apiKey);

  const fridgeLabel = [fridgeIcon, fridgeName].filter(Boolean).join(" ");
  const fromEmail = process.env["RESEND_FROM_EMAIL"] ?? "Mon Frigo <onboarding@resend.dev>";

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
    .cta { display: block; background: #3B82F6; color: #fff; text-decoration: none; text-align: center; border-radius: 14px; padding: 16px 24px; font-size: 15px; font-weight: 600; }
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
        ${inviterEmail ? `<strong>${inviterEmail}</strong> vous` : "Vous"} a invité(e) à rejoindre le frigo&nbsp;:
      </p>
      <div class="fridge-chip">${fridgeLabel}</div>
      <p class="msg">
        Ouvrez l'application <strong>${appName}</strong> et rendez-vous dans <strong>Réglages → Invitations</strong> pour accepter l'invitation.
      </p>
      <a class="cta" href="#">Ouvrir Mon Frigo</a>
    </div>
    <div class="footer">
      Si vous n'attendiez pas cette invitation, ignorez simplement cet email.
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: invitedEmail,
      subject: `Invitation à rejoindre le frigo "${fridgeName}" sur ${appName}`,
      html,
    });

    if (error) {
      console.error("[invitations] Resend error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, emailId: data?.id });
  } catch (err: any) {
    console.error("[invitations] Unexpected error:", err);
    return res.status(500).json({ error: err.message ?? "Unknown error" });
  }
});

export default router;
