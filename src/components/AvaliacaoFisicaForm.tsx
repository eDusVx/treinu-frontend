import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ClipboardList } from 'lucide-react'
import type {
  AvaliacaoFisicaCompleta,
  AvaliacaoPayload,
  ChaveMedidaEnum,
  ClassificacaoIMC,
} from '../types'
import { dateInputParaIso, extractError } from '../utils'

const MEDIDAS: { value: ChaveMedidaEnum; label: string }[] = [
  { value: 'BRACO_ESQUERDO', label: 'Braço E.' },
  { value: 'BRACO_DIREITO', label: 'Braço D.' },
  { value: 'PERNA_ESQUERDA', label: 'Perna E.' },
  { value: 'PERNA_DIREITA', label: 'Perna D.' },
  { value: 'CINTURA', label: 'Cintura' },
  { value: 'QUADRIL', label: 'Quadril' },
  { value: 'PEITO', label: 'Peito' },
  { value: 'PANTURRILHA_ESQUERDA', label: 'Panturrilha E.' },
  { value: 'PANTURRILHA_DIREITA', label: 'Panturrilha D.' },
  { value: 'PESCOCO', label: 'Pescoço' },
  { value: 'OMBROS', label: 'Ombros' },
]

const CLASSIFICACAO_LABEL: Record<ClassificacaoIMC, string> = {
  ABAIXO_DO_PESO: 'Abaixo do peso',
  PESO_NORMAL: 'Peso normal',
  SOBREPESO: 'Sobrepeso',
  OBESIDADE_GRAU_I: 'Obesidade grau I',
  OBESIDADE_GRAU_II: 'Obesidade grau II',
  OBESIDADE_GRAU_III: 'Obesidade grau III',
  OUTRO: 'Outro',
}

interface AvaliacaoForm {
  data: string
  altura: number
  peso: number
  // Campo opcional — 0-100 (%). Vazio = não enviar.
  percentualGordura: number | ''
  medidas: Partial<Record<ChaveMedidaEnum, number | ''>>
}

interface Props {
  /** Função que envia ao backend e retorna o resultado calculado (com IMC). */
  onSubmit: (payload: AvaliacaoPayload) => Promise<AvaliacaoFisicaCompleta | undefined>
  /** Valores iniciais (ex.: pré-preencher altura/medidas anteriores). */
  preencherCom?: Partial<AvaliacaoFisicaCompleta>
  /** Mensagem de erro genérica caso o backend não envie detail. */
  mensagemErroPadrao?: string
  /** Texto do botão de submit. */
  textoBotao?: string
  /** Render extra acima do form (ex.: dropdown de aluno no fluxo do treinador). */
  extraAcima?: React.ReactNode
}

export default function AvaliacaoFisicaForm({
  onSubmit,
  preencherCom,
  mensagemErroPadrao = 'Erro ao registrar avaliação.',
  textoBotao = 'Registrar avaliação',
  extraAcima,
}: Props) {
  const defaults: AvaliacaoForm = {
    data: new Date().toISOString().slice(0, 10),
    altura: preencherCom?.altura ?? 0,
    peso: preencherCom?.peso ?? 0,
    percentualGordura: preencherCom?.percentualGordura ?? '',
    medidas: Object.fromEntries(
      (preencherCom?.medidas ?? []).map((m) => [m.chave, m.valor]),
    ) as AvaliacaoForm['medidas'],
  }

  const form = useForm<AvaliacaoForm>({ defaultValues: defaults })
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<AvaliacaoFisicaCompleta | null>(null)

  async function enviar(data: AvaliacaoForm) {
    setErro('')
    setResultado(null)

    // Backend exige TODAS as 11 medidas (FluentValidation: .NotEmpty + .Must todas presentes).
    // Validamos client-side antes de enviar para evitar 400 com mensagem genérica.
    const faltando = MEDIDAS.filter((m) => {
      const v = data.medidas?.[m.value]
      return v === '' || v == null || Number.isNaN(Number(v)) || Number(v) <= 0
    })
    if (faltando.length > 0) {
      setErro(
        `Preencha todas as ${MEDIDAS.length} medidas (faltando: ${faltando.map((f) => f.label).join(', ')}).`,
      )
      return
    }

    try {
      const medidasArr = MEDIDAS.map((m) => ({
        chave: m.value,
        valor: Number(data.medidas[m.value]),
      }))

      // Percentual de gordura é opcional — só inclui no payload se o usuário
      // preencheu com um valor válido (0 < x ≤ 100). Backend aceita null/ausente.
      // Importante: o DTO do backend usa [JsonPropertyName("gorduraCorporal")],
      // então o nome no body é `gorduraCorporal` (não `percentualGordura`).
      const gorduraNum = Number(data.percentualGordura)
      const gorduraValida =
        data.percentualGordura !== '' &&
        !Number.isNaN(gorduraNum) &&
        gorduraNum > 0 &&
        gorduraNum <= 100

      const payload: AvaliacaoPayload = {
        tipoAvaliacao: 'QUESTIONARIO',
        data: dateInputParaIso(data.data),
        altura: Number(data.altura),
        peso: Number(data.peso),
        medidas: medidasArr,
        ...(gorduraValida ? { gorduraCorporal: gorduraNum } : {}),
      }
      const res = await onSubmit(payload)
      if (res) setResultado(res)
      // Reseta valores numéricos mas mantém data padrão de hoje
      form.reset({
        data: new Date().toISOString().slice(0, 10),
        altura: 0,
        peso: 0,
        percentualGordura: '',
        medidas: {} as AvaliacaoForm['medidas'],
      })
    } catch (err) {
      setErro(extractError(err) || mensagemErroPadrao)
    }
  }

  const inputClass =
    'bg-[#0d100e] border border-white/10 rounded-xl text-white font-medium placeholder:text-white/30 outline-none w-full focus:border-[#94e400] transition-colors px-4 py-2.5 text-sm'
  const labelClass = 'text-white/70 font-medium text-xs uppercase tracking-wider'

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <ClipboardList size={20} className="text-[#94e400]" />
        <h2 className="text-white font-bold text-xl">Registrar avaliação</h2>
      </div>

      {extraAcima}

      <form onSubmit={form.handleSubmit(enviar)} className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Data</label>
          <input
            type="date"
            {...form.register('data', { required: true })}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Peso (kg)</label>
          <input
            type="number"
            step="0.1"
            {...form.register('peso', { required: true, valueAsNumber: true })}
            className={inputClass}
            placeholder="78.0"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Altura (m)</label>
          <input
            type="number"
            step="0.01"
            {...form.register('altura', { required: true, valueAsNumber: true })}
            className={inputClass}
            placeholder="1.75"
          />
          <span className="text-white/40 text-[11px]">
            Em metros (ex: 1.75 ou 1.81). Não use centímetros.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            % de gordura <span className="text-white/40 normal-case">(opcional)</span>
          </label>
          <input
            type="number"
            step="any"
            min="0"
            max="100"
            {...form.register('percentualGordura', { valueAsNumber: false })}
            className={inputClass}
            placeholder="Ex: 18.5"
          />
          <span className="text-white/40 text-[11px]">
            Entre 0 e 100. Deixe em branco se não souber.
          </span>
        </div>

        <div className="col-span-2 mt-3">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">Medidas (cm)</h3>
            <span className="text-white/40 text-[11px]">
              Todas as {MEDIDAS.length} medidas são obrigatórias.
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MEDIDAS.map((m) => (
              <div key={m.value} className="flex flex-col gap-1">
                <label className={labelClass}>
                  {m.label} <span className="text-[#94e400]">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...form.register(`medidas.${m.value}` as const, {
                    required: true,
                    valueAsNumber: true,
                    min: 0.1,
                  })}
                  className={inputClass}
                  placeholder="0.0"
                />
              </div>
            ))}
          </div>
        </div>

        {erro && <p className="col-span-2 text-red-400 text-sm">{erro}</p>}

        <div className="col-span-2">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-[#94e400] text-black font-extrabold rounded-full px-8 py-3 disabled:opacity-60 cursor-pointer hover:bg-[#a4f400]"
          >
            {form.formState.isSubmitting ? 'Salvando...' : textoBotao}
          </button>
        </div>
      </form>

      {resultado && (
        <div className="mt-6 bg-[#0d100e] border border-[#94e400]/30 rounded-2xl p-5">
          <h3 className="text-[#94e400] font-bold text-sm uppercase tracking-wider mb-3">
            Avaliação salva ✓
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-white/50 text-xs uppercase">Peso</span>
              <p className="text-white font-bold text-2xl">
                {resultado.peso}
                <span className="text-sm ml-1">kg</span>
              </p>
            </div>
            <div>
              <span className="text-white/50 text-xs uppercase">Altura</span>
              <p className="text-white font-bold text-2xl">
                {resultado.altura}
                <span className="text-sm ml-1">m</span>
              </p>
            </div>
            <div>
              <span className="text-white/50 text-xs uppercase">IMC</span>
              <p className="text-white font-bold text-2xl">{resultado.imc?.toFixed?.(1)}</p>
            </div>
            <div>
              <span className="text-white/50 text-xs uppercase">Classificação</span>
              <p className="text-[#94e400] font-bold text-sm mt-2">
                {CLASSIFICACAO_LABEL[resultado.classificacao] ?? resultado.classificacao}
              </p>
            </div>
            {resultado.percentualGordura != null && (
              <div>
                <span className="text-white/50 text-xs uppercase">% Gordura</span>
                <p className="text-white font-bold text-2xl">
                  {resultado.percentualGordura}
                  <span className="text-sm ml-1">%</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
