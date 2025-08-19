import { NextResponse } from 'next/server'
const gone = (path) => NextResponse.json({ error: 'Endpoint migrado para Nest', path }, { status: 410 })
export async function OPTIONS() { return gone('/api/proposals') }
export async function GET() { return gone('/api/proposals') }
export async function POST() { return gone('/api/proposals') }
