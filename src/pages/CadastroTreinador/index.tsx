import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { treinadorService } from '../../services/treinador.service'
import type { RegisterTreinadorPayload, GeneroEnum } from '../../types'

interface FormData {
  NomeCompleto: string
  Email: string
  Senha: string
  DataNascimento: string
  Genero: GeneroEnum
  Cpf: string
  AceiteTermoAdesao: boolean
  Cref: string
}

const GENEROS: { value: GeneroEnum; label: string }[] = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMININO', label: 'Feminino' },
]

export default function CadastroTreinadorPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(data: FormData) {
    setError('')
    setLoading(true)
    try {
      const payload: RegisterTreinadorPayload = {
        nomeCompleto: data.NomeCompleto,
        email: data.Email,
        senha: data.Senha,
        dataNascimento: new Date(data.DataNascimento).toISOString(),
        genero: data.Genero,
        cpf: data.Cpf,
        aceiteTermoAdesao: Boolean(data.AceiteTermoAdesao),
        cref: data.Cref,
      }
      await treinadorService.register(payload)
      navigate('/login', { state: { msg: 'Cadastro realizado! Aguarde aprovação do administrador.' } })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; errors?: Record<string, string[]> } } }
      const detail = e.response?.data?.detail
      const firstError = e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat()[0]
        : null
      setError(detail || firstError || 'Erro ao criar conta. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "bg-black rounded-[1.15vw] text-[#94e400] font-medium placeholder:text-[#94e400]/60 outline-none w-full"
  const inputStyle = { height: '6.5vh', padding: '0 1.5vw', fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }
  const labelClass = "text-black font-medium"
  const labelStyle = { fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)' }

  return (
    <div className="min-h-screen bg-[#0d100e] flex items-center justify-center font-[Poppins,sans-serif] py-8">
      <div className="flex overflow-hidden rounded-[1.3vw] shadow-2xl bg-[#353b37]" style={{ width: '86.7vw' }}>
        {/* Info */}
        <div className="flex flex-col justify-center items-center gap-[4vh]" style={{ width: '40%', padding: '4% 6%' }}>
          <h2 className="text-white font-bold text-center leading-[1.15] tracking-[-0.02em]" style={{ fontSize: 'clamp(1.8rem, 2.8vw, 3.5rem)' }}>
            Seja um Treinador Treinu
          </h2>
          <p className="text-white/70 font-medium text-center leading-[1.6]" style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1.3rem)' }}>
            Após o cadastro, um administrador irá aprovar sua conta antes de você acessar a plataforma.
          </p>
          <Link to="/login" className="text-[#94e400] font-medium underline" style={{ fontSize: 'clamp(0.875rem, 1vw, 1.1rem)' }}>
            Já tenho uma conta
          </Link>
        </div>

        {/* Formulário */}
        <div className="flex flex-col bg-[#94e400] shadow-[-5px_0_6px_rgba(0,0,0,0.25)]" style={{ width: '60%', padding: '4% 6%' }}>
          <h1 className="text-black font-bold leading-[1.1] tracking-[-0.02em] mb-[4vh]" style={{ fontSize: 'clamp(1.8rem, 2.8vw, 3.5rem)' }}>
            Cadastro de Treinador
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[2.5vh]">
            <div className="grid grid-cols-2 gap-[2vw]">
              <div className="flex flex-col gap-[0.7vh] col-span-2">
                <label className={labelClass} style={labelStyle}>Nome Completo</label>
                <input {...register('NomeCompleto', { required: true })} placeholder="Seu nome completo" className={inputClass} style={inputStyle} />
                {errors.NomeCompleto && <span className="text-red-700 text-xs">Campo obrigatório</span>}
              </div>

              <div className="flex flex-col gap-[0.7vh]">
                <label className={labelClass} style={labelStyle}>E-mail</label>
                <input {...register('Email', { required: true })} type="email" placeholder="seu@email.com" className={inputClass} style={inputStyle} />
                {errors.Email && <span className="text-red-700 text-xs">Campo obrigatório</span>}
              </div>

              <div className="flex flex-col gap-[0.7vh]">
                <label className={labelClass} style={labelStyle}>Senha</label>
                <input {...register('Senha', { required: true, minLength: 6 })} type="password" placeholder="Mínimo 6 caracteres" className={inputClass} style={inputStyle} />
                {errors.Senha && <span className="text-red-700 text-xs">Mínimo 6 caracteres</span>}
              </div>

              <div className="flex flex-col gap-[0.7vh]">
                <label className={labelClass} style={labelStyle}>CPF</label>
                <input
                  {...register('Cpf', {
                    required: 'CPF obrigatório',
                    pattern: { value: /^\d{11}$/, message: 'CPF deve ter 11 dígitos (apenas números)' },
                  })}
                  placeholder="00000000000"
                  maxLength={11}
                  className={inputClass}
                  style={inputStyle}
                />
                {errors.Cpf && <span className="text-red-700 text-xs">{errors.Cpf.message}</span>}
              </div>

              <div className="flex flex-col gap-[0.7vh]">
                <label className={labelClass} style={labelStyle}>CREF</label>
                <input {...register('Cref', { required: true })} placeholder="CREF-12345" className={inputClass} style={inputStyle} />
                {errors.Cref && <span className="text-red-700 text-xs">CREF obrigatório</span>}
              </div>

              <div className="flex flex-col gap-[0.7vh]">
                <label className={labelClass} style={labelStyle}>Data de Nascimento</label>
                <input {...register('DataNascimento', { required: true })} type="date" className={`${inputClass} [color-scheme:dark]`} style={inputStyle} />
                {errors.DataNascimento && <span className="text-red-700 text-xs">Campo obrigatório</span>}
              </div>

              <div className="flex flex-col gap-[0.7vh]">
                <label className={labelClass} style={labelStyle}>Gênero</label>
                <select {...register('Genero', { required: true })} className={`${inputClass} [color-scheme:dark]`} style={inputStyle}>
                  <option value="">Selecione</option>
                  {GENEROS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                {errors.Genero && <span className="text-red-700 text-xs">Campo obrigatório</span>}
              </div>

              <div className="flex items-center gap-3 col-span-2">
                <input {...register('AceiteTermoAdesao', { required: true })} type="checkbox" id="termo" className="w-5 h-5 accent-black" />
                <label htmlFor="termo" className="text-black font-medium text-sm">Aceito os termos de adesão</label>
                {errors.AceiteTermoAdesao && <span className="text-red-700 text-xs">Obrigatório</span>}
              </div>
            </div>

            {error && <p className="text-red-700 font-medium text-sm">{error}</p>}

            <button type="submit" disabled={loading} className="bg-black text-white font-extrabold rounded-[1.15vw] cursor-pointer w-full disabled:opacity-60 mt-[1vh]" style={{ height: '7.3vh', fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>
              {loading ? 'Cadastrando...' : 'Criar Conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
