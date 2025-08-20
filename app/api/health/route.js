import { NextResponse } from 'next/server'
const _gone = (path) => NextResponse.json({ error: 'Endpoint migrado para Nest', path }, { status: 410 })
export async function OPTIONS() { return _gone('/api/health') }
export async function GET() { return _gone('/api/health') }
