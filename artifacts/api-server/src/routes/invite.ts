import { Router } from "express";

const router = Router();

// GET /api/invite?token=xxx&fridge=...&icon=...&by=...
// Web landing page for invited users (works with or without the app installed)
router.get("/invite", async (req, res) => {
  const { token, fridge, icon, by } = req.query as Record<string, string>;

  if (!token) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(400).send(
      `<!DOCTYPE html><html lang="fr"><body style="font-family:sans-serif;padding:32px;background:#0A1929;color:#fff">
        <h2 style="color:#EF4444">Lien invalide</h2>
        <p style="color:rgba(255,255,255,0.6)">Ce lien d'invitation est incomplet ou a expiré.</p>
      </body></html>`
    );
  }

  const supabaseUrl = process.env["SUPABASE_URL"] ?? "";
  const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"] ?? "";

  const fridgeLabel = [icon, fridge].filter(Boolean).join(" ") || "Frigo partagé";

  // Build deep link for users who already have the app installed
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  const deepLink = `mon-frigo://invite?token=${encodeURIComponent(token)}&fridge=${encodeURIComponent(fridge ?? "")}&icon=${encodeURIComponent(icon ?? "")}&by=${encodeURIComponent(by ?? "")}`;
  const acceptEndpoint = `/api/invite/accept`;

  const inviterHtml = by
    ? `<strong>${by}</strong> vous invite à rejoindre :`
    : "Vous avez été invité(e) à rejoindre :";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>Invitation — Mon Frigo</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0A1929;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 16px 56px}
    .logo{text-align:center;margin-bottom:28px}
    .logo-icon{width:68px;height:68px;background:rgba(96,165,250,.15);border-radius:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:34px;line-height:1}
    .logo h1{color:#60A5FA;font-size:24px;font-weight:700}
    .logo p{color:rgba(255,255,255,.4);font-size:13px;margin-top:3px}
    .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;width:100%;max-width:420px;overflow:hidden}
    .card-header{padding:22px 22px 18px;border-bottom:1px solid rgba(255,255,255,.07)}
    .invite-msg{color:rgba(255,255,255,.6);font-size:14px;line-height:1.55;margin-bottom:12px}
    .invite-msg strong{color:#fff}
    .fridge-chip{display:inline-flex;align-items:center;gap:8px;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.3);border-radius:12px;padding:9px 15px;font-size:16px;font-weight:600;color:#60A5FA}
    .card-body{padding:22px}
    .app-btn{display:block;width:100%;background:#1E3A5F;border:1px solid rgba(96,165,250,.3);border-radius:12px;padding:13px;color:#60A5FA;font-size:15px;font-weight:600;text-align:center;text-decoration:none;margin-bottom:18px;cursor:pointer}
    .app-btn:hover{background:#264d7a}
    .sep{display:flex;align-items:center;gap:12px;margin-bottom:18px}
    .sep-line{flex:1;height:1px;background:rgba(255,255,255,.1)}
    .sep-text{color:rgba(255,255,255,.35);font-size:12px;white-space:nowrap}
    .tabs{display:flex;background:rgba(255,255,255,.05);border-radius:10px;padding:3px;margin-bottom:18px}
    .tab{flex:1;padding:8px;text-align:center;border-radius:8px;cursor:pointer;color:rgba(255,255,255,.5);font-size:14px;font-weight:500;transition:all .18s;user-select:none}
    .tab.active{background:#1E3A5F;color:#fff}
    .field{margin-bottom:13px}
    label{display:block;color:rgba(255,255,255,.55);font-size:11px;font-weight:600;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
    input{width:100%;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.12);border-radius:10px;padding:11px 13px;color:#fff;font-size:15px;outline:none;transition:border-color .15s}
    input:focus{border-color:#60A5FA}
    input::placeholder{color:rgba(255,255,255,.3)}
    .submit-btn{width:100%;background:#2563EB;border:none;border-radius:12px;padding:13px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;margin-top:4px;transition:background .15s}
    .submit-btn:hover{background:#1d4ed8}
    .submit-btn:disabled{opacity:.5;cursor:not-allowed}
    .msg{border-radius:10px;padding:11px 13px;font-size:14px;margin-bottom:14px;display:none;line-height:1.4}
    .msg.error{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#FCA5A5}
    .msg.success{background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);color:#86EFAC}
    .success-view{text-align:center;padding:28px 20px;display:none}
    .success-icon{font-size:52px;margin-bottom:14px}
    .success-title{color:#86EFAC;font-size:20px;font-weight:700;margin-bottom:8px}
    .success-sub{color:rgba(255,255,255,.55);font-size:14px;line-height:1.5}
    .hint{color:rgba(255,255,255,.35);font-size:12px;text-align:center;margin-top:14px;line-height:1.5}
  </style>
</head>
<body>
  <div class="logo">
    <div class="logo-icon">❄️</div>
    <h1>Mon Frigo</h1>
    <p>Gestion de votre frigo</p>
  </div>

  <div class="card">
    <div class="card-header">
      <p class="invite-msg">${inviterHtml}</p>
      <div class="fridge-chip">${fridgeLabel}</div>
    </div>

    <div class="card-body" id="mainContent">
      <!-- Deep link for users who already have the app -->
      <a href="${deepLink}" class="app-btn" id="openAppBtn">
        Ouvrir dans l'application Mon Frigo
      </a>

      <div class="sep">
        <div class="sep-line"></div>
        <span class="sep-text">Pas encore l'application ?</span>
        <div class="sep-line"></div>
      </div>

      <!-- Login / Register tabs -->
      <div class="tabs">
        <div class="tab active" id="tabLogin" onclick="switchTab('login')">Se connecter</div>
        <div class="tab" id="tabRegister" onclick="switchTab('register')">Créer un compte</div>
      </div>

      <div id="msgBox" class="msg"></div>

      <!-- Login form -->
      <div id="formLogin">
        <div class="field">
          <label>Email</label>
          <input type="email" id="loginEmail" placeholder="votre@email.com" autocomplete="email" />
        </div>
        <div class="field">
          <label>Mot de passe</label>
          <input type="password" id="loginPassword" placeholder="••••••••" autocomplete="current-password" />
        </div>
        <button class="submit-btn" id="loginBtn" onclick="handleLogin()">Se connecter et accepter</button>
      </div>

      <!-- Register form -->
      <div id="formRegister" style="display:none">
        <div class="field">
          <label>Email</label>
          <input type="email" id="regEmail" placeholder="votre@email.com" autocomplete="email" />
        </div>
        <div class="field">
          <label>Mot de passe</label>
          <input type="password" id="regPassword" placeholder="Min. 6 caractères" autocomplete="new-password" />
        </div>
        <button class="submit-btn" id="regBtn" onclick="handleRegister()">Créer un compte et accepter</button>
      </div>

      <p class="hint">Utilisez l'adresse email qui a reçu cette invitation.</p>
    </div>

    <!-- Success state -->
    <div id="successView" class="success-view">
      <div class="success-icon">✅</div>
      <p class="success-title">Invitation acceptée !</p>
      <p class="success-sub">
        Le frigo <strong>${fridgeLabel}</strong> est maintenant accessible dans votre application Mon Frigo.
      </p>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <script>
    const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
    const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
    const INVITE_TOKEN = ${JSON.stringify(token)};
    const ACCEPT_ENDPOINT = ${JSON.stringify(acceptEndpoint)};

    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    function switchTab(tab) {
      document.getElementById("formLogin").style.display = tab === "login" ? "block" : "none";
      document.getElementById("formRegister").style.display = tab === "register" ? "block" : "none";
      document.getElementById("tabLogin").className = "tab" + (tab === "login" ? " active" : "");
      document.getElementById("tabRegister").className = "tab" + (tab === "register" ? " active" : "");
      clearMsg();
    }

    function showMsg(text, type) {
      const box = document.getElementById("msgBox");
      box.textContent = text;
      box.className = "msg " + type;
      box.style.display = "block";
    }

    function clearMsg() {
      document.getElementById("msgBox").style.display = "none";
    }

    function setLoading(id, loading, label) {
      const btn = document.getElementById(id);
      btn.disabled = loading;
      btn.textContent = loading ? "Chargement..." : label;
    }

    async function acceptInvitation(accessToken) {
      const res = await fetch(ACCEPT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: INVITE_TOKEN, accessToken }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Erreur lors de l'acceptation");
    }

    function showSuccess() {
      document.getElementById("mainContent").style.display = "none";
      document.getElementById("successView").style.display = "block";
    }

    async function handleLogin() {
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      if (!email || !password) { showMsg("Remplissez tous les champs.", "error"); return; }
      setLoading("loginBtn", true, "Se connecter et accepter");
      clearMsg();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { showMsg(error.message, "error"); setLoading("loginBtn", false, "Se connecter et accepter"); return; }
      try {
        await acceptInvitation(data.session.access_token);
        showSuccess();
      } catch(e) {
        showMsg(e.message, "error");
        setLoading("loginBtn", false, "Se connecter et accepter");
      }
    }

    async function handleRegister() {
      const email = document.getElementById("regEmail").value.trim();
      const password = document.getElementById("regPassword").value;
      if (!email || !password) { showMsg("Remplissez tous les champs.", "error"); return; }
      if (password.length < 6) { showMsg("Le mot de passe doit faire au moins 6 caractères.", "error"); return; }
      setLoading("regBtn", true, "Créer un compte et accepter");
      clearMsg();
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) { showMsg(error.message, "error"); setLoading("regBtn", false, "Créer un compte et accepter"); return; }
      if (data.session) {
        // No email confirmation required — accept immediately
        try {
          await acceptInvitation(data.session.access_token);
          showSuccess();
        } catch(e) {
          showMsg(e.message, "error");
          setLoading("regBtn", false, "Créer un compte et accepter");
        }
      } else {
        // Supabase requires email confirmation
        showMsg(
          "Un email de confirmation vous a été envoyé. Une fois votre compte confirmé, connectez-vous ici pour accepter l'invitation.",
          "success"
        );
        switchTab("login");
        document.getElementById("loginEmail").value = email;
        setLoading("regBtn", false, "Créer un compte et accepter");
      }
    }
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.send(html);
});

// POST /api/invite/accept
// Verifies the invitation token against the authenticated user and accepts it
router.post("/invite/accept", async (req, res) => {
  const { token, accessToken } = req.body as {
    token?: string;
    accessToken?: string;
  };

  if (!token || !accessToken) {
    return res.status(400).json({ error: "token et accessToken sont requis" });
  }

  const supabaseUrl = process.env["SUPABASE_URL"] ?? "";
  const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"] ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: "Supabase non configuré côté serveur" });
  }

  // 1. Verify access token and get user info
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!userRes.ok) {
    return res.status(401).json({ error: "Token d'authentification invalide ou expiré" });
  }

  const userBody = (await userRes.json()) as { id: string; email: string };
  const userEmail = (userBody.email ?? "").toLowerCase().trim();
  const userId = userBody.id;

  // 2. Fetch the pending invitation by token (using user's token — RLS ensures access)
  const invRes = await fetch(
    `${supabaseUrl}/rest/v1/fridge_invitations?token=eq.${encodeURIComponent(token)}&status=eq.pending&select=id,fridge_id,invited_email`,
    {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!invRes.ok) {
    req.log.error({ status: invRes.status }, "[invite/accept] failed to fetch invitation");
    return res.status(500).json({ error: "Erreur lors de la récupération de l'invitation" });
  }

  type InvRow = { id: string; fridge_id: string; invited_email: string };
  const invitations = (await invRes.json()) as InvRow[];

  if (!invitations.length) {
    return res
      .status(404)
      .json({ error: "Invitation introuvable, déjà utilisée ou expirée" });
  }

  const invitation = invitations[0]!;
  const invitedEmail = invitation.invited_email.toLowerCase().trim();

  if (invitedEmail !== userEmail) {
    return res.status(403).json({
      error: `Cette invitation est destinée à ${invitation.invited_email}`,
    });
  }

  // 3. Mark invitation as accepted
  await fetch(
    `${supabaseUrl}/rest/v1/fridge_invitations?id=eq.${invitation.id}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ status: "accepted" }),
    }
  );

  // 4. Insert user as fridge member (self-insert allowed by RLS)
  const memberRes = await fetch(`${supabaseUrl}/rest/v1/fridge_members`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      fridge_id: invitation.fridge_id,
      user_id: userId,
      role: "member",
    }),
  });

  // 409 = already a member — not an error
  if (!memberRes.ok && memberRes.status !== 409) {
    req.log.warn({ status: memberRes.status }, "[invite/accept] fridge_members insert issue");
  }

  req.log.info({ userId, fridgeId: invitation.fridge_id }, "[invite/accept] accepted");
  return res.json({ success: true });
});

export default router;
