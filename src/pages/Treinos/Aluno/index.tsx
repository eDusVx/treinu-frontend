import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Clock, Dumbbell, ExternalLink, Play, RefreshCw, Star } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { useAuth } from '../../../hooks'
import { treinosService } from '../../../services/treinos.service'
import { execucaoTreinoService } from '../../../services/execucaoTreino.service'
import {
  extractError,
  formatarDataPtBr,
  isYoutube,
  isDirectVideo,
  isDirectImage,
  obterThumbVideo,
} from '../../../utils'
import type {
  ExecucaoTreinoDto,
  ItemTreinoDto,
  TreinoDto,
  TreinoStatusEnum,
} from '../../../types'

const FILTROS: { value: TreinoStatusEnum | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ATIVO', label: 'Ativos' },
  { value: 'VENCIDO', label: 'Vencidos' },
]

const STATUS_COR: Record<TreinoStatusEnum, string> = {
  ATIVO: 'bg-[#94e400] text-black',
  VENCIDO: 'bg-red-500/20 text-red-300',
}

// Persistência local da sessão ativa por treino — chave inclui usuário e treino
// para suportar múltiplos alunos no mesmo navegador.
const storageKey = (userId: string, treinoId: string) =>
  `execucaoTreino:${userId}:${treinoId}`

// Wrappers seguros pro localStorage — Safari em modo privado e abas com cota
// excedida fazem setItem lançar QuotaExceededError. Sem esses try/catch um
// QuotaExceeded derruba o fluxo todo do Modo Treino.
function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* sem persistência local — sessão fica em memória apenas */
  }
}

function safeStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* idem */
  }
}

interface ItemRegistroForm {
  series: number
  repeticoes: number
  carga: number
}

export default function TreinosAlunoPage() {
  const { user } = useAuth()
  const [treinos, setTreinos] = useState<TreinoDto[]>([])
  const [historicoExecucoes, setHistoricoExecucoes] = useState<ExecucaoTreinoDto[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState<TreinoStatusEnum | 'TODOS'>('ATIVO')
  const [selecionado, setSelecionado] = useState<TreinoDto | null>(null)

  // Modo treino
  const [execucaoId, setExecucaoId] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [erroExecucao, setErroExecucao] = useState('')
  const [registros, setRegistros] = useState<Record<string, ItemRegistroForm>>({})
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [registrando, setRegistrando] = useState<string | null>(null)
  const [concluindo, setConcluindo] = useState(false)
  const [mostrarFeedback, setMostrarFeedback] = useState(false)
  const [nota, setNota] = useState<number>(5)
  const [comentario, setComentario] = useState('')
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const [confirmarFechar, setConfirmarFechar] = useState(false)
  const fecharAposConcluirRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Limpa timer pendente ao desmontar — evita setState em componente desmontado.
  useEffect(() => {
    return () => {
      if (fecharAposConcluirRef.current) clearTimeout(fecharAposConcluirRef.current)
    }
  }, [])

  const carregar = useCallback(() => {
    if (!user?.id) return
    setLoading(true)
    setErro('')
    Promise.all([
      treinosService.listar({ alunoId: user.id }),
      execucaoTreinoService.historico(user.id)
    ])
      .then(([dataTreinos, dataHistorico]) => {
        setTreinos(Array.isArray(dataTreinos) ? dataTreinos : [])
        setHistoricoExecucoes(Array.isArray(dataHistorico) ? dataHistorico : [])
      })
      .catch((err) => setErro(extractError(err) || 'Não foi possível carregar seus treinos.'))
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const lista = useMemo(
    () => (filtro === 'TODOS' ? treinos : treinos.filter((t) => t.status === filtro)),
    [treinos, filtro],
  )

  const treinosFeitosHoje = useMemo(() => {
    const set = new Set<string>()
    historicoExecucoes.forEach((exec) => {
      if (exec.concluido && exec.dataInicio) {
        const execDate = new Date(exec.dataInicio)
        const today = new Date()
        const sameDay =
          execDate.getDate() === today.getDate() &&
          execDate.getMonth() === today.getMonth() &&
          execDate.getFullYear() === today.getFullYear()
        if (sameDay) {
          set.add(exec.treinoId)
        }
      }
    })
    return set
  }, [historicoExecucoes])

  const infoDivisao = useMemo(() => {
    if (!selecionado) return null
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    const hojeNum = new Date().getDay()
    const nomeDia = diasSemana[hojeNum]
    
    let letraDivisao: string | null = null
    switch (hojeNum) {
      case 0: letraDivisao = selecionado.divisaoDomingo || null; break
      case 1: letraDivisao = selecionado.divisaoSegunda || null; break
      case 2: letraDivisao = selecionado.divisaoTerca || null; break
      case 3: letraDivisao = selecionado.divisaoQuarta || null; break
      case 4: letraDivisao = selecionado.divisaoQuinta || null; break
      case 5: letraDivisao = selecionado.divisaoSexta || null; break
      case 6: letraDivisao = selecionado.divisaoSabado || null; break
    }
    
    if (!letraDivisao) {
      return {
        nomeDia,
        letra: null,
        nome: 'Descanso',
        ehDescanso: true
      }
    }

    let nomeDivisao = ''
    switch (letraDivisao.toUpperCase()) {
      case 'A': nomeDivisao = selecionado.nomeDivisaoA || 'Divisão A'; break
      case 'B': nomeDivisao = selecionado.nomeDivisaoB || 'Divisão B'; break
      case 'C': nomeDivisao = selecionado.nomeDivisaoC || 'Divisão C'; break
      case 'D': nomeDivisao = selecionado.nomeDivisaoD || 'Divisão D'; break
      default: nomeDivisao = `Divisão ${letraDivisao}`
    }

    return {
      nomeDia,
      letra: letraDivisao,
      nome: nomeDivisao,
      ehDescanso: false
    }
  }, [selecionado])

  // Pré-preenche o formulário de registro com valores planejados do item.
  function defaultRegistro(item: ItemTreinoDto): ItemRegistroForm {
    const repsMatch = item.repeticoes?.match(/\d+/)
    const cargaMatch = item.carga?.match(/[\d.]+/)
    return {
      series: item.series || 0,
      repeticoes: repsMatch ? Number(repsMatch[0]) : 0,
      carga: cargaMatch ? Number(cargaMatch[0]) : 0,
    }
  }

  // Hidrata o formulário a partir do treino selecionado e da execução retomada.
  const hidratarRegistros = useCallback(
    (treino: TreinoDto, execucao?: ExecucaoTreinoDto | null) => {
      const novos: Record<string, ItemRegistroForm> = {}
      const concluidos = new Set<string>()
      treino.itens?.forEach((item) => {
        const ex = execucao?.exercicios?.find((e) => e.itemTreinoId === item.id)
        if (ex) {
          novos[item.id] = {
            series: ex.seriesRealizadas,
            repeticoes: ex.repeticoesRealizadas,
            carga: Number(ex.cargaUtilizada),
          }
          concluidos.add(item.id)
        } else {
          novos[item.id] = defaultRegistro(item)
        }
      })
      setRegistros(novos)
      setMarcados(concluidos)
    },
    [],
  )

  // Ao abrir um treino, tenta restaurar execução ativa (localStorage + /ativas).
  useEffect(() => {
    if (!selecionado || !user?.id) {
      setExecucaoId(null)
      setRegistros({})
      setMarcados(new Set())
      setErroExecucao('')
      setMensagemSucesso('')
      return
    }
    hidratarRegistros(selecionado)

    const cached = safeStorageGet(storageKey(user.id, selecionado.id))
    if (cached) setExecucaoId(cached)

    // Guarda contra trocar de treino antes do /ativas responder — sem isso, a
    // resposta de um treino antigo poderia sobrescrever o estado do novo.
    let cancelado = false

    // /ativas retorna 400 se não houver execução ativa — tratamos silenciosamente.
    execucaoTreinoService
      .obterAtiva(selecionado.id)
      .then((ex) => {
        if (cancelado || !ex?.id) return
        setExecucaoId(ex.id)
        safeStorageSet(storageKey(user.id, selecionado.id), ex.id)
        hidratarRegistros(selecionado, ex)
      })
      .catch(() => {
        /* sem execução ativa — fluxo normal */
      })

    return () => {
      cancelado = true
    }
  }, [selecionado, user?.id, hidratarRegistros])

  function fecharModalDireto() {
    if (fecharAposConcluirRef.current) {
      clearTimeout(fecharAposConcluirRef.current)
      fecharAposConcluirRef.current = null
    }
    setSelecionado(null)
    setMostrarFeedback(false)
    setNota(5)
    setComentario('')
    setConfirmarFechar(false)
    setMensagemSucesso('')
  }

  // Se há sessão ativa, pede confirmação. A sessão fica salva no back e em
  // localStorage, mas avisamos pra evitar que o usuário pense que perdeu o
  // progresso.
  function fecharModal() {
    if (execucaoId) {
      setConfirmarFechar(true)
      return
    }
    fecharModalDireto()
  }

  async function iniciarTreino() {
    if (!selecionado || !user?.id) return
    // Guarda contra duplo-click muito rápido (antes do disabled propagar) e
    // contra race com /ativas ainda em flight que poderia setar execucaoId.
    if (execucaoId || iniciando) return
    setIniciando(true)
    setErroExecucao('')
    try {
      const res = await execucaoTreinoService.iniciar({ treinoId: selecionado.id })
      setExecucaoId(res.execucaoTreinoId)
      safeStorageSet(storageKey(user.id, selecionado.id), res.execucaoTreinoId)
    } catch (err) {
      setErroExecucao(extractError(err) || 'Não foi possível iniciar o treino.')
    } finally {
      setIniciando(false)
    }
  }

  function atualizarRegistro(itemId: string, campo: keyof ItemRegistroForm, valor: number) {
    // Number('') === NaN — clampa pra 0 pra não render input com value=NaN
    // (React loga warning e o input fica num estado inválido).
    const seguro = Number.isFinite(valor) ? valor : 0
    setRegistros((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? { series: 0, repeticoes: 0, carga: 0 }), [campo]: seguro },
    }))
  }

  async function marcarFeito(item: ItemTreinoDto) {
    if (!execucaoId) return
    const reg = registros[item.id] ?? defaultRegistro(item)
    setRegistrando(item.id)
    setErroExecucao('')
    try {
      await execucaoTreinoService.registrarExercicio(execucaoId, {
        itemTreinoId: item.id,
        seriesRealizadas: Number(reg.series) || 0,
        repeticoesRealizadas: Number(reg.repeticoes) || 0,
        cargaUtilizada: Number(reg.carga) || 0,
      })
      setMarcados((prev) => new Set(prev).add(item.id))
    } catch (err) {
      setErroExecucao(extractError(err) || 'Não foi possível registrar este exercício.')
    } finally {
      setRegistrando(null)
    }
  }

  async function concluirTreino() {
    if (!execucaoId || !selecionado || !user?.id) return
    setConcluindo(true)
    setErroExecucao('')
    try {
      await execucaoTreinoService.concluir(execucaoId, {
        notaFeedback: nota,
        comentarioFeedback: comentario.trim() || null,
      })
      safeStorageRemove(storageKey(user.id, selecionado.id))
      setMensagemSucesso('Treino concluído com sucesso! +10 pontos no ranking.')
      setExecucaoId(null)
      setMostrarFeedback(false)
      // Recarrega a lista para refletir a execução de hoje.
      carregar()
      // Fecha o modal depois de uns segundos — sem isso, `selecionado` continua
      // apontando para o TreinoDto antigo (status ATIVO) e o CTA "Iniciar Treino"
      // reaparece confusamente.
      if (fecharAposConcluirRef.current) clearTimeout(fecharAposConcluirRef.current)
      fecharAposConcluirRef.current = setTimeout(() => {
        fecharAposConcluirRef.current = null
        fecharModalDireto()
      }, 2500)
    } catch (err) {
      setErroExecucao(extractError(err) || 'Não foi possível concluir o treino.')
    } finally {
      setConcluindo(false)
    }
  }

  const totalItens = selecionado?.itens?.length ?? 0
  const totalMarcados = marcados.size
  const podeConcluir = execucaoId != null && totalItens > 0 && totalMarcados >= totalItens

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all cursor-pointer ${
                filtro === f.value
                  ? 'bg-[#94e400] text-black'
                  : 'bg-[#272727] text-white/70 hover:text-white border border-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="text-[#94e400] hover:text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-white/50 text-center py-12">Carregando...</div>
      ) : erro ? (
        <div className="text-red-400 text-center py-12">{erro}</div>
      ) : lista.length === 0 ? (
        <div className="bg-[#272727] border-2 border-[#4d4d4d] border-dashed rounded-3xl p-12 text-center text-white/50">
          Nenhum treino encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelecionado(t)}
              className="text-left bg-[#272727] border border-white/10 rounded-2xl p-6 hover:border-[#94e400]/50 transition-all w-full"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Dumbbell size={18} className="text-[#94e400]" />
                  <span
                    className={`text-[10px] font-bold uppercase rounded-full px-3 py-0.5 ${STATUS_COR[t.status]}`}
                  >
                    {t.status}
                  </span>
                </div>
                {treinosFeitosHoje.has(t.id) && (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase bg-[#94e400]/20 text-[#94e400] rounded-full px-3 py-0.5 border border-[#94e400]/30">
                    <Check size={10} strokeWidth={3} />
                    Feito Hoje
                  </span>
                )}
              </div>
              <h3 className="text-white font-bold text-xl">{t.nome}</h3>
              <p className="text-white/50 text-sm mt-1 line-clamp-2">{t.descricao}</p>
              <div className="flex items-center gap-2 text-white/60 text-xs mt-3">
                <Clock size={12} />
                <span>
                  {formatarDataPtBr(t.dataInicio)} — {formatarDataPtBr(t.dataFim)}
                </span>
              </div>
              <div className="mt-3 text-[#94e400] text-xs font-semibold">
                {t.itens?.length ?? 0} exercícios
              </div>
            </button>
          ))}
        </div>
      )}

      {selecionado && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={fecharModal}
        >
          <div
            className="bg-[#1c1f1d] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-white font-bold text-2xl">{selecionado.nome}</h2>
                <p className="text-white/60 text-sm mt-1">{selecionado.descricao}</p>
                {infoDivisao && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[#94e400] text-[10px] font-extrabold bg-[#94e400]/10 px-2.5 py-1 rounded-full border border-[#94e400]/20 uppercase tracking-wider">
                      Hoje: {infoDivisao.nomeDia}
                    </span>
                    <span className="text-white/70 text-xs font-semibold">
                      {infoDivisao.ehDescanso ? '🌟 Dia de descanso' : `Divisão ${infoDivisao.letra} (${infoDivisao.nome})`}
                    </span>
                  </div>
                )}
                {execucaoId && (
                  <span className="inline-block mt-3 bg-[#94e400]/20 text-[#94e400] text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1">
                    Modo Treino · {totalMarcados}/{totalItens} feitos
                  </span>
                )}
              </div>
              <button
                onClick={fecharModal}
                className="text-white/60 hover:text-white text-2xl leading-none cursor-pointer"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {/* CTA Iniciar — apenas se ainda não há sessão ativa. Esconde
                durante a mensagem de sucesso pra não permitir uma segunda
                execução do mesmo treino na janela antes do modal fechar. */}
            {!execucaoId && !mensagemSucesso && selecionado.status === 'ATIVO' && treinosFeitosHoje.has(selecionado.id) && (
              <div className="bg-[#94e400]/10 border border-[#94e400]/30 rounded-2xl p-5 mb-4 text-center">
                <div className="mx-auto w-10 h-10 bg-[#94e400]/20 rounded-full flex items-center justify-center mb-3">
                  <Check size={20} className="text-[#94e400]" />
                </div>
                <p className="text-white font-bold text-sm">Treino concluído hoje!</p>
                <p className="text-white/50 text-xs mt-1 max-w-sm mx-auto">
                  Bom trabalho! Você já completou esta ficha hoje. Descanse e alimente-se bem.
                </p>
              </div>
            )}

            {!execucaoId && !mensagemSucesso && selecionado.status === 'ATIVO' && !treinosFeitosHoje.has(selecionado.id) && !infoDivisao?.ehDescanso && (
              <div className="bg-[#0d100e] border border-[#94e400]/30 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-semibold text-sm">Pronto para treinar?</p>
                  <p className="text-white/50 text-xs">
                    Inicie a sessão para registrar cargas, séries e tempo real.
                  </p>
                </div>
                <button
                  onClick={iniciarTreino}
                  disabled={iniciando}
                  className="inline-flex items-center gap-2 bg-[#94e400] text-black font-bold rounded-full px-5 py-2.5 hover:bg-[#a4f400] disabled:opacity-60 cursor-pointer"
                >
                  <Play size={14} />
                  {iniciando ? 'Iniciando...' : 'Iniciar Treino'}
                </button>
              </div>
            )}

            {mensagemSucesso && (
              <div className="bg-[#94e400]/15 border border-[#94e400]/40 text-[#94e400] text-sm rounded-2xl p-3 mb-4">
                {mensagemSucesso}
              </div>
            )}
            {erroExecucao && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-2xl p-3 mb-4">
                {erroExecucao}
              </div>
            )}

            {infoDivisao?.ehDescanso ? (
              <div className="bg-[#0d100e] border border-white/5 rounded-2xl p-8 text-center my-4 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-[#94e400]/10 rounded-full flex items-center justify-center text-[#94e400] mb-2 shadow-[0_0_20px_rgba(148,228,0,0.1)]">
                  <Star size={32} className="text-[#94e400]" fill="#94e400" />
                </div>
                <h3 className="text-white font-extrabold text-lg">Hoje é dia de descanso! 🌟</h3>
                <p className="text-white/50 text-xs max-w-sm">
                  O repouso é parte essencial do seu treino. Aproveite hoje para regenerar seus músculos e voltar ainda mais forte!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                {selecionado.itens?.length ? (
                  selecionado.itens
                    .slice()
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((item) => {
                      const reg = registros[item.id] ?? defaultRegistro(item)
                      const feito = marcados.has(item.id)
                      return (
                        <div
                          key={item.id}
                          className={`bg-[#0d100e] border rounded-2xl p-4 transition-colors ${
                            feito ? 'border-[#94e400]/50' : 'border-white/5'
                          }`}
                        >
                          <div className="flex gap-4 items-start">
                            {/* Media thumbnail on the left if present */}
                            {item.exercicio?.arquivoDemonstracao && (
                              <div className="w-24 sm:w-32 aspect-video bg-[#0d100e] rounded-xl relative overflow-hidden shrink-0 group">
                                {isDirectImage(item.exercicio.arquivoDemonstracao) ? (
                                  <img
                                    src={item.exercicio.arquivoDemonstracao}
                                    alt={item.exercicio.nome}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      ;(e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                ) : isYoutube(item.exercicio.arquivoDemonstracao) ? (
                                  <img
                                    src={obterThumbVideo(item.exercicio.arquivoDemonstracao) || ''}
                                    alt={item.exercicio.nome}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      ;(e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                ) : isDirectVideo(item.exercicio.arquivoDemonstracao) ? (
                                  <video
                                    src={item.exercicio.arquivoDemonstracao}
                                    className="w-full h-full object-cover"
                                    preload="metadata"
                                    muted
                                    playsInline
                                    onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.pause()
                                      e.currentTarget.currentTime = 0
                                    }}
                                  />
                                ) : null}

                                {/* Play icon overlay for videos */}
                                {(isYoutube(item.exercicio.arquivoDemonstracao) || isDirectVideo(item.exercicio.arquivoDemonstracao)) && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors pointer-events-none">
                                    <div className="w-8 h-8 rounded-full bg-[#94e400] text-black flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform duration-300">
                                      <Play size={12} fill="black" className="ml-0.5" />
                                    </div>
                                  </div>
                                )}

                                {/* External Link to open demo */}
                                <a
                                  href={item.exercicio.arquivoDemonstracao}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-10"
                                  title="Abrir demonstração"
                                >
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                            )}

                            {/* Details on the right */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-white font-semibold text-sm sm:text-base truncate">
                                  #{item.ordem} — {item.exercicio?.nome ?? 'Exercício'}
                                </span>
                                <span className="text-[#94e400] font-bold text-sm shrink-0">
                                  {item.series}x{item.repeticoes}
                                </span>
                              </div>
                              <div className="flex gap-4 text-white/60 text-xs mt-2">
                                <span>Carga: {item.carga}</span>
                                <span>Pausa: {item.pausa}</span>
                              </div>
                              {item.observacoes && (
                                <p className="text-white/50 text-xs mt-2 italic">{item.observacoes}</p>
                              )}
                            </div>
                          </div>

                          {execucaoId && (
                            <div className="mt-3 pt-3 border-t border-white/5">
                              <div className="grid grid-cols-3 gap-2 mb-3">
                                <label className="flex flex-col gap-1">
                                  <span className="text-white/50 text-[10px] uppercase tracking-wider">
                                    Séries
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={reg.series}
                                    onChange={(e) =>
                                      atualizarRegistro(item.id, 'series', Number(e.target.value))
                                    }
                                    disabled={feito}
                                    className="bg-[#1c1f1d] border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none disabled:opacity-60"
                                  />
                                </label>
                                <label className="flex flex-col gap-1">
                                  <span className="text-white/50 text-[10px] uppercase tracking-wider">
                                    Reps
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={reg.repeticoes}
                                    onChange={(e) =>
                                      atualizarRegistro(item.id, 'repeticoes', Number(e.target.value))
                                    }
                                    disabled={feito}
                                    className="bg-[#1c1f1d] border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none disabled:opacity-60"
                                  />
                                </label>
                                <label className="flex flex-col gap-1">
                                  <span className="text-white/50 text-[10px] uppercase tracking-wider">
                                    Carga (kg)
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={reg.carga}
                                    onChange={(e) =>
                                      atualizarRegistro(item.id, 'carga', Number(e.target.value))
                                    }
                                    disabled={feito}
                                    className="bg-[#1c1f1d] border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none disabled:opacity-60"
                                  />
                                </label>
                              </div>
                              <button
                                onClick={() => marcarFeito(item)}
                                disabled={feito || registrando === item.id}
                                className={`w-full inline-flex items-center justify-center gap-2 rounded-full py-2 font-bold text-sm transition-colors cursor-pointer disabled:cursor-default ${
                                  feito
                                    ? 'bg-[#94e400]/15 text-[#94e400]'
                                    : 'bg-[#94e400] text-black hover:bg-[#a4f400] disabled:opacity-60'
                                }`}
                              >
                                <Check size={14} />
                                {feito
                                  ? 'Concluído'
                                  : registrando === item.id
                                    ? 'Registrando...'
                                    : 'Marcar como feito'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })
                ) : (
                  <div className="text-white/50 text-sm italic text-center py-6">
                    Nenhum exercício cadastrado para a divisão de hoje ({infoDivisao?.letra}).
                  </div>
                )}
              </div>
            )}

            {/* Cronograma Semanal */}
            <div className="bg-[#0d100e] border border-white/5 rounded-2xl p-5 mt-6">
              <h3 className="text-white font-bold text-sm mb-3">Cronograma Semanal</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {[
                  { label: 'Seg', key: 'divisaoSegunda', diaNum: 1 },
                  { label: 'Ter', key: 'divisaoTerca', diaNum: 2 },
                  { label: 'Qua', key: 'divisaoQuarta', diaNum: 3 },
                  { label: 'Qui', key: 'divisaoQuinta', diaNum: 4 },
                  { label: 'Sex', key: 'divisaoSexta', diaNum: 5 },
                  { label: 'Sáb', key: 'divisaoSabado', diaNum: 6 },
                  { label: 'Dom', key: 'divisaoDomingo', diaNum: 0 }
                ].map((dia) => {
                  const letra = selecionado[dia.key as keyof TreinoDto] as string || ''
                  const hojeNum = new Date().getDay()
                  const ehHoje = hojeNum === dia.diaNum
                  
                  let nomeDiv = 'Descanso'
                  if (letra) {
                    if (letra === 'A') nomeDiv = selecionado.nomeDivisaoA || 'Divisão A'
                    else if (letra === 'B') nomeDiv = selecionado.nomeDivisaoB || 'Divisão B'
                    else if (letra === 'C') nomeDiv = selecionado.nomeDivisaoC || 'Divisão C'
                    else if (letra === 'D') nomeDiv = selecionado.nomeDivisaoD || 'Divisão D'
                  }
                  
                  return (
                    <div
                      key={dia.label}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                        ehHoje
                          ? 'bg-[#94e400]/20 border-[#94e400] text-white shadow-[0_0_15px_rgba(148,228,0,0.15)]'
                          : 'bg-[#1c1f1d] border-white/5 text-white/60'
                      }`}
                    >
                      <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-1">
                        {dia.label}
                      </span>
                      <span className={`text-base font-black ${ehHoje ? 'text-[#94e400]' : 'text-white/80'}`}>
                        {letra || '—'}
                      </span>
                      <span className="text-[9px] mt-1.5 truncate max-w-full block font-medium" title={nomeDiv}>
                        {nomeDiv}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {execucaoId && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => setMostrarFeedback(true)}
                  disabled={!podeConcluir}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#94e400] text-black font-extrabold rounded-full py-3 hover:bg-[#a4f400] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title={
                    podeConcluir
                      ? 'Encerrar o treino e enviar feedback'
                      : 'Marque todos os exercícios para finalizar'
                  }
                >
                  Concluir Treino
                </button>
                {!podeConcluir && (
                  <p className="text-white/40 text-xs text-center mt-2">
                    Marque todos os exercícios como feitos para concluir.
                  </p>
                )}
              </div>
            )}

            <ConfirmDialog
              open={confirmarFechar}
              title="Sair do treino?"
              message="Sua sessão fica salva e você pode retomá-la depois abrindo este treino de novo. Quer sair agora?"
              confirmLabel="Sair"
              cancelLabel="Continuar treinando"
              onConfirm={fecharModalDireto}
              onCancel={() => setConfirmarFechar(false)}
            />

            {/* Sub-modal de feedback final — escala 0–5 + comentário */}
            {mostrarFeedback && (
              <div
                className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-6"
                onClick={() => {
                  // Não fecha enquanto o feedback está sendo enviado, pra evitar
                  // perder a UI no meio do request e cair em estado órfão.
                  if (concluindo) return
                  setMostrarFeedback(false)
                }}
              >
                <div
                  className="bg-[#1c1f1d] border border-white/10 rounded-3xl max-w-md w-full p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-white font-bold text-xl mb-2">Como foi o treino?</h3>
                  <p className="text-white/50 text-sm mb-4">
                    Avalie o esforço percebido (0 = muito fácil, 5 = muito difícil).
                  </p>

                  <div className="flex items-center justify-center gap-2 mb-5">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNota(n)}
                        className="cursor-pointer"
                        aria-label={`Nota ${n}`}
                      >
                        <Star
                          size={28}
                          className={n <= nota ? 'text-[#94e400]' : 'text-white/20'}
                          fill={n <= nota && n > 0 ? '#94e400' : 'none'}
                        />
                      </button>
                    ))}
                  </div>

                  <label className="flex flex-col gap-2 mb-4">
                    <span className="text-white/70 text-xs font-medium">
                      Comentário (opcional)
                    </span>
                    <textarea
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Ex.: Senti dificuldade no agachamento."
                      className="bg-[#0d100e] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm min-h-[90px] outline-none resize-none placeholder:text-white/30"
                    />
                  </label>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setMostrarFeedback(false)}
                      disabled={concluindo}
                      className="flex-1 border border-white/10 text-white/80 hover:bg-white/5 rounded-full py-2.5 font-semibold cursor-pointer disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={concluirTreino}
                      disabled={concluindo}
                      className="flex-1 bg-[#94e400] text-black hover:bg-[#a4f400] rounded-full py-2.5 font-extrabold cursor-pointer disabled:opacity-60"
                    >
                      {concluindo ? 'Enviando...' : 'Finalizar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
