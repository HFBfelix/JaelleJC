// IA : Service d'envoi d'emails transactionnels Jaelle & JC via Brevo
export const sendOrderConfirmation = async (orderData: any, customerProfile: any) => {
  const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;

  const emailData = {
    sender: { name: "Jaelle & JC", email: "contact@jaellejc.com" },
    to: [{ email: customerProfile.email, name: customerProfile.displayName }],
    subject: `Confirmation de votre acquisition — Commande #${orderData.id.slice(0, 8)}`,
    htmlContent: `
      <div style="font-family: serif; max-width: 600px; margin: auto; padding: 40px; color: #1a1a1a;">
        <h1 style="font-style: italic; font-weight: normal; text-align: center;">Merci pour votre confiance.</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #666; text-align: center; margin-bottom: 40px;">
          Votre commande a bien été enregistrée dans notre atelier.
        </p>
        <hr style="border: none; border-top: 0.5px solid #eee; margin-bottom: 30px;" />
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #999;">Récapitulatif</h3>
          <p style="font-size: 13px;">Commande : <strong>#${orderData.id}</strong></p>
          <p style="font-size: 13px;">Montant Total : <strong>${orderData.amount} €</strong></p>
        </div>
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: center; color: #999; margin-top: 50px;">
          Jaelle & JC — L'Artisanat au service de l'émotion.
        </p>
      </div>
    `
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });
    return await response.json();
  } catch (error) {
    console.error("Erreur d'envoi Brevo:", error);
  }
};