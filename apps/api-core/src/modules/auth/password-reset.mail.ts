import { html, type MailSendOptions } from '@nestjs/mail';

export interface PasswordResetMailInput {
  to: string;
  firstName: string;
  resetUrl: string;
  validForMs: number;
}

const SUBJECT = 'Réinitialise ton mot de passe EventHub';
const BUTTON_LABEL = 'Choisir un nouveau mot de passe';
const FALLBACK =
  'Le bouton ne fonctionne pas ? Copie cette adresse dans ton navigateur :';
const IGNORE =
  "Si tu n'es pas à l'origine de cette demande, ignore cet email : ton mot de passe reste inchangé.";
const FONT = 'font-family:Helvetica,Arial,sans-serif';

const plural = (count: number, unit: string): string =>
  `${count} ${unit}${count > 1 ? 's' : ''}`;

export const formatValidity = (validForMs: number): string => {
  const totalMinutes = Math.max(1, Math.round(validForMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [
    hours > 0 ? plural(hours, 'heure') : null,
    minutes > 0 ? plural(minutes, 'minute') : null,
  ]
    .filter((part) => part !== null)
    .join(' ');
};

const content = (validForMs: number) => {
  const validity = formatValidity(validForMs);
  return {
    preheader: `Choisis un nouveau mot de passe : le lien est valable ${validity}.`,
    intro: `Tu as demandé à réinitialiser ton mot de passe EventHub. Choisis-en un nouveau avec ce lien, valable ${validity} et utilisable une seule fois :`,
  };
};

export const passwordResetMail = ({
  to,
  firstName,
  resetUrl,
  validForMs,
}: PasswordResetMailInput): MailSendOptions => {
  const { preheader, intro } = content(validForMs);
  return {
    to,
    subject: SUBJECT,
    text: [
      `Bonjour ${firstName},`,
      intro,
      resetUrl,
      IGNORE,
      "L'équipe EventHub",
    ].join('\n\n'),
    html: html`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${SUBJECT}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f6f1e7;">
          <div
            style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f6f1e7;"
          >
            ${preheader}
          </div>
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="background-color:#f6f1e7;"
          >
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;"
                >
                  <tr>
                    <td
                      style="padding:28px 32px;background-color:#1a120e;border-bottom:3px solid #e24a1b;${FONT};font-size:12px;font-weight:bold;letter-spacing:4px;color:#f3d7a1;"
                    >
                      EVENTHUB
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="padding:32px 32px 8px;${FONT};font-size:16px;line-height:26px;color:#1a120e;"
                    >
                      <h1
                        style="margin:0 0 20px;${FONT};font-size:26px;line-height:34px;font-weight:bold;color:#1a120e;"
                      >
                        Un nouveau départ.
                      </h1>
                      <p style="margin:0 0 16px;">Bonjour ${firstName},</p>
                      <p style="margin:0;">${intro}</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:24px 32px;">
                      <a
                        href="${resetUrl}"
                        style="display:inline-block;padding:14px 28px;background-color:#e24a1b;border-radius:8px;${FONT};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;"
                        >${BUTTON_LABEL}</a
                      >
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="padding:0 32px 32px;${FONT};font-size:14px;line-height:22px;color:#6d6258;"
                    >
                      <p style="margin:0 0 8px;">${FALLBACK}</p>
                      <p style="margin:0 0 24px;word-break:break-all;">
                        <a href="${resetUrl}" style="color:#e24a1b;"
                          >${resetUrl}</a
                        >
                      </p>
                      <p style="margin:0;">${IGNORE}</p>
                    </td>
                  </tr>
                </table>
                <p
                  style="margin:20px 0 0;${FONT};font-size:12px;letter-spacing:2px;color:#6d6258;"
                >
                  CONCERT · THÉÂTRE · FESTIVAL
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>`,
  };
};
