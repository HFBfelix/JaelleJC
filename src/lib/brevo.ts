/**
 * Logique d'envoi d'emails via l'API Brevo
 * Standard Luxe : Confirmation d'acquisition & Notifications client
 */

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY; // À placer dans ton fichier .env

export const sendConfirmationEmail = async (clientEmail: string, clientName: string, productName: string) => {
  const url = "https://api.brevo.com/v3/smtp/email";

  const data = {
    sender: { name: "Maison Jaelle & JC", email: "ton-email@domaine.com" },
    to: [{ email: clientEmail, name: clientName }],
    subject: "Confirmation de votre acquisition - Maison Jaelle & JC",
    htmlContent: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f0f0f0;">
        <h1 style="font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: normal; color: #000;">Merci pour votre confiance.</h1>
        <p style="font-size: 13px; line-height: 1.8; color: #666;">
          Bonjour ${clientName},<br><br>
          Nous avons le plaisir de vous confirmer la préparation de votre pièce : <strong>${productName}</strong>.<br>
          Chaque création est emballée avec le plus grand soin dans notre atelier.
        </p>
        <hr style="border: 0; border-top: 0.5px solid #eee; margin: 30px 0;" />
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #999;">
          Maison Jaelle & JC — Basiques & Intemporels
        </p>
      </div>
    `,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log("Email de confirmation envoyé avec succès.");
      return true;
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi Brevo:", error);
    return false;
  }
};