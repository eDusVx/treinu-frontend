import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { useAuth } from '../../hooks'

interface Step1Form { email: string }
interface Step2Form { codigo: string }

export default function LoginCodigoPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const form1 = useForm<Step1Form>()
  const form2 = useForm<Step2Form>()
  const { saveSession } = useAuth()
  const navigate = useNavigate()

  async function onStep1(data: Step1Form) {
    setError('')
    setLoading(true)
    try {
      await authService.solicitarCodigoLogin(data.email)
      setEmail(data.email)
      setMsg('Código enviado para o seu e-mail.')
      setStep(2)
    } catch {
      setError('Não foi possível enviar o código. Verifique o e-mail.')
    } finally {
      setLoading(false)
    }
  }

  async function onStep2(data: Step2Form) {
    setError('')
    setLoading(true)
    try {
      const tokens = await authService.loginCodigo(email, data.codigo)
      const user = saveSession(tokens)
      if (!user) {
        setError('Token retornado pelo servidor é inválido (sem identidade ou perfil).')
        return
      }
      if (user.role === 'ADMIN') navigate('/admin/dashboard')
      else if (user.role === 'TREINADOR') navigate('/treinador/dashboard')
      else navigate('/aluno/dashboard')
    } catch {
      setError('Código inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d100e] flex items-center justify-center font-[Poppins,sans-serif]">
      <div
        className="flex flex-col bg-[#94e400] overflow-hidden rounded-[1.3vw] shadow-2xl"
        style={{ width: '44vw', padding: '4% 6%' }}
      >
        <h1
          className="text-black font-bold leading-[1.1] tracking-[-0.02em] mb-[4vh]"
          style={{ fontSize: 'clamp(1.8rem, 2.8vw, 3.5rem)' }}
        >
          Entrar com Código
        </h1>

        {msg && (
          <p className="text-black bg-black/10 rounded-lg p-3 font-medium text-sm mb-[2vh]">{msg}</p>
        )}

        {step === 1 ? (
          <form onSubmit={form1.handleSubmit(onStep1)} className="flex flex-col gap-[3vh]">
            <div className="flex flex-col gap-[0.7vh]">
              <label className="text-black font-medium" style={{ fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }}>
                E-mail
              </label>
              <input
                {...form1.register('email', { required: true })}
                type="email"
                placeholder="Insira seu e-mail"
                className="bg-black rounded-[1.15vw] text-[#94e400] font-medium placeholder:text-[#94e400]/60 outline-none w-full"
                style={{ height: '7.3vh', padding: '0 1.5vw', fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }}
              />
            </div>

            {error && <p className="text-red-700 font-medium text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white font-extrabold rounded-[1.15vw] cursor-pointer w-full disabled:opacity-60"
              style={{ height: '7.3vh', fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}
            >
              {loading ? 'Enviando...' : 'Solicitar Código'}
            </button>
          </form>
        ) : (
          <form onSubmit={form2.handleSubmit(onStep2)} className="flex flex-col gap-[3vh]">
            <div className="flex flex-col gap-[0.7vh]">
              <label className="text-black font-medium" style={{ fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }}>
                Código recebido
              </label>
              <input
                {...form2.register('codigo', { required: true })}
                placeholder="Digite o código"
                className="bg-black rounded-[1.15vw] text-[#94e400] font-medium placeholder:text-[#94e400]/60 outline-none w-full"
                style={{ height: '7.3vh', padding: '0 1.5vw', fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }}
              />
            </div>

            {error && <p className="text-red-700 font-medium text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white font-extrabold rounded-[1.15vw] cursor-pointer w-full disabled:opacity-60"
              style={{ height: '7.3vh', fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-black font-medium underline self-center"
              style={{ fontSize: 'clamp(0.8rem, 1vw, 1.1rem)' }}
            >
              Reenviar código
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="text-black font-medium underline self-center mt-[3vh]"
          style={{ fontSize: 'clamp(0.8rem, 1vw, 1.1rem)' }}
        >
          Voltar para o Login
        </Link>
      </div>
    </div>
  )
}
