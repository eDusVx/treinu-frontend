import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { useAuth } from '../../hooks'

interface LoginForm {
  Email: string
  Senha?: string
}

export default function LoginPage() {
  const { register, handleSubmit, getValues } = useForm<LoginForm>()
  const { saveSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loginMode, setLoginMode] = useState<'senha' | 'codigo'>('senha')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const state = location.state as { toast?: string } | null
    if (state?.toast) {
      setToast(state.toast)
      window.history.replaceState({}, '')
      const timer = setTimeout(() => setToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [])

  const [showCodeModal, setShowCodeModal] = useState(false)

  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))

  async function onSubmit(data: LoginForm) {
    if (loginMode === 'codigo') return

    setError('')
    setLoading(true)
    try {
      const tokens = await authService.login(data.Email, data.Senha!)
      const user = saveSession(tokens)
      if (!user) {
        setError('Token retornado pelo servidor é inválido (sem identidade ou perfil).')
        return
      }

      if (user.role === 'ADMIN') navigate('/admin/dashboard')
      else if (user.role === 'TREINADOR') navigate('/treinador/dashboard')
      else navigate('/aluno/dashboard')

    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      if (e.response?.status === 401) setError('E-mail ou senha inválidos.')
      else if (e.response?.data?.detail) setError(e.response.data.detail)
      else setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function requestCode() {
    const email = getValues('Email')

    if (!email) {
      setError('Digite seu e-mail primeiro.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await authService.solicitarCodigoLogin(email)
      setShowCodeModal(true)
    } catch {
      setError('Erro ao enviar código.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCodeLogin() {
    const email = getValues('Email')

    setLoading(true)
    setError('')

    try {
      const finalCode = otp.join('')
      const tokens = await authService.loginCodigo(email, finalCode)
      const user = saveSession(tokens)
      if (!user) {
        setError('Token retornado pelo servidor é inválido (sem identidade ou perfil).')
        return
      }

      if (user.role === 'ADMIN') navigate('/admin/dashboard')
      else if (user.role === 'TREINADOR') navigate('/treinador/dashboard')
      else navigate('/aluno/dashboard')

    } catch {
      setError('Código inválido.')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const value = e.target.value.replace(/[^0-9]/g, '')
    if (!value) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus()
      }
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)
    if (!pasted) return
    const newOtp = [...otp]
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] ?? ''
    }
    setOtp(newOtp)
    const lastFilled = Math.min(pasted.length, 5)
    inputsRef.current[lastFilled]?.focus()
  }


  return (
    <div className="min-h-screen bg-[#0d100e] flex items-center justify-center font-[Poppins,sans-serif]">
      <div
        className="relative flex overflow-hidden rounded-[1.3vw] shadow-2xl bg-[#353b37]"
        style={{ width: '86.7vw', height: '83.5vh' }}
      >
        {/* Lado esquerdo */}
        <div
          className="flex flex-col justify-between bg-[#94e400] shadow-[5px_0_6px_rgba(0,0,0,0.25)]"
          style={{ width: '50%', padding: '2% 5% 5%' }}
        >
          <div className="flex flex-col items-center gap-[1vh]">
            <img src="/assets/logo-preta.svg" alt="Treinu" style={{ width: 'clamp(48px, 4.5vw, 68px)', height: 'clamp(48px, 4.5vw, 68px)' }} />
            <h1
              className="text-black text-center font-bold leading-[1.1] tracking-[-0.02em] w-full"
              style={{ fontSize: 'clamp(2rem, 3.906vw, 4.688rem)' }}
            >
              Faça seu Login
            </h1>

            {/* SWITCH (ADICIONADO) */}
            <div className="flex border-[0.5vh] bg-[#1b1b1b] rounded-[0.9vw] w-fit mt-[2vh]">
              <button
                type="button"
                onClick={() => setLoginMode('senha')}
                className={`px-[2vw] py-[1vh] rounded-tl-[0.7vw] rounded-bl-[0.7vw] font-bold transition ${
                  loginMode === 'senha'
                    ? 'bg-[#94e400] text-black'
                    : 'text-white'
                }`}
              >
                Login por senha
              </button>

              <button
                type="button"
                onClick={() => setLoginMode('codigo')}
                className={`px-[2vw] py-[1vh] rounded-tr-[0.7vw] rounded-br-[0.7vw] font-bold transition ${
                  loginMode === 'codigo'
                    ? 'bg-[#94e400] text-black'
                    : 'text-white'
                }`}
              >
                Login por código
              </button>
            </div>
          </div>

          <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[2vh]">
            <div className="flex flex-col gap-[4.1vh]">

              {/* EMAIL */}
              <div className="flex flex-col gap-[0.7vh]">
                <label className="text-black font-medium" style={{ fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }}>
                  E-mail
                </label>
                <input
                  {...register('Email', { required: true })}
                  type="email"
                  placeholder="Insira seu e-mail"
                  className="bg-black rounded-[1.15vw] text-[#94e400] font-medium placeholder:text-[#94e400]/60 outline-none w-full"
                  style={{ height: '7.3vh', padding: '0 1.5vw', fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }}
                />
              </div>

              {/* SENHA (SÓ NO MODO SENHA) */}
              {loginMode === 'senha' && (
                <div className="flex flex-col gap-[0.7vh]">
                  <label className="text-black font-medium" style={{ fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }}>
                    Senha
                  </label>
                  <input
                    {...register('Senha', { required: true })}
                    type="password"
                    placeholder="Insira sua senha"
                    className="bg-black rounded-[1.15vw] text-[#94e400] font-medium placeholder:text-[#94e400]/60 outline-none w-full"
                    style={{ height: '7.3vh', padding: '0 1.5vw', fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }}
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-700 font-medium text-sm text-center">{error}</p>
            )}

            <Link
              to="/recuperar-senha"
              className="text-black font-medium underline self-center cursor-pointer mb-[2vh]"
              style={{ fontSize: 'clamp(0.8rem, 1.042vw, 1.25rem)' }}
            >
              Esqueci minha senha
            </Link>
          </form>

          {/* BOTÃO DINÂMICO */}
          <div className="flex justify-center">
            {loginMode === 'senha' ? (
              <button
                type="submit"
                form="login-form"
                disabled={loading}
                className="bg-black text-white font-extrabold rounded-[1.15vw] cursor-pointer w-[65.4%] disabled:opacity-60"
                style={{ height: '7.5vh', fontSize: 'clamp(1.125rem, 2.083vw, 2rem)' }}
              >
                {loading ? 'Entrando...' : 'Login'}
              </button>
            ) : (
              <button
                type="button"
                onClick={requestCode}
                disabled={loading}
                className="bg-black text-white font-extrabold rounded-[1.15vw] cursor-pointer w-[65.4%] disabled:opacity-60"
                style={{ height: '7.5vh', fontSize: 'clamp(1.125rem, 2.083vw, 2rem)' }}
              >
                {loading ? 'Enviando...' : 'Solicitar código'}
              </button>
            )}
          </div>
        </div>

        {/* Lado direito */}
        <div
          className="flex flex-col justify-between items-center relative"
          style={{width: '50%', padding: '5% 5%' }}
        >
          <img src="/assets/crescent-moon.svg" alt="" aria-hidden="true" className="absolute top-[3%] right-[4%]" style={{ width: 'clamp(36px, 3.5vw, 56px)', height: 'clamp(36px, 3.5vw, 56px)' }} />
          <h2
            className="text-white font-bold text-center leading-[1.15] tracking-[-0.02em]"
            style={{ fontSize: 'clamp(2rem, 3.906vw, 4.688rem)' }}
          >
            Ainda não tem uma conta?
          </h2>

          <div className="flex flex-col items-center gap-[4vh]">
            <p
              className="text-white font-medium text-center leading-[1.5]"
              style={{ fontSize: 'clamp(1rem, 1.667vw, 2rem)' }}
            >
              Clique no botão abaixo para<br />
              registrar suas informações e criar<br />
              sua conta de <strong className='uppercase text-[#94e400]'>treinador</strong> no Treinu
            </p>
          </div>

          <div className="flex flex-col items-center gap-[4vh] w-[65.4%]">
            <Link
              to="/cadastro/treinador"
              className="bg-[#94e400] text-black font-extrabold rounded-[1.15vw] cursor-pointer w-full flex items-center justify-center"
              style={{ height: '7.5vh', fontSize: 'clamp(1rem, 1.8vw, 2rem)' }}
            >
              Cadastro
            </Link>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-start gap-3 bg-[#1a1f1b] border border-[#94e400]/30 text-white px-5 py-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-sm">
          <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#94e400] flex items-center justify-center">
            <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
              <path d="M1 4L4 7L10 1" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[#94e400] font-bold text-sm">Sucesso</span>
            <span className="text-white/80 text-sm leading-snug">{toast}</span>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-[#1a1a1a] p-8 rounded-xl flex flex-col gap-4 w-[35%]">
            <h3 className="text-white text-xl font-bold text-center">
              Digite o código enviado
            </h3>

            <div className="flex justify-center gap-[0.8vw]">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={otp[index]}
                  className="bg-black text-[#94e400] rounded-[0.5vw] text-center font-bold outline-none"
                  style={{
                    width: '3vw',
                    height: '5vh',
                    fontSize: 'clamp(1rem, 1.2vw, 1.5rem)'
                  }}
                  onChange={(e) => handleOtpChange(e, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onPaste={handleOtpPaste}
                  ref={(el) => {
                    if (el) inputsRef.current[index] = el;
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleCodeLogin}
              className="bg-[#94e400] text-black py-3 rounded-lg font-bold"
            >
              Confirmar código
            </button>

            <button
              onClick={() => setShowCodeModal(false)}
              className="text-white underline text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}