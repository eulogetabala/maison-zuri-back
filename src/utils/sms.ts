/**
 * Service SMS via BREVO API
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;

interface SMSPayload {
  to: string;
  sender: string;
  content: string;
  type?: 'transactional' | 'marketing';
}

/**
 * Envoie un SMS transactionnel via l'API Brevo (v3)
 */
export async function sendSMS({ to, sender, content }: SMSPayload) {
  if (!BREVO_API_KEY) {
    console.warn('⚠️ BREVO_API_KEY non configurée. SMS non envoyé:', content);
    return;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: sender.substring(0, 11), // Brevo limite le sender à 11 caractères
        recipient: to,
        content: content,
        type: 'transactional'
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erreur Brevo SMS API:', data);
    } else {
      console.log('✅ SMS envoyé avec succès à', to);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du SMS:', error);
  }
}
