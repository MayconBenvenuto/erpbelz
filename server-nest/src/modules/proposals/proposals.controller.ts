import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { randomUUID } from 'crypto'
import { EmailService } from '../../common/email.service'
import { renderBrandedEmail } from '../../common/email-template'
import { formatCurrency, formatCNPJ } from '../../common/utils'

@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(@Inject('SUPABASE') private supabase: any) {}

  @Get()
  async list(@Req() req: any) {
  let base = this.supabase.from('propostas').select('*')
  // Ordenação desejada: por codigo (PRP0000) asc
  let query = base.order('codigo', { ascending: true })

    // Analista: ver apenas suas propostas. Considera legado por email.
    if (req.user.tipo_usuario !== 'gestor') {
      const email = String(req.user.email || '').toLowerCase()
      // criado_por OU consultor_email
      query = query.or(`criado_por.eq.${req.user.id},consultor_email.eq.${email}`)
    }
    let { data, error } = await query
    // Fallbacks de ordenação caso colunas não existam
    if (error && /codigo/i.test(error.message)) {
      // tenta por criado_em asc
      const retry1 = base.order('criado_em', { ascending: true })
      const r1 = await retry1
      data = r1.data
      error = r1.error
    }
    if (error && /criado_em/i.test(error.message)) {
      const retry2 = base.order('id', { ascending: true })
      const r2 = await retry2
      data = r2.data
      error = r2.error
    }
    if (error) throw new Error(error.message)
    return data || []
  }

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const required = ['cnpj','consultor','consultor_email','operadora','quantidade_vidas','valor','status','criado_por']
    for (const k of required) if (body[k] === undefined || body[k] === null) return { error: 'Dados inválidos' }

  const dataToInsert = { id: randomUUID(), ...body, criado_em: new Date().toISOString() }
    if (req.user.tipo_usuario !== 'gestor') {
      dataToInsert.criado_por = req.user.id
      if (!dataToInsert.consultor_email) dataToInsert.consultor_email = String(req.user.email || '').toLowerCase()
    }

    const { data, error } = await this.supabase.from('propostas').insert([dataToInsert]).select().single()
    if (error) throw new Error(error.message)

    if (data.status === 'implantado') {
      await this.supabase.rpc('atualizar_meta_usuario', {
        p_usuario_id: data.criado_por,
        p_valor: Number(data.valor) || 0,
      })
    }
    return data
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const status = body?.status
    const criado_por = body?.criado_por
    const valor = body?.valor

    const { data: current, error: fetchError } = await this.supabase
      .from('propostas').select('id, criado_por, valor, status, cnpj, operadora').eq('id', id).single()
    if (fetchError || !current) return { error: 'Proposta não encontrada' }

    if (
      req.user.tipo_usuario !== 'gestor' &&
      current.criado_por !== req.user.id &&
      String((current as any).consultor_email || '').toLowerCase() !== String(req.user.email || '').toLowerCase()
    ) {
      return { error: 'Sem permissão para alterar esta proposta' }
    }

    let q = this.supabase.from('propostas').update({ status }).eq('id', id)
    if (req.user.tipo_usuario !== 'gestor') {
      const email = String(req.user.email || '').toLowerCase()
      // restringe por criado_por OU consultor_email
      q = q.or(`criado_por.eq.${req.user.id},consultor_email.eq.${email}`)
    }
    const { data: updated, error } = await q.select().single()
    if (error) throw new Error(error.message)
    if (!updated) return { error: 'Acesso negado' }

    if (status === 'implantado') {
      await this.supabase.rpc('atualizar_meta_usuario', {
        p_usuario_id: criado_por || updated.criado_por,
        p_valor: Number(valor || updated.valor || 0),
      })
    }

    // Notify analyst by email similar to current Next API
    try {
      const { data: analyst } = await this.supabase
        .from('usuarios')
        .select('email, nome')
        .eq('id', updated.criado_por)
        .single()
      if (analyst?.email) {
        const code: string | undefined = (updated as any).codigo
        const humanStatus = String(status).charAt(0).toUpperCase() + String(status).slice(1)
        const empresaCNPJ = updated.cnpj ? formatCNPJ(updated.cnpj) : undefined
        let empresaLabel = updated.cnpj ? `CNPJ ${empresaCNPJ || updated.cnpj}` : 'Não informado'
        const appUrl = process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const valorFmt = formatCurrency(updated.valor || 0)
        const operadora = updated.operadora || 'Não informado'
        const subject = code
          ? `[CRM Belz] Proposta ${code} atualizada: ${humanStatus}`
          : `[CRM Belz] Proposta atualizada: ${humanStatus}`
        const text = `Olá ${analyst.nome || ''},\n\nA proposta${code ? ` ${code}` : ''} foi atualizada.\n\nEmpresa: ${empresaLabel}\nOperadora: ${operadora}\nValor: ${valorFmt}\nStatus atual: ${humanStatus}\n\nAcesse o CRM para mais detalhes: ${appUrl}\n\n— CRM Belz`
        const html = renderBrandedEmail({
          title: 'Atualização de status da proposta',
          ctaText: 'Abrir CRM',
          ctaUrl: appUrl,
          contentHtml: `
            <p>Olá ${analyst.nome || ''},</p>
            <p>A proposta${code ? ` <strong>${code}</strong>` : ''} foi atualizada com as seguintes informações:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
              ${code ? `<tr><td style="padding:6px 0;"><strong>Código:</strong> ${code}</td></tr>` : ''}
              <tr><td style="padding:6px 0;"><strong>Empresa:</strong> ${empresaLabel}</td></tr>
              <tr><td style="padding:6px 0;"><strong>Operadora:</strong> ${operadora}</td></tr>
              <tr><td style="padding:6px 0;"><strong>Valor:</strong> ${valorFmt}</td></tr>
              <tr><td style="padding:6px 0;"><strong>Status atual:</strong> ${humanStatus}</td></tr>
            </table>
          `,
        })
        const mail = new EmailService()
        // Envia para o analista e também para o corretor (consultor_email), com deduplicação
        const consultorEmail = String((updated as any).consultor_email || '').toLowerCase()
        const analystEmail = String(analyst.email || '').toLowerCase()
        const recipients = Array.from(new Set([analystEmail, consultorEmail].filter(Boolean)))
        await mail.send({ to: recipients.join(', '), subject, text, html })
      }
    } catch {}

    return updated
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    if (req.user.tipo_usuario !== 'gestor') return { error: 'Apenas gestores' }
    const { error } = await this.supabase.from('propostas').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  }
}
