import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout'
import { usuariosService } from '../../services/usuarios.service'
import { adminService } from '../../services/admin.service'
import type { Usuario } from '../../types'

export default function AprovacaoTreinadoresPage() {
  const [treinadores, setTreinadores] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aprovando, setAprovando] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Record<string, string>>({})

  const buscar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await usuariosService.listar('TREINADOR', 1, 50)
      // ASP.NET Core responde em camelCase: { data, total, ... }
      setTreinadores(res.data ?? [])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Erro ao carregar treinadores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { buscar() }, [buscar])

  async function aprovar(id: string) {
    setAprovando(id)
    try {
      await adminService.aprovarTreinador(id)
      setMsgs((m) => ({ ...m, [id]: 'Aprovado!' }))
      setTreinadores((prev) => prev.filter((t) => t.id !== id))
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setMsgs((m) => ({ ...m, [id]: e.response?.data?.detail || 'Erro ao aprovar.' }))
    } finally {
      setAprovando(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex justify-end mb-4">
        <button
          onClick={buscar}
          disabled={loading}
          className="text-[#94e400] hover:text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>
      <div className="bg-[#272727] rounded-3xl overflow-hidden border border-white/5">
        {loading ? (
          <div className="p-12 text-center text-white/50">Carregando...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-400">{error}</div>
        ) : treinadores.length === 0 ? (
          <div className="p-12 text-center text-white/50">Nenhum treinador encontrado.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Nome', 'E-mail', 'Status', 'Ação'].map((h) => (
                  <th key={h} className="text-left text-white/40 text-xs font-semibold uppercase tracking-wider px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {treinadores.map((t, i) => (
                <tr key={t.id} className={`border-b border-white/5 ${i % 2 !== 0 ? 'bg-white/[0.02]' : ''}`}>
                  <td className="px-6 py-4 text-white font-medium text-sm">{t.nomeCompleto}</td>
                  <td className="px-6 py-4 text-white/60 text-sm">{t.email}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold text-xs px-3 py-1 rounded-full ${t.ativo ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {t.ativo ? 'Ativo' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {msgs[t.id] ? (
                      <span className={`text-sm font-medium ${msgs[t.id] === 'Aprovado!' ? 'text-[#94e400]' : 'text-red-400'}`}>{msgs[t.id]}</span>
                    ) : (
                      <button onClick={() => aprovar(t.id)} disabled={aprovando === t.id} className="bg-[#94e400] text-black font-bold text-sm px-5 py-2 rounded-xl cursor-pointer disabled:opacity-60 hover:bg-[#7bc900] transition-colors">
                        {aprovando === t.id ? 'Aprovando...' : 'Aprovar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  )
}
