import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.service'

interface Step1Form { email: string }
interface Step2Form { token: string }
interface Step3Form { novaSenha: string; confirmarSenha: string }

export default function RecuperarSenhaPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [codigoSalvo, setCodigoSalvo] = useState('')

  const form1 = useForm<Step1Form>()
  const form2 = useForm<Step2Form>()
  const form3 = useForm<Step3Form>()

  const inputClass = "bg-black rounded-[1.15vw] text-[#94e400] font-medium placeholder:text-[#94e400]/60 outline-none w-full"
  const inputStyle = { height: '7.3vh', padding: '0 1.5vw', fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }
  const labelClass = "text-black font-medium"
  const labelStyle = { fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }

  async function onStep1(data: Step1Form) {
    setError('')
    setLoading(true)
    try {
      await authService.recuperarSenha(data.email)
      setMsg('Código enviado para o seu e-mail.')
      setStep(2)
    } catch {
      setError('Não foi possível enviar o código. Verifique o e-mail.')
    } finally {
      setLoading(false)
    }
  }

  function onStep2(data: Step2Form) {
    if (!data.token.trim()) {
      setError('Insira o código recebido.')
      return
    }
    setCodigoSalvo(data.token.trim())
    setError('')
    setMsg('')
    setStep(3)
  }

  async function onStep3(data: Step3Form) {
    if (data.novaSenha !== data.confirmarSenha) {
      setError('As senhas não coincidem.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authService.redefinirSenha(codigoSalvo, data.novaSenha)
      navigate('/login', { state: { toast: 'Senha redefinida com sucesso! Faça login.' } })
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
          {step === 1 && 'Recuperar Senha'}
          {step === 2 && 'Digite o Código'}
          {step === 3 && 'Nova Senha'}
        </h1>

        {msg && (
          <p className="text-black bg-black/10 rounded-lg p-3 font-medium text-sm mb-[2vh]">{msg}</p>
        )}

        {/* STEP 1 — E-mail */}
        {step === 1 && (
          <form onSubmit={form1.handleSubmit(onStep1)} className="flex flex-col gap-[3vh]">
            <div className="flex flex-col gap-[0.7vh]">
              <label className={labelClass} style={labelStyle}>E-mail</label>
              <input
                {...form1.register('email', { required: true })}
                type="email"
                autoComplete="email"
                placeholder="Insira seu e-mail"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            {error && <p className="text-red-700 font-medium text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white font-extrabold rounded-[1.15vw] cursor-pointer w-full disabled:opacity-60"
              style={{ height: '7.3vh', fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}
            >
              {loading ? 'Enviando...' : 'Enviar Código'}
            </button>
          </form>
        )}

        {/* STEP 2 — Código */}
        {step === 2 && (
          <form onSubmit={form2.handleSubmit(onStep2)} className="flex flex-col gap-[3vh]">
            <div className="flex flex-col gap-[0.7vh]">
              <label className={labelClass} style={labelStyle}>Código recebido no e-mail</label>
              <input
                {...form2.register('token', { required: true })}
                autoComplete="off"
                placeholder="Cole o código aqui"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            {error && <p className="text-red-700 font-medium text-sm">{error}</p>}
            <button
              type="submit"
              className="bg-black text-white font-extrabold rounded-[1.15vw] cursor-pointer w-full"
              style={{ height: '7.3vh', fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}
            >
              Confirmar Código
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setMsg(''); setError('') }}
              className="text-black font-medium underline self-center text-sm"
            >
              Reenviar código
            </button>
          </form>
        )}

        {/* STEP 3 — Nova senha */}
        {step === 3 && (
          <form onSubmit={form3.handleSubmit(onStep3)} className="flex flex-col gap-[3vh]">
            <div className="flex flex-col gap-[0.7vh]">
              <label className={labelClass} style={labelStyle}>Nova Senha</label>
              <input
                {...form3.register('novaSenha', { required: true, minLength: 6 })}
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-[0.7vh]">
              <label className={labelClass} style={labelStyle}>Confirmar Senha</label>
              <input
                {...form3.register('confirmarSenha', { required: true })}
                type="password"
                autoComplete="new-password"
                placeholder="Confirme a nova senha"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            {error && <p className="text-red-700 font-medium text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white font-extrabold rounded-[1.15vw] cursor-pointer w-full disabled:opacity-60"
              style={{ height: '7.3vh', fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}
            >
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
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
