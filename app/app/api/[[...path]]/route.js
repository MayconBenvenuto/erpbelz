import { NextResponse } from 'next/server'

// Rota catch-all desativada: não deve bloquear rotas válidas sob /api/*.
// Responde 404 genérico para caminhos não mapeados, permitindo que rotas específicas funcionem.

export async function OPTIONS() {
	return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}
export async function GET() {
	return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}
export async function POST() {
	return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}
export async function PUT() {
	return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}
export async function DELETE() {
	return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}
export async function PATCH() {
	return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}
