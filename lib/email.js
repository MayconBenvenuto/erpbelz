import nodemailer from 'nodemailer'

function getTransport() {
	const host = process.env.SMTP_HOST
	const port = parseInt(process.env.SMTP_PORT || '587')
	const user = process.env.SMTP_USER
	const pass = process.env.SMTP_PASS
	if (host && user && pass) {
		return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
	}
	return null
}

export async function sendEmail({ to, subject, html, text }) {
	const override = process.env.EMAIL_OVERRIDE_TO
	const recipients = override ? override : to

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
			return { ok: true, id: info.messageId }
		} catch (e) {
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
		if (res.ok) return { ok: true }
		const data = await res.text().catch(() => '')
		return { ok: false, error: data || 'Email provider error' }
	}

	return { ok: false, error: 'No email provider configured' }
}
