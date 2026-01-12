// --- CONFIGURATION DES SERVICES ---
const BREVO_API_KEY = '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';
const EMAIL_RECEPTION_CONTACT = 'contact@jaellejc.com';

// Configuration Firebase (Placée avant l'initialisation)
const firebaseConfig = {
    apiKey: "AIzaSyA-kRFLyh_2CnkbTHCsiVZs2cZcE-f-cv4",
    authDomain: "jaellejc.firebaseapp.com",
    projectId: "jaellejc",
    storageBucket: "jaellejc.firebasestorage.app",
    messagingSenderId: "199093066060",
    appId: "1:199093066060:web:298e1528322ff7f47b97e9",
    measurementId: "G-BHFEM85RCJ"
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- FONCTION D'ACHAT (FIREBASE + BREVO + SUMUP) ---
async function acquerirProduit(nomProduit, sumupLink) {
    const email = prompt("Pour l'envoi de votre facture, merci d'entrer votre email :");
    const nom = prompt("Votre nom et prénom :");

    if (!email || !nom) return;

    // 1. Création de l'ID unique (Suivi SumUp & IA)
    const transactionId = `JJC-${Date.now()}`;

    try {
        // 2. Enregistrement dans Firebase Firestore
        await db.collection("commandes").add({
            nom: nom,
            email: email,
            produit: nomProduit,
            transaction_id: transactionId,
            status: "en_attente",
            date: new Date().toISOString()
        });

        // 3. Notification Brevo (Vous alerte par mail d'une vente en cours)
        await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 
                'api-key': BREVO_API_KEY, 
                'content-type': 'application/json' 
            },
            body: JSON.stringify({
                sender: { name: "Système Jaelle & JC", email: "noreply@jaellejc.com" },
                to: [{ email: EMAIL_RECEPTION_CONTACT }],
                subject: "⚡ Nouvelle intention d'achat !",
                textContent: `${nom} (${email}) tente d'acheter : ${nomProduit}. ID: ${transactionId}`
            })
        });

        // 4. Redirection vers SumUp avec le tracker ID
        window.location.href = `${sumupLink}?description=${transactionId}`;

    } catch (error) {
        console.error("Erreur système :", error);
        alert("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    }
}

// --- GESTION DU FORMULAIRE DE CONTACT (AVEC ANTI-SPAM HONEPOT) ---
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Sécurité Honeypot : Si le champ caché est rempli, c'est un robot
        const honeypot = document.getElementById('honeypot').value;
        if (honeypot !== "") {
            console.log("Spam robot bloqué.");
            return;
        }

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            message: document.getElementById('message').value
        };

        try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: formData.name, email: formData.email },
                    to: [{ email: EMAIL_RECEPTION_CONTACT, name: 'Jaelle & JC' }],
                    subject: `Nouveau message de ${formData.name} - Jaelle & JC`,
                    textContent: formData.message
                })
            });

            if (response.ok) {
                document.getElementById('form-status').innerText = "Votre message a été transmis avec élégance.";
                contactForm.reset();
            }
        } catch (error) {
            console.error("Erreur contact :", error);
            document.getElementById('form-status').innerText = "Une erreur est survenue. Veuillez réessayer plus tard.";
        }
    });
}