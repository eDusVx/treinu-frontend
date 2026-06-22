import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Clock, Dumbbell, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { treinosService } from '../../../services/treinos.service'
import { usuariosService } from '../../../services/usuarios.service'
import { exerciciosService } from '../../../services/exercicios.service'
import type {
  AdicionarItemTreinoPayload,
  CriarTreinoPayload,
  EditarTreinoPayload,
  ExercicioDto,
  TreinoDto,
  TreinoStatusEnum,
  Usuario,
} from '../../../types'
import { dateInputParaIso, extractError, formatarDataPtBr } from '../../../utils'

const FILTROS: { value: TreinoStatusEnum | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ATIVO', label: 'Ativos' },
  { value: 'VENCIDO', label: 'Vencidos' },
]

const STATUS_COR: Record<TreinoStatusEnum, string> = {
  ATIVO: 'bg-[#94e400]/20 text-[#94e400]',
  VENCIDO: 'bg-red-500/20 text-red-300',
}

interface NovoTreinoForm {
  nome: string
  descricao: string
  dataInicio: string
  dataFim: string
  treinadorId: string
  alunoId: string
  nomeDivisaoA: string
  nomeDivisaoB: string
  nomeDivisaoC: string
  nomeDivisaoD: string
  divisaoSegunda: string
  divisaoTerca: string
  divisaoQuarta: string
  divisaoQuinta: string
  divisaoSexta: string
  divisaoSabado: string
  divisaoDomingo: string
  itens: {
    exercicioId: string
    series: number
    repeticoes: string
    carga: string
    pausa: string
    observacoes: string
    ordem: number
    divisao: string
  }[]
}

interface EditarTreinoForm {
  nome: string
  descricao: string
  dataInicio: string
  dataFim: string
  nomeDivisaoA: string
  nomeDivisaoB: string
  nomeDivisaoC: string
  nomeDivisaoD: string
  divisaoSegunda: string
  divisaoTerca: string
  divisaoQuarta: string
  divisaoQuinta: string
  divisaoSexta: string
  divisaoSabado: string
  divisaoDomingo: string
}

interface NovoItemForm {
  exercicioId: string
  series: number
  repeticoes: string
  carga: string
  pausa: string
  observacoes: string
  divisao: string
}

function isoParaDateInput(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export default function TreinosAdminPage() {
  const [aba, setAba] = useState<'lista' | 'novo'>('lista')

  const [treinos, setTreinos] = useState<TreinoDto[]>([])
  const [alunos, setAlunos] = useState<Usuario[]>([])
  const [treinadores, setTreinadores] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  const [filtroStatus, setFiltroStatus] = useState<TreinoStatusEnum | 'TODOS'>('TODOS')
  const [filtroAlunoId, setFiltroAlunoId] = useState('')
  const [filtroTreinadorId, setFiltroTreinadorId] = useState('')

  const [selecionado, setSelecionado] = useState<TreinoDto | null>(null)
  const [editando, setEditando] = useState<TreinoDto | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [removendoItemId, setRemovendoItemId] = useState<string | null>(null)
  const [adicionandoItem, setAdicionandoItem] = useState(false)
  const [exerciciosDoTreinador, setExerciciosDoTreinador] = useState<ExercicioDto[]>([])
  const [confirmacao, setConfirmacao] = useState<
    | { tipo: 'treino'; treino: TreinoDto }
    | { tipo: 'item'; itemId: string }
    | null
  >(null)

  const editForm = useForm<EditarTreinoForm>()
  const novoItemForm = useForm<NovoItemForm>({
    defaultValues: { series: 3, repeticoes: '10-12', pausa: '60s' },
  })

  // Token incremental para invalidar respostas obsoletas (evita race condition entre filtros).
  const reqToken = useRef(0)

  const carregar = useCallback(() => {
    const token = ++reqToken.current
    setLoading(true)
    setErro('')
    const statusFilter = filtroStatus !== 'TODOS' ? { status: filtroStatus } : {}
    const isCurrent = () => reqToken.current === token

    if (filtroAlunoId) {
      treinosService
        .listar({ alunoId: filtroAlunoId, ...statusFilter })
        .then((data) => {
          if (isCurrent()) setTreinos(Array.isArray(data) ? data : [])
        })
        .catch((err) => {
          if (isCurrent()) setErro(extractError(err) || 'Erro ao carregar treinos.')
        })
        .finally(() => {
          if (isCurrent()) setLoading(false)
        })
      return
    }

    if (filtroTreinadorId) {
      treinosService
        .listar({ treinadorId: filtroTreinadorId, ...statusFilter })
        .then((data) => {
          if (isCurrent()) setTreinos(Array.isArray(data) ? data : [])
        })
        .catch((err) => {
          if (isCurrent()) setErro(extractError(err) || 'Erro ao carregar treinos.')
        })
        .finally(() => {
          if (isCurrent()) setLoading(false)
        })
      return
    }

    Promise.all(
      treinadores.map((t) =>
        treinosService
          .listar({ treinadorId: t.id, ...statusFilter })
          .catch(() => [] as TreinoDto[]),
      ),
    )
      .then((arrs) => {
        if (isCurrent()) setTreinos(arrs.flat())
      })
      .catch((err) => {
        if (isCurrent()) setErro(extractError(err) || 'Erro ao carregar treinos.')
      })
      .finally(() => {
        if (isCurrent()) setLoading(false)
      })
  }, [filtroAlunoId, filtroTreinadorId, filtroStatus, treinadores])

  useEffect(() => {
    Promise.all([
      usuariosService.listar('ALUNO', 1, 100).catch(() => ({ data: [] as Usuario[] })),
      usuariosService.listar('TREINADOR', 1, 100).catch(() => ({ data: [] as Usuario[] })),
    ]).then(([a, t]) => {
      setAlunos(a.data ?? [])
      setTreinadores((t.data ?? []).filter((tr) => tr.ativo))
    })
  }, [])

  useEffect(() => {
    if (treinadores.length === 0 && !filtroAlunoId && !filtroTreinadorId) return
    carregar()
  }, [carregar, treinadores.length, filtroAlunoId, filtroTreinadorId])

  // Carrega exercícios do treinador do treino selecionado (para adicionar item).
  useEffect(() => {
    if (!selecionado) {
      setExerciciosDoTreinador([])
      return
    }
    exerciciosService
      .listar(selecionado.treinadorId)
      .then((data) => setExerciciosDoTreinador(Array.isArray(data) ? data : []))
      .catch(() => setExerciciosDoTreinador([]))
  }, [selecionado])

  const lista = useMemo(
    () => treinos.slice().sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()),
    [treinos],
  )

  const nomePorAluno = useMemo(
    () => Object.fromEntries(alunos.map((a) => [a.id, a.nomeCompleto])),
    [alunos],
  )
  const nomePorTreinador = useMemo(
    () => Object.fromEntries(treinadores.map((t) => [t.id, t.nomeCompleto])),
    [treinadores],
  )

  function abrirEdicao(t: TreinoDto) {
    setEditando(t)
    editForm.reset({
      nome: t.nome,
      descricao: t.descricao,
      dataInicio: isoParaDateInput(t.dataInicio),
      dataFim: isoParaDateInput(t.dataFim),
      nomeDivisaoA: t.nomeDivisaoA || '',
      nomeDivisaoB: t.nomeDivisaoB || '',
      nomeDivisaoC: t.nomeDivisaoC || '',
      nomeDivisaoD: t.nomeDivisaoD || '',
      divisaoSegunda: t.divisaoSegunda || '',
      divisaoTerca: t.divisaoTerca || '',
      divisaoQuarta: t.divisaoQuarta || '',
      divisaoQuinta: t.divisaoQuinta || '',
      divisaoSexta: t.divisaoSexta || '',
      divisaoSabado: t.divisaoSabado || '',
      divisaoDomingo: t.divisaoDomingo || '',
    })
  }

  async function salvarEdicao(data: EditarTreinoForm) {
    if (!editando) return
    if (new Date(data.dataFim) <= new Date(data.dataInicio)) {
      setErro('A data de fim deve ser posterior à data de início.')
      return
    }
    try {
      const payload: EditarTreinoPayload = {
        nome: data.nome,
        descricao: data.descricao,
        dataInicio: dateInputParaIso(data.dataInicio),
        dataFim: dateInputParaIso(data.dataFim),
        nomeDivisaoA: data.nomeDivisaoA || null,
        nomeDivisaoB: data.nomeDivisaoB || null,
        nomeDivisaoC: data.nomeDivisaoC || null,
        nomeDivisaoD: data.nomeDivisaoD || null,
        divisaoSegunda: data.divisaoSegunda || null,
        divisaoTerca: data.divisaoTerca || null,
        divisaoQuarta: data.divisaoQuarta || null,
        divisaoQuinta: data.divisaoQuinta || null,
        divisaoSexta: data.divisaoSexta || null,
        divisaoSabado: data.divisaoSabado || null,
        divisaoDomingo: data.divisaoDomingo || null
      }
      await treinosService.editar(editando.id, payload)
      // Atualiza estado local com os campos editados.
      setTreinos((prev) =>
        prev.map((t) =>
          t.id === editando.id ? { ...t, ...payload } : t,
        ),
      )
      if (selecionado?.id === editando.id) {
        setSelecionado({ ...selecionado, ...payload })
      }
      setEditando(null)
      setMsg('Treino atualizado.')
    } catch (err) {
      setErro(extractError(err) || 'Erro ao atualizar treino.')
    }
  }

  function pedirExcluirTreino(t: TreinoDto) {
    setConfirmacao({ tipo: 'treino', treino: t })
  }

  async function excluirTreinoConfirmado(t: TreinoDto) {
    setExcluindoId(t.id)
    try {
      await treinosService.excluir(t.id)
      setTreinos((prev) => prev.filter((x) => x.id !== t.id))
      if (selecionado?.id === t.id) setSelecionado(null)
      setConfirmacao(null)
      setMsg('Treino excluído.')
    } catch (err) {
      setErro(extractError(err) || 'Erro ao excluir treino.')
    } finally {
      setExcluindoId(null)
    }
  }

  async function adicionarItemAoTreino(data: NovoItemForm) {
    if (!selecionado) return
    try {
      const ordem = (selecionado.itens?.length || 0) + 1
      const payload: AdicionarItemTreinoPayload = {
        exercicioId: data.exercicioId,
        series: Number(data.series),
        repeticoes: data.repeticoes,
        carga: data.carga,
        pausa: data.pausa,
        observacoes: data.observacoes || '',
        ordem,
        divisao: data.divisao
      }
      // Backend retorna o treino atualizado — evita refetch da lista inteira
      // do treinador (que para o admin envolveria N+1 entre filtros).
      const atualizado = await treinosService.adicionarItem(selecionado.id, payload)
      setSelecionado(atualizado)
      setTreinos((prev) => prev.map((t) => (t.id === atualizado.id ? atualizado : t)))
      novoItemForm.reset({
        series: 3,
        repeticoes: '10-12',
        pausa: '60s',
        exercicioId: '',
        carga: '',
        observacoes: '',
        divisao: 'A'
      })
      setAdicionandoItem(false)
      setMsg('Exercício adicionado.')
    } catch (err) {
      setErro(extractError(err) || 'Erro ao adicionar exercício.')
    }
  }

  function pedirRemoverItem(itemId: string) {
    setConfirmacao({ tipo: 'item', itemId })
  }

  async function removerItemConfirmado(itemId: string) {
    if (!selecionado) return
    setRemovendoItemId(itemId)
    try {
      await treinosService.removerItem(selecionado.id, itemId)
      const novosItens = (selecionado.itens || []).filter((i) => i.id !== itemId)
      const atualizado = { ...selecionado, itens: novosItens }
      setSelecionado(atualizado)
      setTreinos((prev) => prev.map((t) => (t.id === selecionado.id ? atualizado : t)))
      setConfirmacao(null)
      setMsg('Exercício removido.')
    } catch (err) {
      setErro(extractError(err) || 'Erro ao remover exercício.')
    } finally {
      setRemovendoItemId(null)
    }
  }

  const inputClass =
    'bg-[#272727] border border-white/10 rounded-full px-4 py-2 text-white text-sm outline-none [color-scheme:dark]'
  const inputClassFull =
    'bg-[#0d100e] border border-white/10 rounded-xl text-white font-medium placeholder:text-white/30 outline-none w-full focus:border-[#94e400] transition-colors px-4 py-2.5 text-sm'
  const labelClass = 'text-white/70 font-medium text-xs uppercase tracking-wider'

  return (
    <DashboardLayout>
      <div className="flex gap-2 mb-6">
        {(['lista', 'novo'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={`px-5 py-2.5 rounded-full font-semibold text-sm cursor-pointer ${
              aba === k
                ? 'bg-[#94e400] text-black'
                : 'bg-[#272727] text-white/70 border border-white/10'
            }`}
          >
            {k === 'lista' ? 'Treinos cadastrados' : '+ Novo treino'}
          </button>
        ))}
      </div>

      {msg && <p className="text-[#94e400] text-sm mb-3">{msg}</p>}
      {erro && <p className="text-red-400 text-sm mb-3">{erro}</p>}

      {aba === 'lista' && (
        <>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <select
              value={filtroAlunoId}
              onChange={(e) => setFiltroAlunoId(e.target.value)}
              className={inputClass}
            >
              <option value="">Todos os alunos</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nomeCompleto}
                </option>
              ))}
            </select>
            <select
              value={filtroTreinadorId}
              onChange={(e) => setFiltroTreinadorId(e.target.value)}
              disabled={!!filtroAlunoId}
              title={filtroAlunoId ? 'Limpe o filtro de aluno para filtrar por treinador' : ''}
              className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">Todos os treinadores</option>
              {treinadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nomeCompleto}
                </option>
              ))}
            </select>
            <div className="flex gap-2 flex-wrap">
              {FILTROS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFiltroStatus(f.value)}
                  className={`px-4 py-2 rounded-full font-semibold text-xs cursor-pointer ${
                    filtroStatus === f.value
                      ? 'bg-[#94e400] text-black'
                      : 'bg-[#272727] text-white/70 border border-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={carregar}
              disabled={loading}
              className="text-[#94e400] hover:text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ml-auto"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>

          {loading ? (
            <div className="text-white/50 text-center py-12">Carregando...</div>
          ) : lista.length === 0 ? (
            <div className="bg-[#272727] border-2 border-[#4d4d4d] border-dashed rounded-3xl p-12 text-center text-white/50">
              Nenhum treino encontrado.
            </div>
          ) : (
            <div className="bg-[#272727] rounded-3xl overflow-hidden border border-white/5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Treino', 'Aluno', 'Treinador', 'Período', 'Exercícios', 'Status', 'Ações'].map((h) => (
                      <th key={h} className="text-left text-white/40 text-xs font-semibold uppercase px-5 py-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((t, i) => (
                    <tr
                      key={t.id}
                      className={`border-b border-white/5 hover:bg-white/[0.04] ${i % 2 ? 'bg-white/[0.02]' : ''}`}
                    >
                      <td
                        onClick={() => setSelecionado(t)}
                        className="px-5 py-3 text-white text-sm font-semibold cursor-pointer"
                      >
                        {t.nome}
                        <p className="text-white/40 text-xs font-normal mt-0.5 truncate max-w-[260px]">
                          {t.descricao}
                        </p>
                      </td>
                      <td
                        onClick={() => setSelecionado(t)}
                        className="px-5 py-3 text-white/70 text-xs cursor-pointer"
                      >
                        {nomePorAluno[t.alunoId] ?? '—'}
                      </td>
                      <td
                        onClick={() => setSelecionado(t)}
                        className="px-5 py-3 text-white/70 text-xs cursor-pointer"
                      >
                        {nomePorTreinador[t.treinadorId] ?? '—'}
                      </td>
                      <td
                        onClick={() => setSelecionado(t)}
                        className="px-5 py-3 text-white/60 text-xs cursor-pointer"
                      >
                        {formatarDataPtBr(t.dataInicio)} — {formatarDataPtBr(t.dataFim)}
                      </td>
                      <td
                        onClick={() => setSelecionado(t)}
                        className="px-5 py-3 text-white/60 text-xs cursor-pointer"
                      >
                        {t.itens?.length ?? 0}
                      </td>
                      <td
                        onClick={() => setSelecionado(t)}
                        className="px-5 py-3 cursor-pointer"
                      >
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COR[t.status]}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => abrirEdicao(t)}
                            className="text-white/60 hover:text-[#94e400] cursor-pointer p-2"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => pedirExcluirTreino(t)}
                            disabled={excluindoId === t.id}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer p-2"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                          <Dumbbell size={14} className="text-white/40 ml-1" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {aba === 'novo' && (
        <NovoTreinoForm
          alunos={alunos}
          treinadores={treinadores}
          onCriado={(novo) => {
            setTreinos((prev) => [novo, ...prev])
            setAba('lista')
          }}
        />
      )}

      {/* ─── Modal de detalhe ─────────────────────────────────────────── */}
      {selecionado && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => {
            setSelecionado(null)
            setAdicionandoItem(false)
          }}
        >
          <div
            className="bg-[#1c1f1d] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-white font-bold text-2xl">{selecionado.nome}</h2>
                <p className="text-white/60 text-sm mt-1">{selecionado.descricao}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => abrirEdicao(selecionado)}
                  className="text-white/60 hover:text-[#94e400] cursor-pointer p-2"
                  title="Editar treino"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => pedirExcluirTreino(selecionado)}
                  disabled={excluindoId === selecionado.id}
                  className="text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer p-2"
                  title="Excluir treino"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setSelecionado(null)}
                  className="text-white/60 hover:text-white cursor-pointer p-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-white/60 mt-3">
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {formatarDataPtBr(selecionado.dataInicio)} — {formatarDataPtBr(selecionado.dataFim)}
              </span>
              <span>Aluno: {nomePorAluno[selecionado.alunoId] ?? selecionado.alunoId}</span>
              <span>Treinador: {nomePorTreinador[selecionado.treinadorId] ?? selecionado.treinadorId}</span>
            </div>

            <div className="flex items-center justify-between mt-6 mb-3">
              <h3 className="text-white font-semibold text-sm">Exercícios</h3>
              <button
                onClick={() => setAdicionandoItem((v) => !v)}
                className="inline-flex items-center gap-1 text-[#94e400] text-xs font-semibold hover:underline cursor-pointer"
              >
                <Plus size={14} /> {adicionandoItem ? 'Cancelar' : 'Adicionar exercício'}
              </button>
            </div>

            {adicionandoItem && (
              <form
                onSubmit={novoItemForm.handleSubmit(adicionarItemAoTreino)}
                className="bg-[#0d100e] border border-white/5 rounded-2xl p-4 grid grid-cols-6 gap-3 mb-4"
              >
                {exerciciosDoTreinador.length === 0 && (
                  <p className="col-span-6 text-yellow-400/80 text-xs italic">
                    Este treinador não tem exercícios cadastrados.
                  </p>
                )}
                <div className="flex flex-col gap-1 col-span-2">
                  <label className={labelClass}>Exercício</label>
                  <select
                    {...novoItemForm.register('exercicioId', { required: true })}
                    className={`${inputClassFull} [color-scheme:dark]`}
                  >
                    <option value="">Selecione</option>
                    {exerciciosDoTreinador.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Divisão</label>
                  <select
                    {...novoItemForm.register('divisao', { required: true })}
                    className={`${inputClassFull} [color-scheme:dark]`}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Séries</label>
                  <input
                    type="number"
                    min={1}
                    {...novoItemForm.register('series', { valueAsNumber: true, required: true })}
                    className={inputClassFull}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Reps</label>
                  <input
                    {...novoItemForm.register('repeticoes', { required: true })}
                    className={inputClassFull}
                    placeholder="10-12"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Carga</label>
                  <input
                    {...novoItemForm.register('carga', { required: true })}
                    className={inputClassFull}
                    placeholder="20kg"
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className={labelClass}>Pausa</label>
                  <input
                    {...novoItemForm.register('pausa', { required: true })}
                    className={inputClassFull}
                    placeholder="60s"
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-4">
                  <label className={labelClass}>Observações</label>
                  <input
                    {...novoItemForm.register('observacoes')}
                    className={inputClassFull}
                    placeholder="Opcional"
                  />
                </div>
                <div className="col-span-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={novoItemForm.formState.isSubmitting || exerciciosDoTreinador.length === 0}
                    className="bg-[#94e400] text-black font-bold rounded-full px-5 py-2 text-sm disabled:opacity-60 cursor-pointer hover:bg-[#a4f400]"
                  >
                    {novoItemForm.formState.isSubmitting ? 'Salvando...' : 'Adicionar exercício'}
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col gap-5">
              {selecionado.itens?.length ? (
                (() => {
                  const divisoes = [
                    { letra: 'A', nome: selecionado.nomeDivisaoA || 'Divisão A' },
                    { letra: 'B', nome: selecionado.nomeDivisaoB || 'Divisão B' },
                    { letra: 'C', nome: selecionado.nomeDivisaoC || 'Divisão C' },
                    { letra: 'D', nome: selecionado.nomeDivisaoD || 'Divisão D' },
                  ].filter(d => d.letra === 'A' || d.letra === 'B' || d.nome);

                  return divisoes.map((div) => {
                    const itensDiv = (selecionado.itens || [])
                      .filter((item) => (item.divisao || 'A').toUpperCase() === div.letra)
                      .sort((a, b) => a.ordem - b.ordem);

                    return (
                      <div key={div.letra} className="border-t border-white/5 pt-4 first:border-0 first:pt-0">
                        <h4 className="text-[#94e400] font-bold text-sm mb-3">
                          {div.letra} - {div.nome}
                        </h4>
                        <div className="flex flex-col gap-3">
                          {itensDiv.length ? (
                            itensDiv.map((item) => (
                              <div key={item.id} className="bg-[#0d100e] border border-white/5 rounded-2xl p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-white font-semibold">
                                    #{item.ordem} — {item.exercicio?.nome ?? 'Exercício'}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[#94e400] font-bold text-sm">
                                      {item.series}x{item.repeticoes}
                                    </span>
                                    <button
                                      onClick={() => pedirRemoverItem(item.id)}
                                      disabled={removendoItemId === item.id}
                                      className="text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer p-1"
                                      title="Remover exercício"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex gap-4 text-white/60 text-xs mt-2">
                                  <span>Carga: {item.carga}</span>
                                  <span>Pausa: {item.pausa}</span>
                                </div>
                                {item.observacoes && (
                                  <p className="text-white/50 text-xs mt-2 italic">{item.observacoes}</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-white/40 text-xs italic ml-2">Nenhum exercício nesta divisão.</p>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="text-white/50 text-sm italic">
                  Nenhum exercício neste treino. Adicione o primeiro!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de edição ────────────────────────────────────────────── */}
      {editando && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setEditando(null)}
        >
          <div
            className="bg-[#1c1f1d] border border-white/10 rounded-3xl max-w-2xl w-full p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-xl">Editar treino</h2>
              <button
                onClick={() => setEditando(null)}
                className="text-white/60 hover:text-white cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={editForm.handleSubmit(salvarEdicao)} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className={labelClass}>Nome</label>
                <input
                  {...editForm.register('nome', { required: true })}
                  className={inputClassFull}
                />
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className={labelClass}>Descrição</label>
                <input
                  {...editForm.register('descricao', { required: true })}
                  className={inputClassFull}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Data início</label>
                <input
                  {...editForm.register('dataInicio', { required: true })}
                  type="date"
                  className={`${inputClassFull} [color-scheme:dark]`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Data fim</label>
                <input
                  {...editForm.register('dataFim', { required: true })}
                  type="date"
                  className={`${inputClassFull} [color-scheme:dark]`}
                />
              </div>

              {/* Configuração das Divisões */}
              <div className="col-span-2 border-t border-white/5 pt-4 mt-2">
                <h3 className="text-white font-semibold text-sm mb-3">Configuração das Divisões</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Nome Divisão A *</label>
                    <input {...editForm.register('nomeDivisaoA', { required: true })} className={inputClassFull} placeholder="Ex: Perna" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Nome Divisão B *</label>
                    <input {...editForm.register('nomeDivisaoB', { required: true })} className={inputClassFull} placeholder="Ex: Peito" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Nome Divisão C</label>
                    <input {...editForm.register('nomeDivisaoC')} className={inputClassFull} placeholder="Ex: Costas" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Nome Divisão D</label>
                    <input {...editForm.register('nomeDivisaoD')} className={inputClassFull} placeholder="Ex: Ombros" />
                  </div>
                </div>
              </div>

              {/* Cronograma Semanal */}
              <div className="col-span-2 border-t border-white/5 pt-4 mt-2">
                <h3 className="text-white font-semibold text-sm mb-3">Cronograma Semanal (Divisão por Dia)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {[
                    { key: 'divisaoSegunda', label: 'Segunda' },
                    { key: 'divisaoTerca', label: 'Terça' },
                    { key: 'divisaoQuarta', label: 'Quarta' },
                    { key: 'divisaoQuinta', label: 'Quinta' },
                    { key: 'divisaoSexta', label: 'Sexta' },
                    { key: 'divisaoSabado', label: 'Sábado' },
                    { key: 'divisaoDomingo', label: 'Domingo' }
                  ].map((dia) => (
                    <div key={dia.key} className="flex flex-col gap-1.5">
                      <label className={labelClass}>{dia.label}</label>
                      <select {...editForm.register(dia.key as any)} className={`${inputClassFull} [color-scheme:dark]`}>
                        <option value="">Descanso</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="text-white/70 hover:text-white font-medium px-5 py-2.5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editForm.formState.isSubmitting}
                  className="bg-[#94e400] text-black font-extrabold rounded-full px-7 py-2.5 disabled:opacity-60 cursor-pointer hover:bg-[#a4f400]"
                >
                  {editForm.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmacao !== null}
        title={confirmacao?.tipo === 'item' ? 'Remover exercício' : 'Excluir treino'}
        message={
          confirmacao?.tipo === 'item'
            ? 'Tem certeza que deseja remover este exercício do treino?'
            : confirmacao?.tipo === 'treino'
              ? `Excluir o treino "${confirmacao.treino.nome}"? Esta ação não pode ser desfeita.`
              : ''
        }
        confirmLabel={confirmacao?.tipo === 'item' ? 'Remover' : 'Excluir'}
        variant="danger"
        loading={
          confirmacao?.tipo === 'treino'
            ? excluindoId === confirmacao.treino.id
            : confirmacao?.tipo === 'item'
              ? removendoItemId === confirmacao.itemId
              : false
        }
        onCancel={() => setConfirmacao(null)}
        onConfirm={() => {
          if (confirmacao?.tipo === 'treino') excluirTreinoConfirmado(confirmacao.treino)
          else if (confirmacao?.tipo === 'item') removerItemConfirmado(confirmacao.itemId)
        }}
      />
    </DashboardLayout>
  )
}

/* ─── Form de criação (preservado do arquivo original) ──────────────────── */

interface NovoTreinoFormProps {
  alunos: Usuario[]
  treinadores: Usuario[]
  onCriado: (novo: TreinoDto) => void
}

function NovoTreinoForm({ alunos, treinadores, onCriado }: NovoTreinoFormProps) {
  const form = useForm<NovoTreinoForm>({
    defaultValues: {
      nome: '',
      descricao: '',
      dataInicio: '',
      dataFim: '',
      treinadorId: '',
      alunoId: '',
      nomeDivisaoA: 'Divisão A',
      nomeDivisaoB: 'Divisão B',
      nomeDivisaoC: '',
      nomeDivisaoD: '',
      divisaoSegunda: 'A',
      divisaoTerca: 'B',
      divisaoQuarta: '',
      divisaoQuinta: 'A',
      divisaoSexta: 'B',
      divisaoSabado: '',
      divisaoDomingo: '',
      itens: [
        {
          exercicioId: '',
          series: 3,
          repeticoes: '10-12',
          carga: '',
          pausa: '60s',
          observacoes: '',
          ordem: 1,
          divisao: 'A',
        },
      ],
    },
  })
  const itens = useFieldArray({ control: form.control, name: 'itens' })

  const treinadorId = form.watch('treinadorId')
  const [exercicios, setExercicios] = useState<ExercicioDto[]>([])
  const [loadingEx, setLoadingEx] = useState(false)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  // Quando admin escolhe um treinador, carrega exercícios DAQUELE treinador.
  useEffect(() => {
    if (!treinadorId) {
      setExercicios([])
      return
    }
    setLoadingEx(true)
    exerciciosService
      .listar(treinadorId)
      .then((data) => setExercicios(Array.isArray(data) ? data : []))
      .catch(() => setExercicios([]))
      .finally(() => setLoadingEx(false))
  }, [treinadorId])

  async function criar(data: NovoTreinoForm) {
    setMsg('')
    setErro('')
    if (new Date(data.dataFim) <= new Date(data.dataInicio)) {
      setErro('A data de fim deve ser posterior à data de início.')
      return
    }
    try {
      const payload: CriarTreinoPayload = {
        nome: data.nome,
        descricao: data.descricao,
        dataInicio: dateInputParaIso(data.dataInicio),
        dataFim: dateInputParaIso(data.dataFim),
        treinadorId: data.treinadorId,
        alunoId: data.alunoId,
        itens: data.itens.map((it, idx) => ({
          exercicioId: it.exercicioId,
          series: Number(it.series),
          repeticoes: it.repeticoes,
          carga: it.carga,
          pausa: it.pausa,
          observacoes: it.observacoes,
          ordem: idx + 1,
          divisao: it.divisao
        })),
        nomeDivisaoA: data.nomeDivisaoA,
        nomeDivisaoB: data.nomeDivisaoB,
        nomeDivisaoC: data.nomeDivisaoC || null,
        nomeDivisaoD: data.nomeDivisaoD || null,
        divisaoSegunda: data.divisaoSegunda || null,
        divisaoTerca: data.divisaoTerca || null,
        divisaoQuarta: data.divisaoQuarta || null,
        divisaoQuinta: data.divisaoQuinta || null,
        divisaoSexta: data.divisaoSexta || null,
        divisaoSabado: data.divisaoSabado || null,
        divisaoDomingo: data.divisaoDomingo || null
      }
      const novo = await treinosService.criar(payload)
      setMsg('Treino criado com sucesso!')
      onCriado(novo)
      form.reset()
    } catch (err) {
      setErro(extractError(err) || 'Erro ao criar treino.')
    }
  }

  const semExercicios = !!treinadorId && exercicios.length === 0 && !loadingEx
  const inputClass =
    'bg-[#0d100e] border border-white/10 rounded-xl text-white font-medium placeholder:text-white/30 outline-none w-full focus:border-[#94e400] transition-colors px-4 py-2.5 text-sm'
  const labelClass = 'text-white/70 font-medium text-xs uppercase tracking-wider'

  return (
    <div className="bg-[#272727] rounded-3xl p-6 border border-white/5">
      <h2 className="text-white font-bold text-xl mb-5">Novo treino</h2>

      <form onSubmit={form.handleSubmit(criar)} className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Treinador responsável *</label>
          <select
            {...form.register('treinadorId', { required: true })}
            className={`${inputClass} [color-scheme:dark]`}
          >
            <option value="">Selecione</option>
            {treinadores.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nomeCompleto} — {t.email}
              </option>
            ))}
          </select>
          {treinadores.length === 0 && (
            <span className="text-yellow-400/80 text-[11px]">
              Nenhum treinador ativo. Aprove em "Aprovação de Treinadores" primeiro.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Aluno *</label>
          <select
            {...form.register('alunoId', { required: true })}
            className={`${inputClass} [color-scheme:dark]`}
          >
            <option value="">Selecione</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nomeCompleto} — {a.email}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 col-span-2">
          <label className={labelClass}>Nome do treino *</label>
          <input
            {...form.register('nome', { required: true })}
            className={inputClass}
            placeholder="Ex: Peito + Tríceps"
          />
        </div>
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className={labelClass}>Descrição *</label>
          <input
            {...form.register('descricao', { required: true })}
            className={inputClass}
            placeholder="Foco em força e definição"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Data início *</label>
          <input
            {...form.register('dataInicio', { required: true })}
            type="date"
            className={`${inputClass} [color-scheme:dark]`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Data fim *</label>
          <input
            {...form.register('dataFim', { required: true })}
            type="date"
            className={`${inputClass} [color-scheme:dark]`}
          />
        </div>

        {/* Configuração das Divisões */}
        <div className="col-span-2 border-t border-white/5 pt-4 mt-2">
          <h3 className="text-white font-semibold text-sm mb-3">Configuração das Divisões</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Nome Divisão A *</label>
              <input {...form.register('nomeDivisaoA', { required: true })} className={inputClass} placeholder="Ex: Perna" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Nome Divisão B *</label>
              <input {...form.register('nomeDivisaoB', { required: true })} className={inputClass} placeholder="Ex: Peito" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Nome Divisão C</label>
              <input {...form.register('nomeDivisaoC')} className={inputClass} placeholder="Ex: Costas" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Nome Divisão D</label>
              <input {...form.register('nomeDivisaoD')} className={inputClass} placeholder="Ex: Ombros" />
            </div>
          </div>
        </div>

        {/* Cronograma Semanal */}
        <div className="col-span-2 border-t border-white/5 pt-4 mt-2">
          <h3 className="text-white font-semibold text-sm mb-3">Cronograma Semanal (Divisão por Dia)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {[
              { key: 'divisaoSegunda', label: 'Segunda' },
              { key: 'divisaoTerca', label: 'Terça' },
              { key: 'divisaoQuarta', label: 'Quarta' },
              { key: 'divisaoQuinta', label: 'Quinta' },
              { key: 'divisaoSexta', label: 'Sexta' },
              { key: 'divisaoSabado', label: 'Sábado' },
              { key: 'divisaoDomingo', label: 'Domingo' }
            ].map((dia) => (
              <div key={dia.key} className="flex flex-col gap-1.5">
                <label className={labelClass}>{dia.label}</label>
                <select {...form.register(dia.key as any)} className={`${inputClass} [color-scheme:dark]`}>
                  <option value="">Descanso</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 mt-3 border-t border-white/5 pt-4">
          {!treinadorId ? (
            <p className="text-white/40 text-sm italic">
              Selecione um treinador acima para carregar a lista de exercícios disponíveis.
            </p>
          ) : (
            <>
              {semExercicios && (
                <div className="mb-5 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-200 text-sm">
                  Este treinador não tem exercícios cadastrados ainda. Peça para ele cadastrar antes
                  de atribuir treinos.
                </div>
              )}
              {loadingEx && (
                <p className="text-white/50 text-sm mb-3">Carregando exercícios...</p>
              )}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Exercícios</h3>
                <button
                  type="button"
                  onClick={() =>
                    itens.append({
                      exercicioId: '',
                      series: 3,
                      repeticoes: '10-12',
                      carga: '',
                      pausa: '60s',
                      observacoes: '',
                      ordem: itens.fields.length + 1,
                      divisao: 'A'
                    })
                  }
                  className="inline-flex items-center gap-1 text-[#94e400] text-sm font-semibold hover:underline cursor-pointer"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {itens.fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="bg-[#0d100e] border border-white/5 rounded-xl p-4 grid grid-cols-7 gap-3"
                  >
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className={labelClass}>Exercício</label>
                      <select
                        {...form.register(`itens.${idx}.exercicioId` as const, { required: true })}
                        className={`${inputClass} [color-scheme:dark]`}
                      >
                        <option value="">Selecione</option>
                        {exercicios.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>Divisão</label>
                      <select
                        {...form.register(`itens.${idx}.divisao` as const, { required: true })}
                        className={`${inputClass} [color-scheme:dark]`}
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>Séries</label>
                      <input
                        type="number"
                        min={1}
                        {...form.register(`itens.${idx}.series` as const, { valueAsNumber: true })}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>Repetições</label>
                      <input
                        {...form.register(`itens.${idx}.repeticoes` as const)}
                        className={inputClass}
                        placeholder="10-12"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>Carga</label>
                      <input
                        {...form.register(`itens.${idx}.carga` as const)}
                        className={inputClass}
                        placeholder="20kg"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>Pausa</label>
                      <input
                        {...form.register(`itens.${idx}.pausa` as const)}
                        className={inputClass}
                        placeholder="60s"
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-6">
                      <label className={labelClass}>Observações</label>
                      <input
                        {...form.register(`itens.${idx}.observacoes` as const)}
                        className={inputClass}
                        placeholder="Cadência lenta, foco na contração..."
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      {itens.fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => itens.remove(idx)}
                          className="text-red-400 hover:text-red-300 cursor-pointer p-2 mb-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {msg && <p className="col-span-2 text-[#94e400] text-sm">{msg}</p>}
        {erro && <p className="col-span-2 text-red-400 text-sm">{erro}</p>}

        <div className="col-span-2">
          <button
            type="submit"
            disabled={form.formState.isSubmitting || semExercicios || !treinadorId}
            className="bg-[#94e400] text-black font-extrabold rounded-full px-8 py-3 disabled:opacity-50 cursor-pointer hover:bg-[#a4f400]"
          >
            {form.formState.isSubmitting ? 'Salvando...' : 'Criar treino'}
          </button>
        </div>
      </form>
    </div>
  )
}
