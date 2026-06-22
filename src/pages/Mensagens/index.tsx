import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Mic, MoreVertical, Plus, Search, Send, UserMinus, UserPlus, Users } from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout'
import ChatBubble from '../../components/ChatBubble'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks'
import { useChatRealtime } from '../../hooks/useChatRealtime'
import { chatService } from '../../services/chat.service'
import type { ChatConnectionStatus } from '../../services/chat-realtime.service'
import { usuariosService } from '../../services/usuarios.service'
import { getInitials } from '../../utils'
import type { MensagemChatDto, SalaChatDto, Usuario } from '../../types'

// Indicador visual do status da conexão SignalR — bolinha colorida + label
// pequeno. Aparece ao lado do título "Conversas".
function ConnectionStatusBadge({ status }: { status: ChatConnectionStatus }) {
  const config: Record<ChatConnectionStatus, { cor: string; label: string; pulse: boolean }> = {
    connected: { cor: 'bg-[#94e400]', label: 'Online', pulse: false },
    connecting: { cor: 'bg-yellow-400', label: 'Conectando…', pulse: true },
    reconnecting: { cor: 'bg-yellow-400', label: 'Reconectando…', pulse: true },
    disconnected: { cor: 'bg-red-400', label: 'Offline', pulse: false },
  }
  const c = config[status]
  return (
    <span
      role="status"
      title={`Chat: ${c.label}`}
      className="inline-flex items-center gap-1.5 text-[10px] text-white/60"
    >
      <span className={`w-2 h-2 rounded-full ${c.cor} ${c.pulse ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  )
}

function rotuloDoDia(iso: string): string {
  const d = new Date(iso)
  const hoje = new Date()
  if (d.toDateString() === hoje.toDateString()) return 'Hoje'
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  const dia = d
    .toLocaleDateString('pt-BR', { weekday: 'long' })
    .replace(/^\w/, (c) => c.toUpperCase())
  return dia
}

interface AgrupamentoMensagens {
  rotulo: string
  itens: MensagemChatDto[]
}

function agruparMensagens(msgs: MensagemChatDto[]): AgrupamentoMensagens[] {
  const grupos: AgrupamentoMensagens[] = []
  for (const m of msgs) {
    const rotulo = rotuloDoDia(m.dataEnvio)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.rotulo === rotulo) ultimo.itens.push(m)
    else grupos.push({ rotulo, itens: [m] })
  }
  return grupos
}

export default function MensagensPage() {
  const { user } = useAuth()
  const isTreinador = user?.role === 'TREINADOR'
  const isAluno = user?.role === 'ALUNO'

  const [salas, setSalas] = useState<SalaChatDto[]>([])
  const [loadingSalas, setLoadingSalas] = useState(false)
  const [erroSalas, setErroSalas] = useState('')
  const [salaAtivaId, setSalaAtivaId] = useState<string | null>(null)

  const [mensagens, setMensagens] = useState<MensagemChatDto[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const [textoNovaMsg, setTextoNovaMsg] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [filtroSala, setFiltroSala] = useState<'todas' | 'naoLidas'>('todas')
  const [buscaSala, setBuscaSala] = useState('')

  const [novaConvOpen, setNovaConvOpen] = useState(false)
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<Usuario[]>([])
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)

  // Modal "Criar grupo"
  const [criarGrupoOpen, setCriarGrupoOpen] = useState(false)
  const [nomeGrupo, setNomeGrupo] = useState('')
  const [selecionadosIds, setSelecionadosIds] = useState<Set<string>>(new Set())
  const [criandoGrupo, setCriandoGrupo] = useState(false)

  // Modal "Gerenciar membros"
  const [gerenciarMembrosOpen, setGerenciarMembrosOpen] = useState(false)
  const [acaoMembroId, setAcaoMembroId] = useState<string | null>(null)

  const mensagensRef = useRef<HTMLDivElement | null>(null)
  const novaConvRef = useRef<HTMLDivElement | null>(null)

  // Tokens de invalidação — descartam respostas obsoletas que chegam após o
  // usuário ter trocado de sala / disparado um novo refresh.
  const tokenSalasRef = useRef(0)
  const tokenMensagensRef = useRef(0)

  const toast = useToast()

  const carregarSalas = useCallback(async () => {
    const token = ++tokenSalasRef.current
    setLoadingSalas(true)
    setErroSalas('')
    try {
      const data = await chatService.listarSalas()
      if (tokenSalasRef.current !== token) return
      const lista = Array.isArray(data) ? data : []
      setSalas(lista)
    } catch {
      if (tokenSalasRef.current !== token) return
      setErroSalas('Não foi possível carregar as conversas.')
    } finally {
      if (tokenSalasRef.current === token) setLoadingSalas(false)
    }
  }, [])

  useEffect(() => {
    carregarSalas()
  }, [carregarSalas])

  // Hook único encapsulando toda a lógica de SignalR (listeners de mensagem,
  // notificação, "digitando…", entrar/sair de sala, status da conexão).
  const { connectionStatus, digitandoPorSala, notificarDigitando, pararDeDigitar } =
    useChatRealtime({
      usuarioId: user?.id,
      salaAtivaId,
      setMensagens,
      setSalas,
      carregarSalas,
    })

  const carregarMensagens = useCallback(
    async (salaId: string) => {
      const token = ++tokenMensagensRef.current
      setLoadingMsgs(true)
      try {
        const data = await chatService.listarMensagens(salaId, 1, 100)
        // Descarta resposta obsoleta caso o usuário já tenha trocado de sala.
        if (tokenMensagensRef.current !== token) return
        const ordenadas = [...(data ?? [])].sort(
          (a, b) => new Date(a.dataEnvio).getTime() - new Date(b.dataEnvio).getTime(),
        )
        setMensagens(ordenadas)
      } catch {
        if (tokenMensagensRef.current !== token) return
        toast.showError('Não foi possível carregar as mensagens.')
      } finally {
        if (tokenMensagensRef.current === token) setLoadingMsgs(false)
      }
    },
    [toast],
  )

  // Ao trocar de sala: carga inicial REST + marcar como lida.
  // (Entrar/Sair do grupo SignalR é responsabilidade do hook useChatRealtime.)
  useEffect(() => {
    if (!salaAtivaId) {
      setMensagens([])
      return
    }
    carregarMensagens(salaAtivaId)
    chatService.marcarComoLida(salaAtivaId).catch(() => {
      /* backend pode retornar 204 */
    })
  }, [salaAtivaId, carregarMensagens])

  // Auto-scroll ao final quando mensagens mudam.
  useEffect(() => {
    const el = mensagensRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensagens])

  // Fecha dropdown de nova conversa ao clicar fora.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (novaConvRef.current && !novaConvRef.current.contains(e.target as Node)) {
        setNovaConvOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])


  // Carrega alunos sob demanda — usado por 3 fluxos distintos (nova conversa
  // direta, criar grupo, gerenciar membros).
  const garantirAlunosCarregados = useCallback(async () => {
    if (alunosDisponiveis.length > 0 || carregandoAlunos) return
    if (!isTreinador) return
    setCarregandoAlunos(true)
    try {
      const r = await usuariosService.listar('ALUNO', 1, 100)
      setAlunosDisponiveis(r.data ?? [])
    } catch {
      setAlunosDisponiveis([])
    } finally {
      setCarregandoAlunos(false)
    }
  }, [alunosDisponiveis.length, carregandoAlunos, isTreinador])

  async function abrirNovaConversa() {
    setNovaConvOpen((v) => !v)
    await garantirAlunosCarregados()
  }

  async function iniciarConversaCom(alunoId: string) {
    setNovaConvOpen(false)
    try {
      const sala = await chatService.obterOuCriarSalaDireta(alunoId)
      await carregarSalas()
      setSalaAtivaId(sala.id)
    } catch {
      setErroSalas('Não foi possível iniciar a conversa.')
    }
  }

  async function abrirCriarGrupo() {
    setCriarGrupoOpen(true)
    setNomeGrupo('')
    setSelecionadosIds(new Set())
    await garantirAlunosCarregados()
  }

  function toggleSelecionado(id: string) {
    setSelecionadosIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function criarGrupo() {
    if (!nomeGrupo.trim()) {
      toast.showError('Informe um nome para o grupo.')
      return
    }
    if (selecionadosIds.size === 0) {
      toast.showError('Selecione ao menos um participante.')
      return
    }
    setCriandoGrupo(true)
    try {
      const sala = await chatService.criarSala({
        nome: nomeGrupo.trim(),
        participantesIds: Array.from(selecionadosIds),
        ehGrupo: true,
      })
      setCriarGrupoOpen(false)
      await carregarSalas()
      setSalaAtivaId(sala.id)
      toast.showSuccess('Grupo criado!')
    } catch {
      toast.showError('Não foi possível criar o grupo.')
    } finally {
      setCriandoGrupo(false)
    }
  }

  async function abrirGerenciarMembros() {
    setGerenciarMembrosOpen(true)
    await garantirAlunosCarregados()
  }

  async function adicionarMembro(alunoId: string) {
    if (!salaAtivaId) return
    setAcaoMembroId(alunoId)
    try {
      await chatService.adicionarMembro(salaAtivaId, alunoId)
      toast.showSuccess('Membro adicionado ao grupo.')
      await carregarSalas()
    } catch {
      toast.showError('Não foi possível adicionar (talvez já seja membro).')
    } finally {
      setAcaoMembroId(null)
    }
  }

  async function removerMembro(alunoId: string) {
    if (!salaAtivaId) return
    setAcaoMembroId(alunoId)
    try {
      await chatService.removerMembro(salaAtivaId, alunoId)
      toast.showSuccess('Membro removido do grupo.')
      await carregarSalas()
    } catch {
      toast.showError('Não foi possível remover (talvez não seja membro).')
    } finally {
      setAcaoMembroId(null)
    }
  }

  async function enviar() {
    const texto = textoNovaMsg.trim()
    if (!texto || !salaAtivaId || enviando) return
    setEnviando(true)
    // Cancela o "digitando" ao enviar — remetente já parou.
    pararDeDigitar()
    try {
      await chatService.enviarMensagem(salaAtivaId, texto)
      setTextoNovaMsg('')
      await carregarMensagens(salaAtivaId)
    } catch {
      toast.showError('Não foi possível enviar a mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  // Wrapper do input — atualiza texto e dispara o debounce do hook.
  function handleDigitando(novoTexto: string) {
    setTextoNovaMsg(novoTexto)
    if (novoTexto.length > 0) notificarDigitando()
  }

  const salasFiltradas = useMemo(() => {
    let list = salas
    if (filtroSala === 'naoLidas') list = list.filter((s) => s.naoLidas > 0)
    if (buscaSala.trim()) {
      const q = buscaSala.trim().toLowerCase()
      list = list.filter((s) => (s.nome || '').toLowerCase().includes(q))
    }
    return list
  }, [salas, filtroSala, buscaSala])

  const totalNaoLidas = salas.reduce((acc, s) => acc + (s.naoLidas || 0), 0)
  const salaAtiva = salas.find((s) => s.id === salaAtivaId)
  const grupos = useMemo(() => agruparMensagens(mensagens), [mensagens])

  // ─── Painel lateral (lista de conversas) ───────────────────────────────────
  const PainelConversas = (
    <div className="bg-[#272727] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 min-h-[640px] max-h-[85vh]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-bold text-lg">Conversas</h2>
          <ConnectionStatusBadge status={connectionStatus} />
        </div>
        {isTreinador && (
          <div className="flex items-center gap-2">
            <button
              onClick={abrirCriarGrupo}
              className="w-9 h-9 rounded-full bg-[#94e400]/15 border border-[#94e400] text-[#94e400] flex items-center justify-center hover:bg-[#94e400]/25 cursor-pointer"
              title="Criar grupo"
            >
              <Users size={16} />
            </button>
          <div ref={novaConvRef} className="relative">
            <button
              onClick={abrirNovaConversa}
              className="w-9 h-9 rounded-full bg-[#94e400] text-black flex items-center justify-center hover:bg-[#a4f400] cursor-pointer"
              title="Iniciar nova conversa"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
            {novaConvOpen && (
              <div className="absolute right-0 mt-2 w-[280px] bg-[#1c1f1d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/10 text-white text-sm font-semibold">
                  Iniciar conversa com aluno
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {carregandoAlunos ? (
                    <div className="px-4 py-6 text-center text-white/50 text-sm">Carregando...</div>
                  ) : alunosDisponiveis.length === 0 ? (
                    <div className="px-4 py-6 text-center text-white/50 text-sm">
                      Nenhum aluno encontrado.
                    </div>
                  ) : (
                    alunosDisponiveis.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => iniciarConversaCom(a.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.06] cursor-pointer text-left"
                      >
                        <span className="w-9 h-9 rounded-full bg-[#94e400]/15 border border-[#94e400] text-[#94e400] font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(a.nomeCompleto)}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-white text-sm font-semibold truncate">
                            {a.nomeCompleto}
                          </span>
                          <span className="text-white/40 text-xs truncate">{a.email}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={buscaSala}
          onChange={(e) => setBuscaSala(e.target.value)}
          placeholder="Pesquisar uma conversa"
          className="w-full bg-[#1c1f1d] border border-white/5 rounded-full pl-10 pr-4 py-2.5 text-white text-sm outline-none placeholder:text-white/30"
        />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFiltroSala('todas')}
          className={`text-xs font-bold rounded-full px-4 py-1.5 cursor-pointer ${
            filtroSala === 'todas'
              ? 'bg-[#94e400] text-black'
              : 'border border-white/10 text-white/70 hover:text-white'
          }`}
        >
          Tudo
        </button>
        <button
          onClick={() => setFiltroSala('naoLidas')}
          className={`text-xs font-bold rounded-full px-4 py-1.5 cursor-pointer flex items-center gap-1.5 ${
            filtroSala === 'naoLidas'
              ? 'bg-[#94e400] text-black'
              : 'border border-white/10 text-white/70 hover:text-white'
          }`}
        >
          Não Lidas
          {totalNaoLidas > 0 && (
            <span
              className={`text-[10px] px-1.5 rounded-full ${
                filtroSala === 'naoLidas' ? 'bg-black/20' : 'bg-white/10'
              }`}
            >
              {totalNaoLidas}
            </span>
          )}
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {loadingSalas && salas.length === 0 ? (
          <div className="text-white/50 text-center py-10 text-sm">Carregando conversas...</div>
        ) : erroSalas ? (
          <div className="text-red-400 text-center py-10 text-sm">{erroSalas}</div>
        ) : salasFiltradas.length === 0 ? (
          <div className="text-white/40 text-center py-10 text-sm italic">
            {salas.length === 0
              ? 'Nenhuma conversa ainda.'
              : 'Nenhuma conversa encontrada com esses filtros.'}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {salasFiltradas.map((s) => {
              const ativa = s.id === salaAtivaId
              return (
                <button
                  key={s.id}
                  onClick={() => setSalaAtivaId(s.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer text-left ${
                    ativa ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="w-11 h-11 rounded-full bg-[#94e400]/15 border border-[#94e400] text-[#94e400] font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(s.nome)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white font-semibold text-sm truncate">{s.nome}</span>
                      <span className="text-white/40 text-[10px] shrink-0">
                        {s.totalParticipantes} {s.totalParticipantes === 1 ? 'pessoa' : 'pessoas'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white/50 text-xs truncate">
                        {s.tipo === 'Direta' || s.tipo === 'Direct' ? 'Conversa direta' : 'Grupo'}
                      </span>
                      {s.naoLidas > 0 && (
                        <span className="bg-[#94e400] text-black text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center shrink-0">
                          {s.naoLidas}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  // ─── Painel do chat ─────────────────────────────────────────────────────────
  const PainelChat = (
    <div className="bg-[#272727] border border-white/10 rounded-3xl flex flex-col min-h-[640px] max-h-[85vh] overflow-hidden">
      {!salaAtivaId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="text-[#94e400] font-extrabold text-6xl tracking-tight">Treinu</span>
          <p className="text-white/40 text-sm">
            {isAluno && salas.length === 0
              ? 'Aguardando seu professor iniciar a conversa.'
              : 'Selecione uma conversa para começar.'}
          </p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
            <span className="w-12 h-12 rounded-full bg-[#94e400]/15 border-2 border-[#94e400] text-[#94e400] font-bold text-sm flex items-center justify-center shrink-0">
              {getInitials(salaAtiva?.nome)}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg truncate">
                {salaAtiva?.nome ?? 'Conversa'}
              </h3>
            </div>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white"
              title="Buscar (em breve)"
              disabled
            >
              <Search size={18} />
            </button>
            {isTreinador &&
              salaAtiva &&
              (salaAtiva.tipo === 'Grupo' || salaAtiva.tipo === 'Group') && (
                <button
                  onClick={abrirGerenciarMembros}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06] text-white/60 hover:text-[#94e400] cursor-pointer"
                  title="Gerenciar membros"
                >
                  <Users size={18} />
                </button>
              )}
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white"
              title="Mais opções (em breve)"
              disabled
            >
              <MoreVertical size={18} />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={mensagensRef} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {loadingMsgs && mensagens.length === 0 ? (
              <div className="text-white/50 text-center py-10 text-sm">Carregando mensagens...</div>
            ) : mensagens.length === 0 ? (
              <div className="text-white/40 text-center py-10 text-sm italic">
                Nenhuma mensagem nesta conversa ainda. Envie a primeira!
              </div>
            ) : (
              grupos.map((grupo, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="flex justify-center">
                    <span className="bg-[#94e400] text-black text-[11px] font-semibold rounded-md px-3 py-1">
                      {grupo.rotulo}
                    </span>
                  </div>
                  {grupo.itens.map((m) => (
                    <ChatBubble
                      key={m.id}
                      mensagem={m}
                      propria={m.remetenteId === user?.id}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Indicador "digitando…" — só de outros usuários da sala ativa. */}
          {salaAtivaId && (digitandoPorSala[salaAtivaId]?.length ?? 0) > 0 && (
            <div className="px-7 pb-1 text-[11px] text-[#94e400]/80 italic flex items-center gap-1.5">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-[#94e400] animate-pulse" />
                <span className="w-1 h-1 rounded-full bg-[#94e400] animate-pulse [animation-delay:0.15s]" />
                <span className="w-1 h-1 rounded-full bg-[#94e400] animate-pulse [animation-delay:0.3s]" />
              </span>
              {(() => {
                const lista = digitandoPorSala[salaAtivaId] ?? []
                if (lista.length === 1) {
                  return `${lista[0].nome ?? 'Alguém'} está digitando...`
                }
                return `${lista.length} pessoas estão digitando...`
              })()}
            </div>
          )}

          {/* Input */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 bg-[#1c1f1d] border border-white/5 rounded-full pl-2 pr-3 py-2">
              <button
                disabled
                className="w-9 h-9 rounded-full bg-[#94e400] text-black flex items-center justify-center opacity-60 cursor-not-allowed"
                title="Anexos (em breve)"
              >
                <Plus size={18} strokeWidth={3} />
              </button>
              <input
                value={textoNovaMsg}
                onChange={(e) => handleDigitando(e.target.value)}
                onBlur={() => pararDeDigitar()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    enviar()
                  }
                }}
                placeholder="Digite uma mensagem"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
              {textoNovaMsg.trim() ? (
                <button
                  onClick={enviar}
                  disabled={enviando}
                  className="w-9 h-9 rounded-full text-[#94e400] hover:text-white disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  title="Enviar"
                >
                  <Send size={18} />
                </button>
              ) : (
                <button
                  disabled
                  className="w-9 h-9 rounded-full text-white/40 flex items-center justify-center"
                  title="Áudio (em breve)"
                >
                  <Mic size={18} />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )

  const subtitulo = isAluno
    ? 'Converse, tire dúvidas ou faça solicitações para seu professor'
    : 'Converse e tire as dúvidas dos seus alunos.'

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-white font-bold text-3xl">Mensagens</h1>
        <p className="text-white/60 text-sm">{subtitulo}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {PainelConversas}
        {PainelChat}
      </div>

      <Modal
        open={criarGrupoOpen}
        onClose={() => setCriarGrupoOpen(false)}
        title="Criar grupo"
        width="md"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-white/70 text-xs font-medium">Nome do grupo</label>
            <input
              value={nomeGrupo}
              onChange={(e) => setNomeGrupo(e.target.value)}
              placeholder="Ex: Desafio 30 dias"
              className="bg-[#0d100e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#94e400] placeholder:text-white/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/70 text-xs font-medium">
              Participantes ({selecionadosIds.size} selecionado{selecionadosIds.size === 1 ? '' : 's'})
            </label>
            <div className="bg-[#0d100e] border border-white/10 rounded-xl max-h-[260px] overflow-y-auto">
              {carregandoAlunos ? (
                <div className="px-4 py-6 text-center text-white/50 text-sm">Carregando...</div>
              ) : alunosDisponiveis.length === 0 ? (
                <div className="px-4 py-6 text-center text-white/50 text-sm">
                  Nenhum aluno encontrado.
                </div>
              ) : (
                alunosDisponiveis.map((a) => {
                  const ativo = selecionadosIds.has(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleSelecionado(a.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer text-left ${
                        ativo ? 'bg-[#94e400]/10' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          ativo ? 'bg-[#94e400] border-[#94e400]' : 'border-white/30'
                        }`}
                      >
                        {ativo && (
                          <svg viewBox="0 0 16 16" className="w-3 h-3 text-black">
                            <polyline
                              points="3 8 7 12 13 4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="w-9 h-9 rounded-full bg-[#94e400]/15 border border-[#94e400] text-[#94e400] font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(a.nomeCompleto)}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-white text-sm font-semibold truncate">
                          {a.nomeCompleto}
                        </span>
                        <span className="text-white/40 text-xs truncate">{a.email}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={() => setCriarGrupoOpen(false)}
              className="text-white/70 hover:text-white font-medium px-5 py-2.5 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={criarGrupo}
              disabled={criandoGrupo}
              className="bg-[#94e400] text-black font-extrabold rounded-full px-7 py-2.5 disabled:opacity-60 cursor-pointer hover:bg-[#a4f400]"
            >
              {criandoGrupo ? 'Criando...' : 'Criar grupo'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={gerenciarMembrosOpen && !!salaAtiva}
        onClose={() => setGerenciarMembrosOpen(false)}
        title="Membros do grupo"
        width="md"
      >
        <p className="text-white/50 text-xs mb-4">
          Adicione ou remova alunos deste grupo. O backend valida se o usuário já é (ou não) membro.
        </p>

        <div className="bg-[#0d100e] border border-white/10 rounded-xl max-h-[400px] overflow-y-auto">
          {carregandoAlunos ? (
            <div className="px-4 py-6 text-center text-white/50 text-sm">Carregando...</div>
          ) : alunosDisponiveis.length === 0 ? (
            <div className="px-4 py-6 text-center text-white/50 text-sm">
              Nenhum aluno encontrado.
            </div>
          ) : (
            alunosDisponiveis.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-b-0"
              >
                <span className="w-9 h-9 rounded-full bg-[#94e400]/15 border border-[#94e400] text-[#94e400] font-bold text-xs flex items-center justify-center shrink-0">
                  {getInitials(a.nomeCompleto)}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-white text-sm font-semibold truncate block">
                    {a.nomeCompleto}
                  </span>
                  <span className="text-white/40 text-xs truncate block">{a.email}</span>
                </div>
                <button
                  onClick={() => adicionarMembro(a.id)}
                  disabled={acaoMembroId === a.id}
                  className="text-[#94e400] hover:bg-[#94e400]/10 disabled:opacity-50 cursor-pointer p-1.5 rounded-full"
                  title="Adicionar ao grupo"
                >
                  <UserPlus size={16} />
                </button>
                <button
                  onClick={() => removerMembro(a.id)}
                  disabled={acaoMembroId === a.id}
                  className="text-red-400 hover:bg-red-400/10 disabled:opacity-50 cursor-pointer p-1.5 rounded-full"
                  title="Remover do grupo"
                >
                  <UserMinus size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </DashboardLayout>
  )
}
