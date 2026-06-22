import { useState, useEffect, useCallback } from 'react'
import { Eye, RefreshCw } from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout'
import UsuarioFichaModal from '../../components/UsuarioFichaModal'
import { usuariosService } from '../../services/usuarios.service'
import type { PerfilEnum, UsuarioCompleto } from '../../types'

const PERFIL_LABEL: Record<string, string> = {
  ALUNO: 'Aluno',
  TREINADOR: 'Treinador',
  ADMIN: 'Administrador',
}

export default function UsuariosPage() {
  const [tipo, setTipo] = useState<PerfilEnum>('ALUNO')
  const [page, setPage] = useState(1)
  const [busca, setBusca] = useState('')
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selecionado, setSelecionado] = useState<UsuarioCompleto | null>(null)
  const LIMIT = 10

  const buscar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await usuariosService.listarCompleto<UsuarioCompleto>(tipo, page, LIMIT)
      setUsuarios((res.data ?? []) as UsuarioCompleto[])
      setTotal(res.total ?? 0)
      setTotalPages(res.totalPages ?? 1)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [tipo, page])

  useEffect(() => {
    buscar()
  }, [buscar])

  const filtrados = usuarios.filter((u) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      u.nomeCompleto?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.cpf?.includes(busca)
    )
  })

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex gap-2">
          {(
            [
              { value: 'ALUNO', label: 'Alunos' },
              { value: 'TREINADOR', label: 'Treinadores' },
            ] as { value: PerfilEnum; label: string }[]
          ).map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setTipo(t.value)
                setPage(1)
              }}
              className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all cursor-pointer ${
                tipo === t.value
                  ? 'bg-[#94e400] text-black'
                  : 'bg-[#272727] text-white/70 border border-white/10 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar nome, e-mail ou CPF"
            className="bg-[#272727] border border-white/10 rounded-full px-4 py-2 text-white text-sm outline-none placeholder:text-white/30 w-[260px]"
          />
          <button
            onClick={buscar}
            disabled={loading}
            className="text-[#94e400] hover:text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="bg-[#272727] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-white/50">Carregando...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-400">{error}</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-white/50">Nenhum usuário encontrado.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Nome', 'E-mail', 'Tipo', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left text-white/40 text-xs font-semibold uppercase tracking-wider px-6 py-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u, i) => (
                <tr
                  key={u.id}
                  onClick={() => setSelecionado(u)}
                  className={`border-b border-white/5 cursor-pointer hover:bg-white/[0.04] ${
                    i % 2 !== 0 ? 'bg-white/[0.02]' : ''
                  }`}
                >
                  <td className="px-6 py-4 text-white font-medium text-sm">{u.nomeCompleto}</td>
                  <td className="px-6 py-4 text-white/60 text-sm">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="bg-[#94e400]/10 text-[#94e400] font-semibold text-xs px-3 py-1 rounded-full">
                      {PERFIL_LABEL[u.perfil] ?? u.perfil}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`font-semibold text-xs px-3 py-1 rounded-full ${
                        u.ativo ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                      }`}
                    >
                      {u.ativo ? 'Ativo' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/40">
                    <Eye size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6 items-center">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-[#272727] text-white/60 text-sm disabled:opacity-30 hover:text-white cursor-pointer"
          >
            Anterior
          </button>
          <span className="px-4 py-2 text-white/50 text-sm">
            {page} / {totalPages} — {total} usuários
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl bg-[#272727] text-white/60 text-sm disabled:opacity-30 hover:text-white cursor-pointer"
          >
            Próximo
          </button>
        </div>
      )}

      {selecionado && (
        <UsuarioFichaModal
          usuario={selecionado}
          onClose={() => setSelecionado(null)}
          onUpdated={(novo) => {
            setUsuarios((prev) => prev.map((u) => (u.id === novo.id ? novo : u)))
            setSelecionado(novo)
          }}
        />
      )}
    </DashboardLayout>
  )
}
