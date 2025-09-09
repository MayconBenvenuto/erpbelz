#!/usr/bin/env node
/* eslint-disable no-console */
/*
	Script de SEED (teste / dev)
	- Requer SEED_CONFIRM=TEST
	- Usa *_TEST_* se definidas; senão fallback para NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
	- NÃO execute isso em produção. (Abortará se NODE_ENV=production)
*/

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ---------- Salvaguardas ----------
if (process.env.NODE_ENV === 'production') {
	console.error('❌ Abortado: NODE_ENV=production')
	process.exit(1)
}

if (process.env.SEED_CONFIRM !== 'TEST') {
	console.error('❌ Defina SEED_CONFIRM=TEST para continuar.')
	process.exit(1)
}

let SUPABASE_URL = process.env.SUPABASE_TEST_URL || process.env.NEXT_PUBLIC_SUPABASE_TEST_URL
let SUPABASE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY || process.env.SUPABASE_TEST_ANON_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
	SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
	SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	console.log('ℹ️ Fallback: usando variáveis padrão (.env.local).')
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
	console.error('❌ URL ou chave supabase não resolvidas.')
	process.exit(1)
}
if (/supabase\.co$/i.test(new URL(SUPABASE_URL).host)) {
	console.log('Alvo Supabase:', SUPABASE_URL)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------- Config ----------
const cfg = {
	clientes: parseInt(process.env.SEED_CLIENTES || '10',10),
	propostas: parseInt(process.env.SEED_PROPOSTAS || '25',10),
	solicitacoes: parseInt(process.env.SEED_SOLICITACOES || '25',10)
}

const OPERADORAS = [ 'unimed recife','unimed seguros','bradesco','amil','ampla','fox','hapvida','medsenior','sulamerica','select' ]
const STATUS = [ 'recepcionado','análise','pendência','pleito seguradora','boleto liberado','implantado','proposta declinada' ]
const SOLIC_STATUS = ['aberta','em validação','em execução','concluída','cancelada']
const marker = 'seed_test_flag'

const rand = (arr)=> arr[Math.floor(Math.random()*arr.length)]
const rint = (a,b)=> Math.floor(Math.random()*(b-a+1))+a
const fakeCNPJ = ()=> Array.from({length:14},()=> Math.floor(Math.random()*10)).join('')
const fakeEmpresa = ()=> rand(['Alpha','Beta','Giga','Health','Prime','Vida','Nova','Apex','Atlas'])+' '+rand(['Corp','Group','Brasil','Saúde'])
const fakeEmail = (p)=> `${p}.${crypto.randomBytes(3).toString('hex')}@example.com`

async function wipe() {
	console.log('🧹 Limpando registros marcados...')
	const tables = ['propostas','solicitacoes','clientes_consultor']
	for (const t of tables) {
		// tenta deletar por campo "observacoes" ou similar; fallback de deleção ampla por código flag interno
		let { error } = await supabase.from(t).delete().like('observacoes', `%${marker}%`)
		if (error && !/column .*observacoes/i.test(error.message)) {
			// ignora se coluna não existe; segue
			console.log('  ⚠️', t, error.message)
		}
	}
}

async function ensureUsers() {
	console.log('👥 Garantindo usuários base...')
	const users = [
		{ email:'gestor.test@example.com', nome:'Gestor Test', tipo_usuario:'gestor' },
		{ email:'gerente.test@example.com', nome:'Gerente Test', tipo_usuario:'gerente' },
		{ email:'analista.impl.test@example.com', nome:'Analista Impl Test', tipo_usuario:'analista_implantacao' },
		{ email:'analista.mov.test@example.com', nome:'Analista Mov Test', tipo_usuario:'analista_movimentacao' },
		{ email:'consultor.test@example.com', nome:'Consultor Test', tipo_usuario:'consultor' },
	]
	const ids = {}
	for (const u of users) {
		const { data: found } = await supabase.from('usuarios').select('id').eq('email', u.email).maybeSingle()
		if (found?.id) { ids[u.tipo_usuario]=found.id; continue }
		const senhaHash = crypto.createHash('sha256').update('Senha123!').digest('hex')
		const { data, error } = await supabase.from('usuarios').insert({ ...u, senha: senhaHash }).select('id').single()
		if (error) { console.log('  ⚠️ Usuário', u.email, error.message); continue }
		ids[u.tipo_usuario]=data.id
	}
	return ids
}

async function seedClientes(consultorId) {
	console.log(`🏢 Clientes: ${cfg.clientes}`)
	for (let i=0;i<cfg.clientes;i++) {
		const rec = {
			consultor_id: consultorId,
			cnpj: fakeCNPJ(),
			razao_social: fakeEmpresa(),
			responsavel: 'Resp '+(i+1),
			email_responsavel: fakeEmail('contato'),
			whatsapp_responsavel: '8199'+String(100000+i).slice(-6)
		}
		const { error } = await supabase.from('clientes_consultor').insert(rec)
		if (error && error.code !== '23505') console.log('  ⚠️ cliente', error.message)
	}
}

async function seedPropostas(ids) {
	console.log(`📄 Propostas: ${cfg.propostas}`)
	const autores = [ids.analista_implantacao, ids.analista_movimentacao].filter(Boolean)
	for (let i=0;i<cfg.propostas;i++) {
		const autor = rand(autores)
		const status = rand(STATUS)
		const payload = {
			cnpj: fakeCNPJ(),
			consultor: 'Consultor Test',
			consultor_email: 'consultor.test@example.com',
			cliente_nome: 'Cliente '+(i+1),
			cliente_email: fakeEmail('cliente'),
			operadora: rand(OPERADORAS),
			quantidade_vidas: rint(2,40),
			valor: parseFloat((Math.random()*4000+200).toFixed(2)),
			previsao_implantacao: new Date(Date.now()+rint(1,30)*86400000).toISOString().slice(0,10),
			status,
			criado_por: autor,
			atendido_por: autor,
			atendido_em: new Date().toISOString(),
			observacoes: marker
		}
		const { error } = await supabase.from('propostas').insert(payload)
		if (error) console.log('  ⚠️ proposta', error.message)
	}
}

async function seedSolicitacoes(ids) {
	console.log(`🧾 Solicitações: ${cfg.solicitacoes}`)
	const criadores = [ids.consultor, ids.analista_movimentacao].filter(Boolean)
	const tipos = ['inclusao','exclusao','alteracao']
	for (let i=0;i<cfg.solicitacoes;i++) {
		const criado_por = rand(criadores)
		const status = rand(SOLIC_STATUS)
		const historico = [{ status:'aberta', em:new Date().toISOString(), usuario_id: criado_por }]
		if (status !== 'aberta') historico.push({ status, em:new Date().toISOString(), usuario_id: criado_por })
		const rec = {
			tipo: rand(tipos),
			subtipo: 'funcionario',
			razao_social: fakeEmpresa(),
			cnpj: fakeCNPJ(),
			apolice_da_belz: Math.random()>0.5,
			operadora: rand(OPERADORAS),
			observacoes: marker,
			arquivos: [],
			dados: {},
			historico,
			status,
			sla_previsto: new Date(Date.now()+rint(-3,7)*86400000).toISOString().slice(0,10),
			criado_por,
			atendido_por: status==='aberta'? null : criado_por
		}
		const { error } = await supabase.from('solicitacoes').insert(rec)
		if (error) console.log('  ⚠️ solicitacao', error.message)
	}
}

async function main() {
	if (process.argv.includes('--wipe')) {
		await wipe()
		console.log('✅ Limpeza concluída')
		if (!process.argv.includes('--seed')) return
	}
	console.log('🚀 Iniciando seed em TEST URL:', SUPABASE_URL)
	const ids = await ensureUsers()
	if (!ids.consultor) { console.error('❌ Consultor não criado. Abortando.'); process.exit(1) }
	await seedClientes(ids.consultor)
	await seedPropostas(ids)
	await seedSolicitacoes(ids)
	console.log('✅ Seed finalizado com sucesso.')
}

main().catch(e=>{ console.error('💥 Erro no seed', e); process.exit(1) })

