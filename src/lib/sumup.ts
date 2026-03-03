// IA : Service de gestion des paiements SumUp
export const createSumUpCheckout = async (amount: number, currency: string, orderId: string) => {
    // Note : Normalement fait via une Firebase Function pour protéger ta clé API
    const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_SUMUP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkout_reference: orderId,
        amount: amount,
        currency: currency,
        pay_to_email: "contact@jaelleandjc.fr",
        description: `Commande Jaelle & JC #${orderId}`,
      }),
    });
    return await response.json();
  };