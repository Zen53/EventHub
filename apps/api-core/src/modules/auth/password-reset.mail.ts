import { html, type MailSendOptions } from '@nestjs/mail';

export interface PasswordResetMailInput {
  to: string;
  firstName: string;
  resetUrl: string;
}

export const passwordResetMail = ({
  to,
  firstName,
  resetUrl,
}: PasswordResetMailInput): MailSendOptions => ({
  to,
  subject: 'Réinitialise ton mot de passe EventHub',
  text: [
    `Bonjour ${firstName},`,
    'Tu as demandé à réinitialiser ton mot de passe EventHub. Choisis-en un nouveau avec ce lien, valable 1 heure et utilisable une seule fois :',
    resetUrl,
    "Si tu n'es pas à l'origine de cette demande, ignore cet email : ton mot de passe reste inchangé.",
  ].join('\n\n'),
  html: html`<p>Bonjour ${firstName},</p>
    <p>
      Tu as demandé à réinitialiser ton mot de passe EventHub. Choisis-en un
      nouveau avec ce lien, valable 1 heure et utilisable une seule fois :
    </p>
    <p><a href="${resetUrl}">Choisir un nouveau mot de passe</a></p>
    <p>
      Si tu n'es pas à l'origine de cette demande, ignore cet email : ton mot de
      passe reste inchangé.
    </p>`,
});
