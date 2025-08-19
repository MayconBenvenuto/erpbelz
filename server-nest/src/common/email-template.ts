export function renderBrandedEmail({ title, contentHtml, ctaText, ctaUrl }: { title?: string, contentHtml?: string, ctaText?: string, ctaUrl?: string }) {
  const appUrl = process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo-belz.jpg`
  const primary = '#130E54'
  const secondary = '#021d79'

  const buttonHtml = ctaText && ctaUrl ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto 0;">
      <tr>
        <td style="border-radius:8px; background:${secondary};">
          <a href="${ctaUrl}" target="_blank" rel="noopener" style="display:inline-block; padding:12px 20px; color:#ffffff; text-decoration:none; font-weight:600; font-family:Arial, Helvetica, sans-serif; font-size:14px;">${ctaText}</a>
        </td>
      </tr>
    </table>
  ` : ''

  return `
  <!doctype html>
  <html lang="pt-BR">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${escapeHtml(title || 'Notificação - CRM Belz')}</title>
  </head>
  <body style="margin:0; padding:0; background:#f6f6f6;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
            <tr>
              <td align="center" style="background:${primary}; padding:20px 16px; color:#ffffff;">
                <img src="${logoUrl}" alt="Belz Seguros" width="120" style="display:block; border:0; outline:none; text-decoration:none; margin:0 auto 8px;"/>
                <h1 style="margin:8px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:20px; line-height:24px; font-weight:700;">${escapeHtml(title || 'CRM Belz')}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 16px; color:#111827; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:20px;">
                ${contentHtml || ''}
                ${buttonHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px; background:#fafafa; color:#6b7280; font-family:Arial, Helvetica, sans-serif; font-size:12px;">
                <p style="margin:0;">© ${new Date().getFullYear()} CRM Belz — belzseguros.com.br</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `
}

function escapeHtml(str?: string) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
