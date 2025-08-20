// Utilitário de template de e-mail institucional Belz
// Usa cores da marca e logo, com estilos inline para compatibilidade com clientes de e-mail

/**
 * Renderiza um e-mail padronizado da Belz.
 *
 * Parâmetros aceitos:
 * - title: título exibido no corpo do e-mail
 * - contentHtml: HTML do conteúdo (parágrafos/tabelas)
 * - ctaText: texto do botão de ação
 * - ctaUrl: URL do botão
 * - preheader: texto curto de pré-visualização (opcional)
 */
export function renderBrandedEmail({ title, contentHtml, ctaText, ctaUrl, preheader } = {}) {
	const baseUrl = process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
	const logo = `${baseUrl}/logo-belz-email.png`
	const brandBlue = '#021d79' // Azul Belz
	const brandDark = '#130E54'
	const bg = '#f6f6f6'
	const text = '#232323'

	const safe = (v) => String(v == null ? '' : v)

	const cta = (ctaText && ctaUrl)
		? `
			<tr>
				<td align="center" style="padding: 24px 0 6px;">
					<a href="${safe(ctaUrl)}" target="_blank" style="
						background: ${brandBlue};
						color: #ffffff; text-decoration: none;
						padding: 12px 20px; border-radius: 8px;
						display: inline-block; font-weight: 600; font-size: 15px; font-family: Montserrat, Arial, sans-serif;">
						${safe(ctaText)}
					</a>
				</td>
			</tr>
		`
		: ''

	const preheaderHtml = preheader
		? `<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${safe(preheader)}</span>`
		: ''

	return `
	<!doctype html>
	<html lang="pt-br">
		<head>
			<meta charset="utf-8" />
			<meta http-equiv="x-ua-compatible" content="ie=edge" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<title>${safe(title || 'CRM Belz')}</title>
		</head>
		<body style="margin:0;padding:0;background:${bg};">
			${preheaderHtml}
			<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${bg};">
				<tr>
					<td align="center">
						<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;">
							<!-- Header -->
							<tr>
								<td align="center" style="background:${brandBlue};padding:22px 12px;">
									<img src="${logo}" alt="Belz" width="120" style="display:block;border:0;outline:none;text-decoration:none;margin:0 auto;" />
								</td>
							</tr>

							<!-- Card -->
							<tr>
								<td style="background:#ffffff;border-radius:12px;padding:24px 22px 8px;margin:0;border:1px solid #e9e9e9;">
									${title ? `<h1 style="margin:0 0 10px 0;font-family: Montserrat, Arial, sans-serif;font-size:20px;line-height:1.3;color:${brandDark};">${safe(title)}</h1>` : ''}
									<div style="font-family: Montserrat, Arial, sans-serif;font-size:14px;line-height:1.6;color:${text};">
										${safe(contentHtml || '')}
									</div>
									${cta}
								</td>
							</tr>

							<!-- Footer -->
							<tr>
								<td align="center" style="padding:16px 10px 40px;color:#6b7280;font-family: Arial, sans-serif;font-size:12px;">
									© ${new Date().getFullYear()} Belz Seguros — Esta é uma mensagem automática do CRM Belz.
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
