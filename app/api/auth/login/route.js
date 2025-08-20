import { NextResponse } from 'next/server'

const gone = (path) => NextResponse.json({ error: 'Endpoint migrado para Nest', path }, { status: 410 })

export async function OPTIONS() { return gone('/api/auth/login') }
export async function GET() { return gone('/api/auth/login') }
export async function POST() { return gone('/api/auth/login') }
export async function PATCH() { return gone('/api/auth/login') }
export async function DELETE() { return gone('/api/auth/login') }
