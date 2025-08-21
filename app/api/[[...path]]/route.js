import { NextResponse } from 'next/server'

const gone = (method, path) => NextResponse.json({ error: 'Endpoint migrado para Nest', method, path }, { status: 410 })

export async function OPTIONS() { return gone('OPTIONS', '/api/*') }
export async function GET() { return gone('GET', '/api/*') }
export async function POST() { return gone('POST', '/api/*') }
export async function PUT() { return gone('PUT', '/api/*') }
export async function DELETE() { return gone('DELETE', '/api/*') }
export async function PATCH() { return gone('PATCH', '/api/*') }
