import nodemailer from 'nodemailer'

function getTransport() {
	const host = process.env.SMTP_HOST
	const port = parseInt(process.env.SMTP_PORT || '587')
	const user = process.env.SMTP_USER
	const pass = process.env.SMTP_PASS

	if (host && user && pass) {
		// TLS/SNI options to handle provider certificates (e.g., Skymail wildcard SANs)
		const tls = {}
		if (process.env.SMTP_TLS_SERVERNAME) {
			tls.servername = process.env.SMTP_TLS_SERVERNAME
		}
		if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
			// Use ONLY for local testing; do not disable in production
			tls.rejectUnauthorized = false
		}
		// Optionally avoid TLS upgrade entirely (for legacy dev servers)
		const ignoreTLS = process.env.SMTP_IGNORE_TLS === 'true'

		return nodemailer.createTransport({
			host,
			port,
			secure: port === 465,
			auth: { user, pass },
			tls: Object.keys(tls).length ? tls : undefined,
			ignoreTLS: ignoreTLS || undefined,
		})
	}
	return null
}

export async function sendEmail({ to, subject, html, text }) {
	const override = process.env.EMAIL_OVERRIDE_TO
	const recipients = override ? override : to
	try {
		// Log não sensível de contexto
		// eslint-disable-next-line no-console
		console.log('[EMAIL] Sending', {
			to: Array.isArray(recipients) ? recipients : String(recipients || ''),
			subject: String(subject || '').slice(0, 140),
			usingOverride: Boolean(override),
			provider: (process.env.SMTP_HOST && process.env.SMTP_USER) ? 'SMTP' : (process.env.RESEND_API_KEY ? 'RESEND' : 'NONE'),
			smtpHost: process.env.SMTP_HOST ? '[set]' : '[unset]',
			smtpPort: process.env.SMTP_PORT || '587',
			tlsServername: process.env.SMTP_TLS_SERVERNAME || '[default]',
			tlsRejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
			ignoreTLS: process.env.SMTP_IGNORE_TLS === 'true',
		})
	} catch {}

	// SMTP primeiro
	const transport = getTransport()
	if (transport) {
		try {
			const info = await transport.sendMail({
				from: process.env.EMAIL_FROM || 'no-reply@belz.com.br',
				to: recipients,
				subject,
				text: text || '',
				html: html || undefined,
			})
				try {
					// eslint-disable-next-line no-console
					console.log('[EMAIL] SMTP sent', { id: info?.messageId, host: process.env.SMTP_HOST, port: process.env.SMTP_PORT || '587' })
				} catch {}
			return { ok: true, id: info.messageId }
		} catch (e) {
				try {
					// eslint-disable-next-line no-console
					console.warn('[EMAIL] SMTP failed, will fallback', { message: e?.message })
				} catch {}
			// continua para fallback
		}
	}

	// Fallback Resend
	const resendKey = process.env.RESEND_API_KEY
	if (resendKey) {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${resendKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: process.env.EMAIL_FROM || 'no-reply@belz.com.br',
				to: Array.isArray(recipients) ? recipients : [recipients],
				subject,
				html: html || undefined,
				text: text || '',
			})
		})
			if (res.ok) {
				try {
					// eslint-disable-next-line no-console
					console.log('[EMAIL] RESEND sent')
				} catch {}
				return { ok: true }
			}
			const data = await res.text().catch(() => '')
			try {
				// eslint-disable-next-line no-console
				console.error('[EMAIL] RESEND error', { status: res.status, body: data?.slice?.(0, 200) })
			} catch {}
			return { ok: false, error: data || 'Email provider error' }
	}

		try {
			// eslint-disable-next-line no-console
			console.error('[EMAIL] No provider configured')
		} catch {}
		return { ok: false, error: 'No email provider configured' }
}
