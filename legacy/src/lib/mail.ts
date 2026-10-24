// IA : Service d'envoi d'emails transactionnels via Brevo
export const sendOrderConfirmation = async (userEmail: string, userName: string, orderDetails: any) => {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.REACT_APP_BREVO_API_KEY as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: "Jaelle & JC", email: "contact@jaellejc.com" },
        to: [{ email: userEmail, name: userName }],
        subject: "Votre commande Jaelle & JC",
        htmlContent: `<html><body><h1>Merci ${userName}</h1><p>Votre commande a bien été reçue et est en cours de préparation dans notre atelier.</p></body></html>`
      }),
    });
    return response.ok;
  };