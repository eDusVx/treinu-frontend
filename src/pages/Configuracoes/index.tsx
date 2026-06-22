import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  ArrowLeftRight,
  Award,
  Lightbulb,
  MessageSquare,
  Phone,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout'
import Modal from '../../components/Modal'
import { useAuth } from '../../hooks'
import { alunoService } from '../../services/aluno.service'
import { treinadorService } from '../../services/treinador.service'
import { plataformaService } from '../../services/plataforma.service'
import { usuariosService } from '../../services/usuarios.service'
import { extractError, getInitials } from '../../utils'
import type {
  AlunoDtoCompleto,
  AvaliacaoFisicaCompleta,
  ClassificacaoIMC,
  ConfigurarNotificacoesPayload,
  ContatoCompleto,
  ContatoPayload,
  EspecializacaoPayload,
  PlataformaRedeSocialEnum,
  TipoContatoEnum,
} from '../../types'

const TIPOS_CONTATO: { value: TipoContatoEnum; label: string }[] = [
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'REDE_SOCIAL', label: 'Rede Social' },
  { value: 'SITE', label: 'Site' },
]

const NIVEIS = ['Sedentário', 'Iniciante', 'Intermediário', 'Avançado'] as const

const OBJETIVO_LABEL: Record<string, string> = {
  EMAGRECIMENTO: 'Emagrecimento',
  HIPERTROFIA: 'Hipertrofia',
  SAUDE: 'Saúde',
  PERFORMANCE: 'Performance',
  REABILITACAO: 'Reabilitação',
  OUTROS: 'Outros',
}

const CLASSIFICACAO_LABEL: Record<ClassificacaoIMC, string> = {
  ABAIXO_DO_PESO: 'Abaixo do peso',
  PESO_NORMAL: 'Peso normal',
  SOBREPESO: 'Sobrepeso',
  OBESIDADE_GRAU_I: 'Obesidade grau I',
  OBESIDADE_GRAU_II: 'Obesidade grau II',
  OBESIDADE_GRAU_III: 'Obesidade grau III',
  OUTRO: 'Outro',
}

interface ContatoForm {
  Tipo: TipoContatoEnum
  Valor: string
  Descricao: string
  Principal: boolean
  Plataforma?: PlataformaRedeSocialEnum
}

// Campo read-only no estilo do Figma — input desabilitado mostrando valor real
// vindo da API (ou "Não informado" quando o backend ainda não expõe o campo).
function CampoReadOnly({
  label,
  valor,
  sufixo,
  full,
}: {
  label: string
  valor?: string | number | null
  sufixo?: string
  full?: boolean
}) {
  const preenchido = valor != null && valor !== ''
  return (
    <div className={`flex flex-col gap-2 ${full ? 'md:col-span-2' : ''}`}>
      <span className="text-white/70 text-xs font-medium">{label}</span>
      <div className="bg-[#1c1f1d] border border-white/5 rounded-2xl px-5 h-[52px] flex items-center justify-between text-sm">
        <span className={preenchido ? 'text-white' : 'text-white/30'}>
          {preenchido ? valor : 'Não informado'}
        </span>
        {sufixo && preenchido && <span className="text-white/40">{sufixo}</span>}
      </div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const isAluno = user?.role === 'ALUNO'
  const isTreinador = user?.role === 'TREINADOR'
  const isAdmin = user?.role === 'ADMIN'

  // ─── Estado de contatos / avaliações ────────────────────────────────────
  const [aluno, setAluno] = useState<AlunoDtoCompleto | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFisicaCompleta[]>([])
  const [contatos, setContatos] = useState<ContatoCompleto[]>([])
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [msgContato, setMsgContato] = useState('')
  const [erroContato, setErroContato] = useState('')

  const contatoForm = useForm<ContatoForm>()
  const tipoSelecionado = contatoForm.watch('Tipo')

  // ─── Estado de especializações (treinador) ───────────────────────────────
  const [especializacoes, setEspecializacoes] = useState<string[]>([])
  const [removendoEspec, setRemovendoEspec] = useState<string | null>(null)
  const [msgEspec, setMsgEspec] = useState('')
  const [erroEspec, setErroEspec] = useState('')
  const [loadingEspec, setLoadingEspec] = useState(false)
  const especForm = useForm<EspecializacaoPayload>()

  // ─── Aviso de "Salvar perfil" / "Foto" (sem endpoint ainda) ─────────────
  const [avisoSalvar, setAvisoSalvar] = useState('')

  // ─── Sugestões e Avaliação da plataforma ────────────────────────────────
  const [modalSugestao, setModalSugestao] = useState(false)
  const [tituloSugestao, setTituloSugestao] = useState('')
  const [descricaoSugestao, setDescricaoSugestao] = useState('')
  const [enviandoSugestao, setEnviandoSugestao] = useState(false)
  const [feedbackSugestao, setFeedbackSugestao] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const [modalAvaliacao, setModalAvaliacao] = useState(false)
  const [notaPlataforma, setNotaPlataforma] = useState(10)
  const [comentarioPlataforma, setComentarioPlataforma] = useState('')
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false)
  const [feedbackAvaliacao, setFeedbackAvaliacao] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  // ─── Configurações de notificação ───────────────────────────────────────
  // Backend não expõe GET — defaults batem com ConfiguracaoNotificacao.CriarPadrao (todos `true`).
  const [notificacoes, setNotificacoes] = useState<ConfigurarNotificacoesPayload>({
    receberEmail: true,
    receberPush: true,
    alertaVencimentoAvaliacao: true,
    alertaVencimentoTreino: true,
    alertaNovoTreino: true,
  })
  const [salvandoNotif, setSalvandoNotif] = useState(false)
  const [feedbackNotif, setFeedbackNotif] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  async function salvarNotificacoes() {
    if (!user?.id) return
    setSalvandoNotif(true)
    setFeedbackNotif(null)
    try {
      await usuariosService.configurarNotificacoes(user.id, notificacoes)
      setFeedbackNotif({ tipo: 'ok', texto: 'Preferências salvas!' })
    } catch (err) {
      setFeedbackNotif({
        tipo: 'erro',
        texto: extractError(err) || 'Não foi possível salvar as preferências.',
      })
    } finally {
      setSalvandoNotif(false)
    }
  }

  function toggleNotif(campo: keyof ConfigurarNotificacoesPayload) {
    setNotificacoes((prev) => ({ ...prev, [campo]: !prev[campo] }))
    setFeedbackNotif(null)
  }

  // Tracks dos timers dos modais — limpos no unmount e em ações que invalidam
  // o fechamento agendado (Cancelar, reenviar, etc.), pra evitar setState em
  // componente desmontado ou fechamento inesperado do modal.
  const timerSugestaoRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerAvaliacaoRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerSugestaoRef.current) clearTimeout(timerSugestaoRef.current)
      if (timerAvaliacaoRef.current) clearTimeout(timerAvaliacaoRef.current)
    }
  }, [])

  async function enviarSugestao(e: React.FormEvent) {
    e.preventDefault()
    if (!tituloSugestao.trim() || !descricaoSugestao.trim()) {
      setFeedbackSugestao({ tipo: 'erro', texto: 'Preencha título e descrição.' })
      return
    }
    setEnviandoSugestao(true)
    setFeedbackSugestao(null)
    try {
      await plataformaService.enviarSugestao({
        titulo: tituloSugestao.trim(),
        descricao: descricaoSugestao.trim(),
      })
      setFeedbackSugestao({ tipo: 'ok', texto: 'Sugestão enviada! Obrigado pelo feedback.' })
      setTituloSugestao('')
      setDescricaoSugestao('')
      if (timerSugestaoRef.current) clearTimeout(timerSugestaoRef.current)
      timerSugestaoRef.current = setTimeout(() => {
        timerSugestaoRef.current = null
        setModalSugestao(false)
        setFeedbackSugestao(null)
      }, 1500)
    } catch (err) {
      setFeedbackSugestao({
        tipo: 'erro',
        texto: extractError(err) || 'Não foi possível enviar a sugestão.',
      })
    } finally {
      setEnviandoSugestao(false)
    }
  }

  async function enviarAvaliacaoPlataforma(e: React.FormEvent) {
    e.preventDefault()
    setEnviandoAvaliacao(true)
    setFeedbackAvaliacao(null)
    try {
      await plataformaService.registrarAvaliacao({
        nota: notaPlataforma,
        ...(comentarioPlataforma.trim() ? { comentario: comentarioPlataforma.trim() } : {}),
      })
      setFeedbackAvaliacao({ tipo: 'ok', texto: 'Avaliação enviada! Obrigado.' })
      setComentarioPlataforma('')
      if (timerAvaliacaoRef.current) clearTimeout(timerAvaliacaoRef.current)
      timerAvaliacaoRef.current = setTimeout(() => {
        timerAvaliacaoRef.current = null
        setModalAvaliacao(false)
        setFeedbackAvaliacao(null)
      }, 1500)
    } catch (err) {
      setFeedbackAvaliacao({
        tipo: 'erro',
        texto: extractError(err) || 'Não foi possível enviar a avaliação.',
      })
    } finally {
      setEnviandoAvaliacao(false)
    }
  }

  function avisarFuncionalidadeFutura() {
    setAvisoSalvar('Aguardando novas funcionalidades — backend ainda não expõe edição do perfil.')
    setTimeout(() => setAvisoSalvar(''), 4000)
  }

  // Carrega histórico de avaliações para mostrar altura/peso/IMC reais (aluno).
  useEffect(() => {
    if (!isAluno) return
    alunoService
      .meuDashboard()
      .then((data) => {
        if (Array.isArray(data)) setAvaliacoes(data.map((d) => d.detalhes).filter(Boolean))
      })
      .catch(() => {
        /* sem avaliação ainda */
      })
  }, [isAluno])

  function validarValor(tipo: TipoContatoEnum, valor: string): string | null {
    const v = valor.trim()
    if (tipo === 'TELEFONE') {
      if (!/^\+?[0-9\s\-()]{10,20}$/.test(v))
        return 'Telefone inválido. Use 10–20 caracteres (dígitos, espaços, hífens, parênteses ou +).'
    } else if (tipo === 'REDE_SOCIAL' || tipo === 'SITE') {
      try {
        const u = new URL(v)
        if (u.protocol !== 'http:' && u.protocol !== 'https:')
          return 'A URL precisa começar com http:// ou https://'
      } catch {
        return 'URL inválida. Inclua http:// ou https://'
      }
    }
    return null
  }

  async function adicionarContato(data: ContatoForm) {
    if (!user?.id || isAdmin) return
    setMsgContato('')
    setErroContato('')
    const validacao = validarValor(data.Tipo, data.Valor)
    if (validacao) {
      setErroContato(validacao)
      return
    }
    if (data.Tipo === 'REDE_SOCIAL' && !data.Plataforma) {
      setErroContato('Plataforma é obrigatória para contatos de rede social.')
      return
    }
    try {
      const payload: ContatoPayload = {
        tipo: data.Tipo,
        valor: data.Valor,
        principal: Boolean(data.Principal),
        ...(data.Descricao ? { descricao: data.Descricao } : {}),
        ...(data.Tipo === 'REDE_SOCIAL' && data.Plataforma
          ? { plataforma: data.Plataforma }
          : {}),
      }

      if (isAluno) {
        const dto = await alunoService.adicionarContato(user.id, payload)
        setAluno(dto)
        setContatos(dto.contato ?? [])
        if (dto.avaliacaoFisica) setAvaliacoes(dto.avaliacaoFisica)
      } else {
        await treinadorService.adicionarContato(user.id, payload)
        setContatos((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            tipo: data.Tipo,
            valor: data.Valor,
            descricao: data.Descricao || undefined,
            principal: data.Principal,
            plataforma: data.Plataforma,
          },
        ])
      }

      setMsgContato('Contato adicionado!')
      contatoForm.reset()
    } catch (err) {
      setErroContato(extractError(err) || 'Erro ao adicionar contato.')
    }
  }

  async function removerContato(id: string) {
    if (!user?.id || isAdmin) return
    if (id.startsWith('local-')) {
      setContatos((prev) => prev.filter((c) => c.id !== id))
      return
    }
    setRemovendoId(id)
    setErroContato('')
    try {
      if (isAluno) await alunoService.removerContato(user.id, id)
      else await treinadorService.removerContato(user.id, id)
      setContatos((prev) => prev.filter((c) => c.id !== id))
      if (aluno) setAluno({ ...aluno, contato: aluno.contato.filter((c) => c.id !== id) })
      setMsgContato('Contato removido.')
    } catch (err) {
      setErroContato(extractError(err) || 'Erro ao remover contato.')
    } finally {
      setRemovendoId(null)
    }
  }

  async function adicionarEspecializacao(data: EspecializacaoPayload) {
    if (!user?.id || !isTreinador) return
    setErroEspec('')
    setLoadingEspec(true)
    try {
      const res = await treinadorService.adicionarEspecializacao(user.id, {
        especializacao: data.especializacao,
      })
      if (res?.especializacoes) setEspecializacoes(res.especializacoes)
      setMsgEspec('Especialização adicionada!')
      especForm.reset()
    } catch (err) {
      setErroEspec(extractError(err) || 'Erro ao adicionar especialização.')
    } finally {
      setLoadingEspec(false)
    }
  }

  async function removerEspecializacao(nome: string) {
    if (!user?.id || !isTreinador) return
    setRemovendoEspec(nome)
    try {
      await treinadorService.removerEspecializacao(user.id, { especializacao: nome })
      setEspecializacoes((prev) => prev.filter((e) => e !== nome))
      setMsgEspec('Especialização removida.')
    } catch (err) {
      setErroEspec(extractError(err) || 'Erro ao remover especialização.')
    } finally {
      setRemovendoEspec(null)
    }
  }

  const ultimaAvaliacao = useMemo(() => {
    const lista = aluno?.avaliacaoFisica?.length ? aluno.avaliacaoFisica : avaliacoes
    if (!lista.length) return undefined
    return [...lista].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0]
  }, [aluno, avaliacoes])

  const initials = getInitials(user?.nome || user?.email)

  // Telefone "principal" derivado dos contatos (se houver) — usado no campo
  // "Contato (DDD + número)" do form do Aluno e "Telefone" do Treinador.
  const telefonePrincipal = useMemo(() => {
    const fone = contatos.find((c) => c.tipo === 'TELEFONE' && c.principal)
    return fone?.valor || contatos.find((c) => c.tipo === 'TELEFONE')?.valor
  }, [contatos])

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-white font-bold text-3xl">Meu Perfil</h1>
        <p className="text-white/60 text-sm">Edite suas informações pessoais</p>
      </div>

      {/* ─── Card principal — Meu Perfil ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 mb-6">
        {/* Form principal */}
        <div className="bg-[#272727] border border-white/10 rounded-3xl p-7 flex flex-col gap-6">
          {isAluno ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
              <CampoReadOnly label="Nome" valor={aluno?.nomeCompleto || user?.nome} />
              <CampoReadOnly label="E-mail" valor={aluno?.email || user?.email} />
              <CampoReadOnly
                label="Sexo"
                valor={
                  aluno?.genero === 'MASCULINO'
                    ? 'Masculino'
                    : aluno?.genero === 'FEMININO'
                      ? 'Feminino'
                      : null
                }
              />
              <CampoReadOnly
                label="Data de Nascimento"
                valor={
                  aluno?.dataNascimento
                    ? new Date(aluno.dataNascimento).toLocaleDateString('pt-BR')
                    : null
                }
              />
              <CampoReadOnly
                label="Objetivo"
                valor={aluno?.objetivo ? OBJETIVO_LABEL[aluno.objetivo] || aluno.objetivo : null}
              />
              <CampoReadOnly label="CPF" valor={aluno?.cpf} />
              <CampoReadOnly
                label="Altura"
                valor={ultimaAvaliacao?.altura ? ultimaAvaliacao.altura : null}
                sufixo="m"
              />
              <CampoReadOnly
                label="Peso"
                valor={ultimaAvaliacao?.peso ? ultimaAvaliacao.peso : null}
                sufixo="kg"
              />
              <CampoReadOnly label="Contato (DDD + número)" valor={telefonePrincipal} />
              <CampoReadOnly label="CEP" valor={null} />
              <CampoReadOnly label="Endereço" valor={null} />
              <CampoReadOnly label="Complemento" valor={null} />
              {ultimaAvaliacao?.imc != null && (
                <>
                  <CampoReadOnly label="IMC" valor={ultimaAvaliacao.imc.toFixed(1)} />
                  <CampoReadOnly
                    label="Classificação"
                    valor={
                      CLASSIFICACAO_LABEL[ultimaAvaliacao.classificacao] ||
                      ultimaAvaliacao.classificacao
                    }
                  />
                </>
              )}
            </div>
          ) : isTreinador ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                <CampoReadOnly label="Nome" valor={user?.nome} />
                <CampoReadOnly label="E-mail" valor={user?.email} />
                <CampoReadOnly label="Sexo" valor={null} />
                <CampoReadOnly label="Data de Nascimento" valor={null} />
                <CampoReadOnly label="CPF" valor={null} />
                <CampoReadOnly label="Telefone" valor={telefonePrincipal} />
                <CampoReadOnly label="CREF" valor={null} />
                <CampoReadOnly label="Endereço" valor={null} />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-white/70 text-xs font-medium">Bio</span>
                <textarea
                  disabled
                  placeholder="Aguardando novas funcionalidades — backend ainda não armazena este campo."
                  className="bg-[#1c1f1d] border border-white/5 rounded-2xl px-5 py-3 min-h-[110px] text-white text-sm outline-none placeholder:text-white/30 resize-none"
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
              <CampoReadOnly label="Nome" valor={user?.nome} />
              <CampoReadOnly label="E-mail" valor={user?.email} />
              <CampoReadOnly label="Perfil" valor="ADMIN" />
            </div>
          )}

          {/* Botão Salvar — sem endpoint, mostra aviso */}
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={avisarFuncionalidadeFutura}
              className="bg-[#94e400] text-black font-extrabold rounded-full px-8 py-3 hover:bg-[#a4f400] cursor-pointer"
            >
              {isTreinador ? 'Salvar Alterações' : 'Salvar'}
            </button>
            {avisoSalvar && (
              <span className="text-[#94e400] text-xs italic">{avisoSalvar}</span>
            )}
          </div>
        </div>

        {/* Coluna direita — Foto + (Nível atividade | Alertas) */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#272727] border border-white/10 rounded-3xl p-7 flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-white/70 font-medium tracking-wider text-xs">FOTO DE PERFIL</span>
              <span className="bg-[#94e400]/15 text-[#94e400] font-semibold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">
                Em breve
              </span>
            </div>
            <div className="w-[180px] h-[180px] rounded-full bg-[#94e400]/15 border-4 border-[#94e400] flex items-center justify-center text-[#94e400] font-bold text-5xl">
              {initials}
            </div>
            <button
              onClick={avisarFuncionalidadeFutura}
              className="bg-white text-black font-medium rounded-full px-6 py-2.5 inline-flex items-center gap-2 hover:bg-white/90 cursor-pointer text-sm"
              title="Aguardando novas funcionalidades"
            >
              <ArrowLeftRight size={14} />
              Alterar foto
            </button>
            <p className="text-white/40 text-[11px] italic text-center">
              Aguardando novas funcionalidades — upload de foto será adicionado.
            </p>
          </div>

          {isAluno && (
            <div className="bg-[#272727] border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-white/70 font-medium tracking-wider text-xs">
                  NÍVEL DE ATIVIDADE
                </span>
                <span className="bg-[#94e400]/15 text-[#94e400] font-semibold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">
                  Em breve
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {NIVEIS.map((n) => (
                  <button
                    key={n}
                    onClick={avisarFuncionalidadeFutura}
                    className="border-2 border-[#94e400] text-[#94e400] rounded-full py-2.5 font-medium cursor-pointer hover:bg-[#94e400]/10"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-[11px] italic text-center mt-4">
                Aguardando novas funcionalidades — backend ainda não armazena este campo.
              </p>
            </div>
          )}

          {(isAluno || isTreinador) && (
            <div className="bg-[#272727] border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-white/70 font-medium tracking-wider text-xs">
                  NOTIFICAÇÕES
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {(
                  [
                    { campo: 'receberEmail', label: 'Receber notificações por e-mail' },
                    { campo: 'receberPush', label: 'Receber notificações push' },
                    {
                      campo: 'alertaVencimentoAvaliacao',
                      label: 'Alerta de avaliação física vencendo',
                    },
                    { campo: 'alertaVencimentoTreino', label: 'Alerta de treino vencendo' },
                    { campo: 'alertaNovoTreino', label: 'Alerta de novo treino' },
                  ] as { campo: keyof ConfigurarNotificacoesPayload; label: string }[]
                ).map(({ campo, label }) => {
                  const ativo = notificacoes[campo]
                  return (
                    <button
                      key={campo}
                      type="button"
                      onClick={() => toggleNotif(campo)}
                      disabled={salvandoNotif}
                      className="flex items-center justify-between gap-3 cursor-pointer disabled:opacity-60 text-left"
                    >
                      <span className="text-white/80 text-sm">{label}</span>
                      <span
                        className={`w-10 h-6 rounded-full relative transition-colors ${
                          ativo ? 'bg-[#94e400]' : 'bg-white/10'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                            ativo ? 'left-[18px] bg-black' : 'left-0.5 bg-white/40'
                          }`}
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={salvarNotificacoes}
                disabled={salvandoNotif}
                className="w-full mt-4 bg-[#94e400] text-black font-bold rounded-full py-2.5 text-sm hover:bg-[#a4f400] disabled:opacity-60 cursor-pointer"
              >
                {salvandoNotif ? 'Salvando...' : 'Salvar preferências'}
              </button>
              {feedbackNotif && (
                <p
                  className={`text-[11px] mt-2 text-center ${
                    feedbackNotif.tipo === 'ok' ? 'text-[#94e400]' : 'text-red-400'
                  }`}
                >
                  {feedbackNotif.texto}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Card "Meus Contatos" — funcionalidade real ──────────────────── */}
      {!isAdmin && (
        <div className="bg-[#272727] border border-white/10 rounded-3xl p-7 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Phone size={20} className="text-[#94e400]" />
              <h2 className="text-white font-bold text-xl">Meus contatos</h2>
            </div>
          </div>

          {contatos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {contatos.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#1c1f1d] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-[#94e400] text-[10px] font-bold uppercase tracking-wider">
                      {c.tipo}
                      {c.plataforma ? ` · ${c.plataforma}` : ''}
                    </span>
                    <span className="text-white font-medium truncate">{c.valor}</span>
                    {c.descricao && (
                      <span className="text-white/40 text-xs truncate">{c.descricao}</span>
                    )}
                  </div>
                  <button
                    onClick={() => removerContato(c.id)}
                    disabled={removendoId === c.id}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer p-2"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={contatoForm.handleSubmit(adicionarContato)}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="flex flex-col gap-2 md:col-span-3">
              <span className="text-white/70 text-xs font-medium">Tipo</span>
              <select
                {...contatoForm.register('Tipo', { required: true })}
                className="bg-[#1c1f1d] border border-white/5 rounded-full px-4 h-[48px] text-white text-sm outline-none [color-scheme:dark]"
              >
                <option value="">Selecione</option>
                {TIPOS_CONTATO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {tipoSelecionado === 'REDE_SOCIAL' && (
              <div className="flex flex-col gap-2 md:col-span-3">
                <span className="text-white/70 text-xs font-medium">Plataforma *</span>
                <select
                  {...contatoForm.register('Plataforma', {
                    required: tipoSelecionado === 'REDE_SOCIAL',
                  })}
                  className="bg-[#1c1f1d] border border-white/5 rounded-full px-4 h-[48px] text-white text-sm outline-none [color-scheme:dark]"
                >
                  <option value="">Selecione</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="TWITTER">Twitter</option>
                  <option value="EMAIL">E-mail</option>
                </select>
              </div>
            )}

            <div
              className={`flex flex-col gap-2 ${
                tipoSelecionado === 'REDE_SOCIAL' ? 'md:col-span-3' : 'md:col-span-5'
              }`}
            >
              <span className="text-white/70 text-xs font-medium">Valor</span>
              <input
                {...contatoForm.register('Valor', { required: true })}
                placeholder={
                  tipoSelecionado === 'TELEFONE'
                    ? '(11) 99999-9999'
                    : tipoSelecionado === 'REDE_SOCIAL' || tipoSelecionado === 'SITE'
                      ? 'https://...'
                      : 'Selecione um tipo'
                }
                className="bg-[#1c1f1d] border border-white/5 rounded-full px-4 h-[48px] text-white text-sm outline-none placeholder:text-white/30"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-3">
              <span className="text-white/70 text-xs font-medium">Descrição</span>
              <input
                {...contatoForm.register('Descricao')}
                placeholder="Opcional"
                className="bg-[#1c1f1d] border border-white/5 rounded-full px-4 h-[48px] text-white text-sm outline-none placeholder:text-white/30"
              />
            </div>

            <button
              type="submit"
              disabled={contatoForm.formState.isSubmitting}
              className="md:col-span-1 bg-[#94e400] text-black font-bold rounded-full h-[48px] inline-flex items-center justify-center gap-1 hover:bg-[#a4f400] disabled:opacity-60 cursor-pointer"
              title="Adicionar contato"
            >
              <Plus size={18} />
            </button>

            <div className="flex items-center gap-2 md:col-span-12">
              <input
                {...contatoForm.register('Principal')}
                type="checkbox"
                id="principal"
                className="w-4 h-4 accent-[#94e400]"
              />
              <label htmlFor="principal" className="text-white/70 text-sm">
                Marcar como contato principal
              </label>
            </div>

            {msgContato && <p className="md:col-span-12 text-[#94e400] text-sm">{msgContato}</p>}
            {erroContato && <p className="md:col-span-12 text-red-400 text-sm">{erroContato}</p>}
          </form>
        </div>
      )}

      {/* ─── Especializações (apenas treinador) ──────────────────────────── */}
      {isTreinador && (
        <div className="bg-[#272727] border border-white/10 rounded-3xl p-7">
          <div className="flex items-center gap-3 mb-5">
            <Award size={20} className="text-[#94e400]" />
            <h2 className="text-white font-bold text-xl">Especializações</h2>
          </div>

          {especializacoes.length > 0 && (
            <div className="flex flex-col gap-2 mb-5">
              {especializacoes.map((espec) => (
                <div
                  key={espec}
                  className="flex items-center justify-between bg-[#1c1f1d] border border-white/5 rounded-2xl px-4 py-3"
                >
                  <span className="text-white font-medium">{espec}</span>
                  <button
                    onClick={() => removerEspecializacao(espec)}
                    disabled={removendoEspec === espec}
                    className="text-red-400 hover:text-red-300 font-semibold text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {removendoEspec === espec ? 'Removendo...' : 'Remover'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={especForm.handleSubmit(adicionarEspecializacao)}
            className="flex flex-col md:flex-row gap-3 items-end max-w-2xl"
          >
            <div className="flex flex-col gap-2 flex-1">
              <span className="text-white/70 text-xs font-medium">Especialização</span>
              <input
                {...especForm.register('especializacao', { required: true })}
                placeholder="Ex: Musculação"
                className="bg-[#1c1f1d] border border-white/5 rounded-full px-4 h-[48px] text-white text-sm outline-none placeholder:text-white/30"
              />
            </div>
            <button
              type="submit"
              disabled={loadingEspec}
              className="bg-[#94e400] text-black font-extrabold rounded-full px-7 h-[48px] disabled:opacity-60 cursor-pointer hover:bg-[#a4f400]"
            >
              {loadingEspec ? 'Adicionando...' : 'Adicionar'}
            </button>
          </form>

          {msgEspec && <p className="text-[#94e400] text-sm mt-3">{msgEspec}</p>}
          {erroEspec && <p className="text-red-400 text-sm mt-3">{erroEspec}</p>}
        </div>
      )}

      {/* ─── Feedback da plataforma — disponível para todos os perfis ─────── */}
      <div className="bg-[#272727] border border-white/10 rounded-3xl p-7 mt-6">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare size={20} className="text-[#94e400]" />
          <h2 className="text-white font-bold text-xl">Feedback da plataforma</h2>
        </div>
        <p className="text-white/50 text-sm mb-5">
          Ajude-nos a melhorar o Treinu. Envie sugestões ou avalie sua experiência.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => setModalSugestao(true)}
            className="bg-[#0d100e] border border-white/10 hover:border-[#94e400]/50 rounded-2xl p-5 text-left transition-colors cursor-pointer flex items-start gap-3"
          >
            <span className="w-10 h-10 rounded-xl bg-[#94e400]/15 flex items-center justify-center shrink-0">
              <Lightbulb size={18} className="text-[#94e400]" />
            </span>
            <div>
              <p className="text-white font-semibold">Enviar sugestão</p>
              <p className="text-white/50 text-xs mt-1">
                Tem uma ideia ou encontrou um problema? Conte para a gente.
              </p>
            </div>
          </button>
          <button
            onClick={() => setModalAvaliacao(true)}
            className="bg-[#0d100e] border border-white/10 hover:border-[#94e400]/50 rounded-2xl p-5 text-left transition-colors cursor-pointer flex items-start gap-3"
          >
            <span className="w-10 h-10 rounded-xl bg-[#94e400]/15 flex items-center justify-center shrink-0">
              <Star size={18} className="text-[#94e400]" />
            </span>
            <div>
              <p className="text-white font-semibold">Avaliar plataforma</p>
              <p className="text-white/50 text-xs mt-1">
                Dê uma nota de 0 a 10 e nos conte como tem sido sua experiência.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ─── Modal — Sugestão ─────────────────────────────────────────────── */}
      <Modal
        open={modalSugestao}
        onClose={() => {
          if (enviandoSugestao) return
          if (timerSugestaoRef.current) {
            clearTimeout(timerSugestaoRef.current)
            timerSugestaoRef.current = null
          }
          setModalSugestao(false)
          setFeedbackSugestao(null)
        }}
        title="Enviar sugestão"
        width="md"
      >
        <form onSubmit={enviarSugestao} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-white/70 text-xs font-medium">Título</span>
            <input
              value={tituloSugestao}
              onChange={(e) => setTituloSugestao(e.target.value)}
              maxLength={120}
              placeholder="Ex.: Adicionar gráfico de evolução"
              className="bg-[#0d100e] border border-white/10 rounded-full px-4 h-[48px] text-white text-sm outline-none placeholder:text-white/30"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-white/70 text-xs font-medium">Descrição</span>
            <textarea
              value={descricaoSugestao}
              onChange={(e) => setDescricaoSugestao(e.target.value)}
              maxLength={1000}
              placeholder="Descreva sua sugestão com detalhes."
              className="bg-[#0d100e] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/30 min-h-[120px] resize-none"
            />
          </label>
          {feedbackSugestao && (
            <p
              className={`text-sm ${
                feedbackSugestao.tipo === 'ok' ? 'text-[#94e400]' : 'text-red-400'
              }`}
            >
              {feedbackSugestao.texto}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (timerSugestaoRef.current) {
                  clearTimeout(timerSugestaoRef.current)
                  timerSugestaoRef.current = null
                }
                setModalSugestao(false)
                setFeedbackSugestao(null)
              }}
              disabled={enviandoSugestao}
              className="flex-1 border border-white/10 text-white/80 hover:bg-white/5 rounded-full py-2.5 font-semibold cursor-pointer disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviandoSugestao}
              className="flex-1 bg-[#94e400] text-black hover:bg-[#a4f400] rounded-full py-2.5 font-extrabold cursor-pointer disabled:opacity-60"
            >
              {enviandoSugestao ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal — Avaliação da plataforma ──────────────────────────────── */}
      <Modal
        open={modalAvaliacao}
        onClose={() => {
          if (enviandoAvaliacao) return
          if (timerAvaliacaoRef.current) {
            clearTimeout(timerAvaliacaoRef.current)
            timerAvaliacaoRef.current = null
          }
          setModalAvaliacao(false)
          setFeedbackAvaliacao(null)
        }}
        title="Avaliar plataforma"
        width="md"
      >
        <form onSubmit={enviarAvaliacaoPlataforma} className="flex flex-col gap-4">
          <div>
            <span className="text-white/70 text-xs font-medium block mb-3">
              Sua nota (0 a 10)
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNotaPlataforma(n)}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                    notaPlataforma === n
                      ? 'bg-[#94e400] text-black'
                      : 'bg-[#0d100e] border border-white/10 text-white/70 hover:border-[#94e400]/50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-2">
              0 = não recomendaria · 10 = recomendaria muito
            </p>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-white/70 text-xs font-medium">Comentário (opcional)</span>
            <textarea
              value={comentarioPlataforma}
              onChange={(e) => setComentarioPlataforma(e.target.value)}
              maxLength={1000}
              placeholder="Conte o que mais gostou ou o que poderia melhorar."
              className="bg-[#0d100e] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/30 min-h-[100px] resize-none"
            />
          </label>
          {feedbackAvaliacao && (
            <p
              className={`text-sm ${
                feedbackAvaliacao.tipo === 'ok' ? 'text-[#94e400]' : 'text-red-400'
              }`}
            >
              {feedbackAvaliacao.texto}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (timerAvaliacaoRef.current) {
                  clearTimeout(timerAvaliacaoRef.current)
                  timerAvaliacaoRef.current = null
                }
                setModalAvaliacao(false)
                setFeedbackAvaliacao(null)
              }}
              disabled={enviandoAvaliacao}
              className="flex-1 border border-white/10 text-white/80 hover:bg-white/5 rounded-full py-2.5 font-semibold cursor-pointer disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviandoAvaliacao}
              className="flex-1 bg-[#94e400] text-black hover:bg-[#a4f400] rounded-full py-2.5 font-extrabold cursor-pointer disabled:opacity-60"
            >
              {enviandoAvaliacao ? 'Enviando...' : 'Enviar avaliação'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
