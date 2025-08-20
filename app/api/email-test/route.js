import { NextResponse } from 'next/server'
const _gone = (path) => NextResponse.json({ error: 'Endpoint migrado para Nest', path }, { status: 410 })
export async function OPTIONS() { return _gone('/api/email-test') }
export async function POST() { return _gone('/api/email-test') }
