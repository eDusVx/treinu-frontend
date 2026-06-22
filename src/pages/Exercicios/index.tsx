import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Activity,
  Dumbbell,
  ExternalLink,
  Heart,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout'
import { useAuth } from '../../hooks'
import { exerciciosService } from '../../services/exercicios.service'
import { extractError } from '../../utils'
import type { ExercicioDto, RegistrarExercicioPayload } from '../../types'

// Categorias visíveis no Figma como filtros pílula. A última (Mais) revela o restante.
const CATEGORIAS_PRINCIPAIS = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
  'Pernas',
  'Cardio',
] as const

const CATEGORIAS_EXTRAS = ['Panturrilhas', 'Outros'] as const

const TODAS_CATEGORIAS = [...CATEGORIAS_PRINCIPAIS, ...CATEGORIAS_EXTRAS] as const

type Categoria = (typeof TODAS_CATEGORIAS)[number] | 'Todos'

interface ExercicioForm {
  nome: string
  descricao: string
  tags: string
  arquivoDemonstracao: string
}

function tagsList(ex: ExercicioDto): string[] {
  return (ex.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function categoriaPrincipalDe(ex: ExercicioDto): string | null {
  const tags = tagsList(ex)
  for (const cat of TODAS_CATEGORIAS) {
    if (tags.some((t) => t.toLowerCase() === cat.toLowerCase())) return cat
  }
  return null
}

export default function ExerciciosPage() {
  const { user } = useAuth()
  const [exercicios, setExercicios] = useState<ExercicioDto[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState<Categoria>('Todos')
  const [verMais, setVerMais] = useState(false)
  const [tab, setTab] = useState<'todos' | 'favoritos'>('todos')
  const [ordenacao, setOrdenacao] = useState<'recentes' | 'nome'>('recentes')
  const [modalAberto, setModalAberto] = useState(false)
  const [avisoInventario, setAvisoInventario] = useState('')

  function avisarInventario() {
    setAvisoInventario('Aguardando novas funcionalidades.')
    setTimeout(() => setAvisoInventario(''), 3000)
  }

  const carregar = useCallback(() => {
    if (!user?.id) return
    setLoading(true)
    setErro('')
    exerciciosService
      .listar(user.id)
      .then((data) => setExercicios(Array.isArray(data) ? data : []))
      .catch((err) => setErro(extractError(err) || 'Erro ao carregar exercícios.'))
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  // ─── Modal: form de cadastro ────────────────────────────────────────────
  const form = useForm<ExercicioForm>()
  const [msgCadastro, setMsgCadastro] = useState('')
  const [erroCadastro, setErroCadastro] = useState('')

  async function registrar(data: ExercicioForm) {
    if (!user?.id) return
    setMsgCadastro('')
    setErroCadastro('')
    try {
      const payload: RegistrarExercicioPayload = {
        nome: data.nome,
        descricao: data.descricao,
        tags: data.tags,
        arquivoDemonstracao: data.arquivoDemonstracao || undefined,
        treinadorId: user.id,
      }
      const novo = await exerciciosService.registrar(payload)
      setExercicios((prev) => [novo, ...prev])
      setMsgCadastro('Exercício cadastrado!')
      form.reset()
      setTimeout(() => {
        setModalAberto(false)
        setMsgCadastro('')
      }, 800)
    } catch (err) {
      setErroCadastro(extractError(err) || 'Erro ao cadastrar exercício.')
    }
  }

  // ─── Filtragem + ordenação ──────────────────────────────────────────────
  const exerciciosFiltrados = useMemo(() => {
    let list = exercicios
    if (categoria !== 'Todos') {
      list = list.filter((ex) =>
        tagsList(ex).some((t) => t.toLowerCase() === categoria.toLowerCase()),
      )
    }
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      list = list.filter(
        (ex) =>
          ex.nome.toLowerCase().includes(q) ||
          (ex.descricao || '').toLowerCase().includes(q) ||
          (ex.tags || '').toLowerCase().includes(q),
      )
    }
    list = [...list].sort((a, b) => {
      if (ordenacao === 'nome') return a.nome.localeCompare(b.nome)
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    })
    return list
  }, [exercicios, categoria, busca, ordenacao])

  // ─── Contadores reais por categoria (derivados das tags) ────────────────
  const contadores = useMemo(() => {
    const map: Record<string, number> = {}
    for (const cat of TODAS_CATEGORIAS) map[cat] = 0
    for (const ex of exercicios) {
      const cat = categoriaPrincipalDe(ex)
      if (cat) map[cat] = (map[cat] || 0) + 1
    }
    return map
  }, [exercicios])

  const categoriasVisiveis = verMais ? TODAS_CATEGORIAS : CATEGORIAS_PRINCIPAIS

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-white font-bold text-3xl">Biblioteca de Exercícios</h1>
          <p className="text-white/60 text-sm">
            Explore nossa base completa de exercícios e adicione ao seu inventário.
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-2 bg-[#94e400] text-black font-bold rounded-full px-5 py-2.5 hover:bg-[#a4f400] cursor-pointer text-sm"
        >
          <Plus size={16} strokeWidth={3} />
          Cadastrar Exercício
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* ─── Coluna principal ─────────────────────────────────────────── */}
        <div className="bg-[#272727] border border-white/10 rounded-3xl p-6 flex flex-col gap-5">
          {/* Sub-tabs + busca */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab('todos')}
                className={`text-sm font-bold rounded-full px-5 py-2 cursor-pointer ${
                  tab === 'todos' ? 'bg-[#94e400] text-black' : 'text-white/70 hover:text-white'
                }`}
              >
                Todos os exercícios
              </button>
              <button
                onClick={() => {
                  setTab('favoritos')
                  avisarInventario()
                }}
                className={`text-sm font-bold rounded-full px-5 py-2 cursor-pointer flex items-center gap-1.5 ${
                  tab === 'favoritos'
                    ? 'bg-[#94e400] text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Star size={14} />
                Todos Favoritos
              </button>
            </div>
            <div className="relative flex-1 min-w-[240px] max-w-[420px]">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar exercício..."
                className="w-full bg-[#1c1f1d] border border-white/5 rounded-full pl-10 pr-4 py-2.5 text-white text-sm outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Filtros pílula por categoria */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCategoria('Todos')}
              className={`text-xs font-bold rounded-full px-4 py-1.5 cursor-pointer ${
                categoria === 'Todos'
                  ? 'bg-[#94e400] text-black'
                  : 'bg-[#1c1f1d] border border-white/10 text-white/70 hover:text-white'
              }`}
            >
              Todos
            </button>
            {categoriasVisiveis.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`text-xs font-bold rounded-full px-4 py-1.5 cursor-pointer ${
                  categoria === cat
                    ? 'bg-[#94e400] text-black'
                    : 'bg-[#1c1f1d] border border-white/10 text-white/70 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
            {!verMais && CATEGORIAS_EXTRAS.length > 0 && (
              <button
                onClick={() => setVerMais(true)}
                className="text-xs font-bold rounded-full px-4 py-1.5 bg-[#1c1f1d] border border-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                + Mais
              </button>
            )}
          </div>

          {/* Total + ordenação */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-white/60 text-xs">
              {tab === 'favoritos'
                ? '0 favoritos — aguardando novas funcionalidades.'
                : `${exerciciosFiltrados.length} exercício${exerciciosFiltrados.length === 1 ? '' : 's'} encontrado${exerciciosFiltrados.length === 1 ? '' : 's'}`}
            </span>
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as 'recentes' | 'nome')}
              className="bg-[#1c1f1d] border border-white/10 rounded-full px-4 py-1.5 text-white text-xs outline-none [color-scheme:dark]"
            >
              <option value="recentes">Mais recentes</option>
              <option value="nome">Por nome</option>
            </select>
          </div>

          {/* Grid de cards */}
          {loading ? (
            <div className="text-white/50 text-center py-16 text-sm">Carregando...</div>
          ) : erro ? (
            <div className="text-red-400 text-center py-16 text-sm">{erro}</div>
          ) : tab === 'favoritos' ? (
            <div className="text-white/40 text-center py-16 text-sm italic">
              Aguardando novas funcionalidades — backend ainda não armazena favoritos.
            </div>
          ) : exerciciosFiltrados.length === 0 ? (
            <div className="text-white/40 text-center py-16 text-sm italic">
              Nenhum exercício encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {exerciciosFiltrados.map((ex) => {
                const tags = tagsList(ex)
                const cat = categoriaPrincipalDe(ex)
                return (
                  <div
                    key={ex.id}
                    className="bg-[#1c1f1d] border border-white/5 rounded-2xl overflow-hidden flex flex-col"
                  >
                    {/* Imagem ou placeholder */}
                    <div className="aspect-video bg-[#0d100e] flex items-center justify-center relative overflow-hidden">
                      {ex.arquivoDemonstracao &&
                      /\.(png|jpe?g|gif|webp|avif)$/i.test(ex.arquivoDemonstracao) ? (
                        <img
                          src={ex.arquivoDemonstracao}
                          alt={ex.nome}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <Dumbbell size={40} className="text-[#94e400]/40" />
                      )}
                      {ex.arquivoDemonstracao && (
                        <a
                          href={ex.arquivoDemonstracao}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                          title="Abrir demonstração"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>

                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <h3 className="text-white font-bold text-sm leading-tight">{ex.nome}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cat && (
                          <span className="bg-[#94e400] text-black text-[10px] font-bold rounded-full px-2.5 py-0.5">
                            {cat}
                          </span>
                        )}
                        {tags
                          .filter((t) => t.toLowerCase() !== (cat || '').toLowerCase())
                          .slice(0, 2)
                          .map((t) => (
                            <span
                              key={t}
                              className="bg-white/5 text-white/70 text-[10px] font-bold rounded-full px-2.5 py-0.5"
                            >
                              {t}
                            </span>
                          ))}
                      </div>
                      <button
                        onClick={avisarInventario}
                        className="mt-auto inline-flex items-center justify-center gap-1.5 border border-[#94e400] text-[#94e400] hover:bg-[#94e400]/10 font-bold text-xs rounded-full py-2 cursor-pointer"
                      >
                        <Heart size={12} />
                        Adicionar ao Inventário
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {avisoInventario && (
            <div className="bg-[#94e400]/10 border border-[#94e400]/30 text-[#94e400] text-xs rounded-2xl px-4 py-2 italic">
              {avisoInventario}
            </div>
          )}
        </div>

        {/* ─── Sidebar direita ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#272727] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-base">Meu Inventário</h3>
              <span className="bg-[#94e400]/15 text-[#94e400] font-semibold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">
                Em breve
              </span>
            </div>
            <p className="text-white/50 text-xs mb-4">
              Exercícios que você adicionou ao seu inventário aparecem aqui.
            </p>
            <button
              onClick={avisarInventario}
              className="w-full border border-[#94e400] text-[#94e400] hover:bg-[#94e400]/10 font-bold text-xs rounded-full py-2 cursor-pointer"
            >
              Ver meu Inventário
            </button>
          </div>

          <div className="bg-[#272727] border border-white/10 rounded-3xl p-6">
            <h3 className="text-white font-bold text-base mb-4">Categorias Musculares</h3>
            <div className="flex flex-col gap-1">
              {TODAS_CATEGORIAS.map((cat) => {
                const ativa = categoria === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoria(ativa ? 'Todos' : cat)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl cursor-pointer ${
                      ativa ? 'bg-[#94e400]/10' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Activity
                        size={14}
                        className={ativa ? 'text-[#94e400]' : 'text-white/50'}
                      />
                      <span
                        className={`text-sm ${ativa ? 'text-[#94e400] font-semibold' : 'text-white/80'}`}
                      >
                        {cat}
                      </span>
                    </span>
                    <span className="bg-white/5 text-white/60 text-[10px] font-bold rounded-full px-2 py-0.5">
                      {contadores[cat] || 0}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal de cadastro ─────────────────────────────────────────── */}
      {modalAberto && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="bg-[#1c1f1d] border border-white/10 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-xl">Cadastrar Exercício</h2>
              <button
                onClick={() => setModalAberto(false)}
                className="w-9 h-9 rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={form.handleSubmit(registrar)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-white/70 text-xs font-medium">Nome</label>
                <input
                  {...form.register('nome', { required: true })}
                  className="bg-[#0d100e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#94e400] placeholder:text-white/30"
                  placeholder="Ex: Supino reto"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-white/70 text-xs font-medium">Descrição</label>
                <textarea
                  {...form.register('descricao', { required: true })}
                  className="bg-[#0d100e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#94e400] placeholder:text-white/30 min-h-[80px] resize-none"
                  placeholder="Como executar o exercício"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-white/70 text-xs font-medium">
                  Tags (vírgula) — primeira categoria define o filtro
                </label>
                <input
                  {...form.register('tags', { required: true })}
                  className="bg-[#0d100e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#94e400] placeholder:text-white/30"
                  placeholder="Peito, Força, Barra"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-white/70 text-xs font-medium">
                  URL de demonstração (opcional)
                </label>
                <input
                  {...form.register('arquivoDemonstracao')}
                  className="bg-[#0d100e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#94e400] placeholder:text-white/30"
                  placeholder="https://..."
                />
              </div>

              {msgCadastro && <p className="text-[#94e400] text-sm">{msgCadastro}</p>}
              {erroCadastro && <p className="text-red-400 text-sm">{erroCadastro}</p>}

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="text-white/70 hover:text-white font-medium px-5 py-2.5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="bg-[#94e400] text-black font-extrabold rounded-full px-7 py-2.5 disabled:opacity-60 cursor-pointer hover:bg-[#a4f400]"
                >
                  {form.formState.isSubmitting ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
