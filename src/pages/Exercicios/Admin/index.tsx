import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { ExternalLink, RefreshCw, Tag } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { exerciciosService } from '../../../services/exercicios.service'
import { usuariosService } from '../../../services/usuarios.service'
import { extractError } from '../../../utils'
import type { ExercicioDto, Usuario } from '../../../types'

export default function ExerciciosAdminPage() {
  const [treinadores, setTreinadores] = useState<Usuario[]>([])
  const [exercicios, setExercicios] = useState<(ExercicioDto & { treinadorNome?: string })[]>([])
  const [filtroTreinadorId, setFiltroTreinadorId] = useState('')
  const [filtroTags, setFiltroTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // Carrega treinadores uma vez
  useEffect(() => {
    usuariosService
      .listar('TREINADOR', 1, 100)
      .then((r) => setTreinadores(r.data ?? []))
      .catch(() => setTreinadores([]))
  }, [])

  const nomePorTreinador = useMemo(
    () => Object.fromEntries(treinadores.map((t) => [t.id, t.nomeCompleto])),
    [treinadores],
  )

  const reqToken = useRef(0)

  const carregar = useCallback(() => {
    const token = ++reqToken.current
    const isCurrent = () => reqToken.current === token
    setLoading(true)
    setErro('')
    if (filtroTreinadorId) {
      exerciciosService
        .listar(filtroTreinadorId, filtroTags || undefined)
        .then((data) => {
          if (!isCurrent()) return
          setExercicios(
            (Array.isArray(data) ? data : []).map((ex) => ({
              ...ex,
              treinadorNome: nomePorTreinador[ex.treinadorId],
            })),
          )
        })
        .catch((err) => {
          if (isCurrent()) setErro(extractError(err) || 'Erro ao carregar exercícios.')
        })
        .finally(() => {
          if (isCurrent()) setLoading(false)
        })
      return
    }
    // Sem filtro de treinador: agrega de todos
    Promise.all(
      treinadores.map((t) =>
        exerciciosService
          .listar(t.id, filtroTags || undefined)
          .catch(() => [] as ExercicioDto[]),
      ),
    )
      .then((arrs) => {
        if (!isCurrent()) return
        setExercicios(
          arrs.flat().map((ex) => ({ ...ex, treinadorNome: nomePorTreinador[ex.treinadorId] })),
        )
      })
      .catch((err) => {
        if (isCurrent()) setErro(extractError(err) || 'Erro ao carregar exercícios.')
      })
      .finally(() => {
        if (isCurrent()) setLoading(false)
      })
  }, [filtroTreinadorId, filtroTags, treinadores, nomePorTreinador])

  useEffect(() => {
    if (treinadores.length === 0) return
    carregar()
  }, [carregar, treinadores.length])

  const tagsUnicas = useMemo(() => {
    const set = new Set<string>()
    exercicios.forEach((ex) =>
      ex.tags
        ?.split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => set.add(t)),
    )
    return Array.from(set).sort()
  }, [exercicios])

  const inputClass =
    'bg-[#272727] border border-white/10 rounded-full px-4 py-2 text-white text-sm outline-none [color-scheme:dark]'

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={filtroTreinadorId}
          onChange={(e) => setFiltroTreinadorId(e.target.value)}
          className={inputClass}
        >
          <option value="">Todos os treinadores</option>
          {treinadores.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nomeCompleto}
            </option>
          ))}
        </select>
        <input
          value={filtroTags}
          onChange={(e) => setFiltroTags(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && carregar()}
          placeholder="Filtrar por tags (ex: Peito, Força)"
          className={`${inputClass} flex-1 min-w-[200px]`}
        />
        <button
          onClick={carregar}
          disabled={loading}
          className="bg-[#94e400] text-black font-bold text-sm rounded-full px-5 py-2 hover:bg-[#a4f400] cursor-pointer disabled:opacity-60"
        >
          Buscar
        </button>
        <button
          onClick={() => {
            setFiltroTags('')
            carregar()
          }}
          disabled={loading}
          className="text-[#94e400] hover:text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {tagsUnicas.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-white/40 text-xs uppercase tracking-wider">Sugestões:</span>
          {tagsUnicas.map((t) => {
            const ativa = filtroTags === t
            return (
              <button
                key={t}
                onClick={() => {
                  const nova = ativa ? '' : t
                  setFiltroTags(nova)
                  carregar()
                }}
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full cursor-pointer ${
                  ativa
                    ? 'bg-[#94e400] text-black'
                    : 'bg-[#94e400]/10 text-[#94e400] hover:bg-[#94e400]/20'
                }`}
              >
                <Tag size={10} />
                {t}
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="text-white/50 text-center py-12">Carregando...</div>
      ) : erro ? (
        <div className="text-red-400 text-center py-12">{erro}</div>
      ) : exercicios.length === 0 ? (
        <div className="bg-[#272727] border-2 border-[#4d4d4d] border-dashed rounded-3xl p-12 text-center text-white/50">
          Nenhum exercício encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {exercicios.map((ex) => (
            <div key={ex.id} className="bg-[#272727] border border-white/5 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-white font-semibold">{ex.nome}</h3>
                {ex.arquivoDemonstracao && (
                  <a
                    href={ex.arquivoDemonstracao}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#94e400] hover:text-white shrink-0"
                    title="Abrir demonstração"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <p className="text-white/50 text-xs mt-1 line-clamp-2">{ex.descricao}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {ex.tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-[#94e400]/10 text-[#94e400] text-[10px] font-bold px-2 py-0.5 rounded-full"
                    >
                      <Tag size={10} />
                      {t}
                    </span>
                  ))}
              </div>
              <div className="flex items-center justify-between text-white/30 text-[10px] mt-3 pt-3 border-t border-white/5">
                <span>{ex.treinadorNome ?? ex.treinadorId.slice(0, 8)}</span>
                {ex.criadoEm && <span>{new Date(ex.criadoEm).toLocaleDateString('pt-BR')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
