import { passwordResetMail } from './password-reset.mail.js';

const RESET_URL =
  'https://eventhub.test/reset-password?token=abc-123_DEF&source=email';

const mail = (overrides: { firstName?: string; resetUrl?: string } = {}) => {
  const message = passwordResetMail({
    to: 'camille@exemple.fr',
    firstName: 'Camille',
    resetUrl: RESET_URL,
    ...overrides,
  });
  return { ...message, html: String(message.html), text: message.text ?? '' };
};

describe('passwordResetMail', () => {
  it('is addressed to the user, with a subject about the password', () => {
    const { to, subject } = mail();

    expect(to).toBe('camille@exemple.fr');
    expect(subject).toBe('Réinitialise ton mot de passe EventHub');
  });

  it('greets the user by first name in both bodies', () => {
    const { html, text } = mail();

    expect(html).toContain('Bonjour Camille,');
    expect(text).toContain('Bonjour Camille,');
  });

  it('links the button to the reset page of the front', () => {
    const { html } = mail();

    expect(html).toMatch(
      /<a\s+href="https:\/\/eventhub\.test\/reset-password\?token=abc-123_DEF&amp;source=email"[^>]*>Choisir un nouveau mot de passe<\/a\s*>/,
    );
  });

  it('shows the address in clear, for a client that blocks the button', () => {
    const { html } = mail();

    expect(html).toMatch(
      />https:\/\/eventhub\.test\/reset-password\?token=abc-123_DEF&amp;source=email<\/a\s*>/,
    );
  });

  it('gives the raw address on its own line in the text body', () => {
    const { text } = mail();

    expect(text.split('\n')).toContain(RESET_URL);
  });

  it('says how long the link is valid and that it works once, in both bodies', () => {
    const { html, text } = mail();

    for (const body of [html, text]) {
      expect(body).toContain('valable 1 heure');
      expect(body).toContain('utilisable une seule fois');
    }
  });

  it('tells a user who asked for nothing to ignore the email, in both bodies', () => {
    const { html, text } = mail();

    expect(text).toContain('ton mot de passe reste inchangé');
    expect(html).toContain('ton mot de passe reste inchangé');
  });

  it('escapes the first name in the HTML body', () => {
    const { html } = mail({ firstName: '<b>Cam</b>' });

    expect(html).toContain('&lt;b&gt;Cam&lt;/b&gt;');
    expect(html).not.toContain('<b>Cam</b>');
  });

  it('keeps a link that carries a quote inside its attribute', () => {
    const { html } = mail({
      resetUrl: 'https://eventhub.test/reset-password?token="><script>',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('token=&quot;&gt;&lt;script&gt;');
  });

  it('is a French HTML document', () => {
    const { html } = mail();

    expect(html).toMatch(/^<!doctype html>\s*<html lang="fr">/);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });
});
