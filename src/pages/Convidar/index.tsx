import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Mail, UserPlus } from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout'
import { useAuth } from '../../hooks'
import { treinadorService } from '../../services/treinador.service'
import { usuariosService } from '../../services/usuarios.service'
import { extractError } from '../../utils'
import type { Usuario } from '../../types'

interface ConviteForm {
  email: string
  treinadorId: string
}

export default function ConvidarAlunoPage() {
  const { user } = useAuth()
  const ehTreinador = user?.role === 'TREINADOR'
  // Admin precisa escolher em nome de quem está convidando; treinador convida
  // pra si mesmo, então o select fica oculto e o id vem do JWT.
  const form = useForm<ConviteForm>({
    defaultValues: ehTreinador && user?.id ? { treinadorId: user.id } : undefined,
  })
  const [treinadores, setTreinadores] = useState<Usuario[]>([])
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (ehTreinador) return
    usuariosService
      .listar('TREINADOR', 1, 100)
      .then((r) => setTreinadores((r.data ?? []).filter((t) => t.ativo)))
      .catch(() => setTreinadores([]))
  }, [ehTreinador])

  async function enviar(data: ConviteForm) {
    setMsg('')
    setErro('')
    try {
      // Treinador sempre convida em nome próprio (sobrescreve qualquer valor
      // que tenha sobrado no form).
      const treinadorId = ehTreinador ? user!.id : data.treinadorId
      await treinadorService.convidarAluno({
        email: data.email,
        treinadorId,
      })
      setMsg(`Convite enviado para ${data.email}!`)
      form.reset({ email: '', treinadorId })
    } catch (err) {
      setErro(extractError(err) || 'Erro ao enviar convite.')
    }
  }

  const inputClass =
    'bg-[#0d100e] border border-white/10 rounded-xl text-white font-medium placeholder:text-white/30 outline-none w-full focus:border-[#94e400] transition-colors px-4 py-2.5 text-sm'
  const labelClass = 'text-white/70 font-medium text-xs uppercase tracking-wider'

  return (
    <DashboardLayout>
      <div className="bg-[#272727] rounded-3xl p-6 border border-white/5 max-w-xl">
        <div className="flex items-center gap-2 mb-5">
          <UserPlus size={20} className="text-[#94e400]" />
          <h2 className="text-white font-bold text-xl">Convidar Aluno</h2>
        </div>
        <p className="text-white/60 text-sm mb-6">
          {ehTreinador
            ? 'Informe o e-mail do aluno. O sistema enviará um link de cadastro em seu nome.'
            : 'Selecione o treinador responsável e o e-mail do aluno. O backend enviará o link de cadastro em nome do treinador escolhido.'}
        </p>

        <form onSubmit={form.handleSubmit(enviar)} className="flex flex-col gap-4">
          {!ehTreinador && (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Treinador responsável *</label>
              <select
                {...form.register('treinadorId', { required: !ehTreinador })}
                className={`${inputClass} [color-scheme:dark]`}
              >
                <option value="">Selecione um treinador</option>
                {treinadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nomeCompleto} — {t.email}
                  </option>
                ))}
              </select>
              {treinadores.length === 0 && (
                <span className="text-yellow-400/80 text-[11px]">
                  Nenhum treinador ativo encontrado. Aprove treinadores em "Aprovação de Treinadores"
                  primeiro.
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>E-mail do aluno *</label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                {...form.register('email', { required: true })}
                type="email"
                placeholder="aluno@email.com"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          {msg && <p className="text-[#94e400] text-sm">{msg}</p>}
          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          <button
            type="submit"
            disabled={form.formState.isSubmitting || (!ehTreinador && treinadores.length === 0)}
            className="bg-[#94e400] text-black font-extrabold rounded-full px-8 py-2.5 disabled:opacity-60 cursor-pointer self-start hover:bg-[#a4f400]"
          >
            {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Convite'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  )
}
