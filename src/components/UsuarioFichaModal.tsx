import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  Calendar,
  Dumbbell,
  History,
  Mail,
  Minus,
  Phone,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import type {
  UsuarioCompleto,
  AlunoDtoCompleto,
  TreinadorDtoCompleto,
  CadastrarMetaPayload,
  ClassificacaoIMC,
  EvolucaoFisicaResponse,
  EvolucaoMedida,
  MetaDto,
  TipoContatoEnum,
  TipoMetaEnum,
  PlataformaRedeSocialEnum,
  ContatoPayload,
  EspecializacaoPayload,
  AvaliacaoPayload,
  AvaliacaoFisicaCompleta,
  ExecucaoTreinoDto,
  TreinoDto,
} from '../types'
import { isAluno, isTreinador } from '../types'
import { extractError } from '../utils'
import { alunoService } from '../services/aluno.service'
import { treinadorService } from '../services/treinador.service'
import { execucaoTreinoService } from '../services/execucaoTreino.service'
import { treinosService } from '../services/treinos.service'
import { useAuth } from '../hooks'
import AvaliacaoFisicaForm from './AvaliacaoFisicaForm'
import { formatarDataPtBr, formatHora } from '../utils'

const OBJETIVO_LABEL: Record<string, string> = {
  EMAGRECIMENTO: 'Emagrecimento',
  HIPERTROFIA: 'Hipertrofia',
  SAUDE: 'Saúde',
  PERFORMANCE: 'Performance',
  REABILITACAO: 'Reabilitação',
  OUTROS: 'Outros',
}

const CLASSIFICACAO_LABEL: Record<ClassificacaoIMC, string> = {
  ABAIXO_DO_PESO: 'Abaixo do peso',
  PESO_NORMAL: 'Peso normal',
  SOBREPESO: 'Sobrepeso',
  OBESIDADE_GRAU_I: 'Obesidade I',
  OBESIDADE_GRAU_II: 'Obesidade II',
  OBESIDADE_GRAU_III: 'Obesidade III',
  OUTRO: 'Outro',
}

const TIPOS_CONTATO: { value: TipoContatoEnum; label: string }[] = [
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'REDE_SOCIAL', label: 'Rede Social' },
  { value: 'SITE', label: 'Site' },
]

interface ContatoForm {
  tipo: TipoContatoEnum | ''
  valor: string
  descricao?: string
  plataforma?: PlataformaRedeSocialEnum | ''
}

interface EspecForm {
  especializacao: string
}

interface Props {
  usuario: UsuarioCompleto
  onClose: () => void
  onUpdated?: (u: UsuarioCompleto) => void
}

export default function UsuarioFichaModal({ usuario: usuarioInicial, onClose, onUpdated }: Props) {
  const { user } = useAuth()
  const [usuario, setUsuario] = useState<UsuarioCompleto>(usuarioInicial)
  const [aba, setAba] = useState<
    'visao' | 'contatos' | 'avaliacoes' | 'especializacoes' | 'execucoes' | 'metas' | 'evolucao'
  >('visao')

  const podeEditar =
    user?.role === 'ADMIN' ||
    (user?.role === 'TREINADOR' && isAluno(usuario))

  function patch(novo: UsuarioCompleto) {
    setUsuario(novo)
    onUpdated?.(novo)
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#1c1f1d] border border-white/10 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-full bg-[#94e400]/15 border-2 border-[#94e400] text-[#94e400] font-bold text-2xl flex items-center justify-center shrink-0">
              {usuario.nomeCompleto?.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <div>
              <h2 className="text-white font-bold text-2xl">{usuario.nomeCompleto}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-[#94e400]/10 text-[#94e400] text-xs font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                  {usuario.perfil}
                </span>
                <span
                  className={`text-xs font-semibold px-3 py-0.5 rounded-full ${
                    usuario.ativo ? 'bg-green-500/10 text-green-300' : 'bg-yellow-500/10 text-yellow-300'
                  }`}
                >
                  {usuario.ativo ? 'Ativo' : 'Pendente'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white cursor-pointer p-1">
            <X size={22} />
          </button>
        </div>

        {podeEditar && (
          <div className="px-6 pt-4 flex gap-1 flex-wrap border-b border-white/5">
            {(
              [
                { v: 'visao', l: 'Visão geral' },
                { v: 'contatos', l: `Contatos (${usuario.contato?.length ?? 0})` },
                ...(isAluno(usuario)
                  ? ([
                      { v: 'avaliacoes', l: `Avaliações (${usuario.avaliacaoFisica?.length ?? 0})` },
                      { v: 'execucoes', l: 'Execuções' },
                      { v: 'metas', l: 'Metas' },
                      { v: 'evolucao', l: 'Evolução' },
                    ] as const)
                  : []),
                ...(isTreinador(usuario)
                  ? ([
                      {
                        v: 'especializacoes',
                        l: `Especializações (${usuario.especializacoes?.length ?? 0})`,
                      },
                    ] as const)
                  : []),
              ] as { v: typeof aba; l: string }[]
            ).map((t) => (
              <button
                key={t.v}
                onClick={() => setAba(t.v)}
                className={`px-3 py-2 text-xs font-semibold cursor-pointer border-b-2 ${
                  aba === t.v ? 'text-[#94e400] border-[#94e400]' : 'text-white/60 border-transparent'
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>
        )}

        {(!podeEditar || aba === 'visao') && (
          <>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <Field icon={Mail} label="E-mail" value={usuario.email} />
              <Field
                icon={Calendar}
                label="Data de nascimento"
                value={usuario.dataNascimento ? formatarDataPtBr(usuario.dataNascimento) : null}
              />
              <Field label="Gênero" value={usuario.genero} />
              <Field label="CPF" value={usuario.cpf} />
              {isAluno(usuario) && (
                <Field
                  label="Objetivo"
                  value={OBJETIVO_LABEL[usuario.objetivo] ?? usuario.objetivo}
                />
              )}
              {isTreinador(usuario) && <Field icon={Award} label="CREF" value={usuario.cref} />}
            </div>

            {!podeEditar && (
              <>
                {isTreinador(usuario) && <SectionEspec lista={usuario.especializacoes ?? []} />}
                <SectionContatos lista={usuario.contato ?? []} />
                {isAluno(usuario) && <SectionAvaliacoes lista={usuario.avaliacaoFisica ?? []} />}
              </>
            )}
          </>
        )}

        {podeEditar && aba === 'contatos' && (
          <ContatosTab
            usuario={usuario}
            onChange={patch}
          />
        )}

        {podeEditar && aba === 'avaliacoes' && isAluno(usuario) && (
          <AvaliacoesTab usuario={usuario} onChange={patch} />
        )}

        {podeEditar && aba === 'especializacoes' && isTreinador(usuario) && (
          <EspecializacoesTab usuario={usuario} onChange={patch} />
        )}

        {podeEditar && aba === 'execucoes' && isAluno(usuario) && (
          <ExecucoesTab usuario={usuario} />
        )}

        {podeEditar && aba === 'metas' && isAluno(usuario) && (
          <MetasTab alunoId={usuario.id} />
        )}

        {podeEditar && aba === 'evolucao' && isAluno(usuario) && (
          <EvolucaoFisicaTab alunoId={usuario.id} />
        )}
      </div>
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Mail
  label: string
  value?: string | number | null
}) {
  return (
    <div>
      <span className="text-white/40 text-[10px] uppercase tracking-wider flex items-center gap-1">
        {Icon && <Icon size={11} />} {label}
      </span>
      <p className="text-white font-medium text-sm mt-0.5">
        {value != null && value !== '' ? value : <span className="text-white/30">—</span>}
      </p>
    </div>
  )
}

/* ─── Visão (read-only) ──────────────────────────────────────────────────── */

function SectionContatos({ lista }: { lista: AlunoDtoCompleto['contato'] }) {
  return (
    <div className="px-6 pb-6">
      <div className="flex items-center gap-2 mb-3">
        <Phone size={16} className="text-[#94e400]" />
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Contatos</h3>
        <span className="text-white/40 text-xs">({lista.length})</span>
      </div>
      {lista.length === 0 ? (
        <p className="text-white/40 text-sm italic">Sem contatos cadastrados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {lista.map((c) => (
            <div key={c.id} className="bg-[#0d100e] border border-white/5 rounded-xl px-4 py-3">
              <span className="text-[#94e400] text-[10px] font-bold uppercase tracking-wider">
                {c.tipo}
                {c.plataforma ? ` · ${c.plataforma}` : ''}
              </span>
              <p className="text-white text-sm font-medium truncate">{c.valor}</p>
              {c.descricao && <p className="text-white/40 text-xs truncate">{c.descricao}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionEspec({ lista }: { lista: string[] }) {
  return (
    <div className="px-6 pb-6">
      <div className="flex items-center gap-2 mb-3">
        <Award size={16} className="text-[#94e400]" />
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
          Especializações
        </h3>
        <span className="text-white/40 text-xs">({lista.length})</span>
      </div>
      {lista.length === 0 ? (
        <p className="text-white/40 text-sm italic">Nenhuma especialização cadastrada.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {lista.map((e) => (
            <span
              key={e}
              className="bg-[#94e400]/10 text-[#94e400] text-xs font-semibold px-3 py-1 rounded-full"
            >
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionAvaliacoes({ lista }: { lista: AlunoDtoCompleto['avaliacaoFisica'] }) {
  const ordenadas = [...lista].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  )
  return (
    <div className="px-6 pb-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-[#94e400]" />
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
          Avaliações físicas
        </h3>
        <span className="text-white/40 text-xs">({ordenadas.length})</span>
      </div>
      {ordenadas.length === 0 ? (
        <p className="text-white/40 text-sm italic">Nenhuma avaliação registrada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ordenadas.map((av) => (
            <div
              key={av.id}
              className="bg-[#0d100e] border border-white/5 rounded-xl p-3 grid grid-cols-2 md:grid-cols-5 gap-3"
            >
              <div>
                <span className="text-white/40 text-[10px] uppercase">Data</span>
                <p className="text-white text-sm font-medium">
                  {formatarDataPtBr(av.data)}
                </p>
              </div>
              <div>
                <span className="text-white/40 text-[10px] uppercase">Peso</span>
                <p className="text-white text-sm font-medium">{av.peso} kg</p>
              </div>
              <div>
                <span className="text-white/40 text-[10px] uppercase">Altura</span>
                <p className="text-white text-sm font-medium">{av.altura} m</p>
              </div>
              <div>
                <span className="text-white/40 text-[10px] uppercase">IMC</span>
                <p className="text-white text-sm font-medium">{av.imc?.toFixed?.(1)}</p>
              </div>
              <div>
                <span className="text-white/40 text-[10px] uppercase">Classificação</span>
                <p className="text-[#94e400] text-xs font-medium">
                  {CLASSIFICACAO_LABEL[av.classificacao] ?? av.classificacao}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Tabs editáveis (Admin/Treinador) ──────────────────────────────────── */

function ContatosTab({
  usuario,
  onChange,
}: {
  usuario: UsuarioCompleto
  onChange: (u: UsuarioCompleto) => void
}) {
  const form = useForm<ContatoForm>()
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const tipoSel = form.watch('tipo')

  async function adicionar(data: ContatoForm) {
    setMsg('')
    setErro('')
    if (!data.tipo) {
      setErro('Selecione o tipo de contato.')
      return
    }
    if (data.tipo === 'REDE_SOCIAL' && !data.plataforma) {
      setErro('Plataforma é obrigatória para Rede Social.')
      return
    }
    try {
      const payload: ContatoPayload = {
        tipo: data.tipo,
        valor: data.valor,
        principal: false,
      }
      if (data.descricao) payload.descricao = data.descricao
      if (data.tipo === 'REDE_SOCIAL' && data.plataforma) payload.plataforma = data.plataforma

      if (isAluno(usuario)) {
        const dto = await alunoService.adicionarContato(usuario.id, payload)
        onChange(dto)
      } else {
        const dto = await treinadorService.adicionarContato(usuario.id, payload)
        onChange(dto)
      }
      setMsg('Contato adicionado!')
      form.reset({ tipo: '', valor: '', descricao: '', plataforma: '' })
    } catch (err) {
      setErro(extractError(err) || 'Erro ao adicionar contato.')
    }
  }

  async function remover(id: string) {
    setRemovendoId(id)
    setErro('')
    try {
      if (isAluno(usuario)) {
        await alunoService.removerContato(usuario.id, id)
        onChange({ ...usuario, contato: (usuario.contato ?? []).filter((c) => c.id !== id) })
      } else {
        await treinadorService.removerContato(usuario.id, id)
        onChange({ ...usuario, contato: (usuario.contato ?? []).filter((c) => c.id !== id) })
      }
      setMsg('Contato removido.')
    } catch (err) {
      setErro(extractError(err) || 'Erro ao remover contato.')
    } finally {
      setRemovendoId(null)
    }
  }

  const inputClass =
    'bg-[#0d100e] border border-white/10 rounded-xl text-white text-sm outline-none w-full focus:border-[#94e400] px-3 py-2'

  const contatos = usuario.contato ?? []

  return (
    <div className="p-6">
      {contatos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
          {contatos.map((c) => (
            <div
              key={c.id}
              className="bg-[#0d100e] border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div className="min-w-0">
                <span className="text-[#94e400] text-[10px] font-bold uppercase tracking-wider">
                  {c.tipo}
                  {c.plataforma ? ` · ${c.plataforma}` : ''}
                </span>
                <p className="text-white text-sm font-medium truncate">{c.valor}</p>
                {c.descricao && <p className="text-white/40 text-xs truncate">{c.descricao}</p>}
              </div>
              <button
                onClick={() => remover(c.id)}
                disabled={removendoId === c.id}
                className="text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer p-2"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/40 text-sm italic mb-5">Sem contatos cadastrados.</p>
      )}

      <form onSubmit={form.handleSubmit(adicionar)} className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-3">
          <label className="text-[#94e400] text-[10px] font-bold uppercase">Tipo</label>
          <select
            {...form.register('tipo', { required: true })}
            className={`${inputClass} [color-scheme:dark]`}
          >
            <option value="">Selecione</option>
            {TIPOS_CONTATO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {tipoSel === 'REDE_SOCIAL' && (
          <div className="col-span-3">
            <label className="text-[#94e400] text-[10px] font-bold uppercase">Plataforma *</label>
            <select
              {...form.register('plataforma', { required: tipoSel === 'REDE_SOCIAL' })}
              className={`${inputClass} [color-scheme:dark]`}
            >
              <option value="">—</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="TWITTER">Twitter</option>
              <option value="EMAIL">E-mail</option>
            </select>
          </div>
        )}
        <div className={tipoSel === 'REDE_SOCIAL' ? 'col-span-4' : 'col-span-7'}>
          <label className="text-[#94e400] text-[10px] font-bold uppercase">Valor</label>
          <input
            {...form.register('valor', { required: true })}
            placeholder={
              tipoSel === 'TELEFONE'
                ? '(11) 99999-9999'
                : tipoSel === 'REDE_SOCIAL' || tipoSel === 'SITE'
                  ? 'https://...'
                  : ''
            }
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="col-span-2 bg-[#94e400] text-black font-bold rounded-xl px-3 py-2 hover:bg-[#a4f400] disabled:opacity-60 cursor-pointer text-xs"
        >
          <Plus size={14} className="inline" /> Adicionar
        </button>
        {msg && <p className="col-span-12 text-[#94e400] text-xs">{msg}</p>}
        {erro && <p className="col-span-12 text-red-400 text-xs">{erro}</p>}
      </form>
    </div>
  )
}

function AvaliacoesTab({
  usuario,
  onChange,
}: {
  usuario: AlunoDtoCompleto
  onChange: (u: AlunoDtoCompleto) => void
}) {
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [removendoId, setRemovendoId] = useState<string | null>(null)

  async function enviar(payload: AvaliacaoPayload): Promise<AvaliacaoFisicaCompleta | undefined> {
    setMsg('')
    setErro('')
    const dto = await alunoService.adicionarAvaliacao(usuario.id, payload)
    onChange(dto)
    setMsg('Avaliação registrada!')
    return dto.avaliacaoFisica?.[0]
  }

  async function remover(id: string) {
    setRemovendoId(id)
    setErro('')
    try {
      await alunoService.removerAvaliacao(usuario.id, id)
      onChange({
        ...usuario,
        avaliacaoFisica: (usuario.avaliacaoFisica ?? []).filter((a) => a.id !== id),
      })
      setMsg('Avaliação removida.')
    } catch (err) {
      setErro(extractError(err) || 'Erro ao remover avaliação.')
    } finally {
      setRemovendoId(null)
    }
  }

  const avaliacoes = [...(usuario.avaliacaoFisica ?? [])].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  )

  return (
    <div className="p-6">
      {avaliacoes.length > 0 ? (
        <div className="flex flex-col gap-2 mb-6">
          {avaliacoes.map((av) => (
            <div
              key={av.id}
              className="bg-[#0d100e] border border-white/5 rounded-xl p-3 grid grid-cols-6 gap-3 items-center"
            >
              <div>
                <span className="text-white/40 text-[10px] uppercase">Data</span>
                <p className="text-white text-sm font-medium">
                  {formatarDataPtBr(av.data)}
                </p>
              </div>
              <div>
                <span className="text-white/40 text-[10px] uppercase">Peso</span>
                <p className="text-white text-sm font-medium">{av.peso} kg</p>
              </div>
              <div>
                <span className="text-white/40 text-[10px] uppercase">Altura</span>
                <p className="text-white text-sm font-medium">{av.altura} m</p>
              </div>
              <div>
                <span className="text-white/40 text-[10px] uppercase">IMC</span>
                <p className="text-white text-sm font-medium">{av.imc?.toFixed?.(1)}</p>
              </div>
              <div>
                <span className="text-white/40 text-[10px] uppercase">Classificação</span>
                <p className="text-[#94e400] text-xs font-medium">
                  {CLASSIFICACAO_LABEL[av.classificacao] ?? av.classificacao}
                </p>
              </div>
              <button
                onClick={() => remover(av.id)}
                disabled={removendoId === av.id}
                className="text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer justify-self-end p-2"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/40 text-sm italic mb-6">Nenhuma avaliação registrada.</p>
      )}

      <AvaliacaoFisicaForm
        onSubmit={enviar}
        preencherCom={avaliacoes[0]}
        textoBotao="Registrar avaliação"
        mensagemErroPadrao="Erro ao registrar avaliação."
      />

      {msg && <p className="text-[#94e400] text-xs mt-3">{msg}</p>}
      {erro && <p className="text-red-400 text-xs mt-3">{erro}</p>}
    </div>
  )
}

function EspecializacoesTab({
  usuario,
  onChange,
}: {
  usuario: TreinadorDtoCompleto
  onChange: (u: TreinadorDtoCompleto) => void
}) {
  const form = useForm<EspecForm>()
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [removendoNome, setRemovendoNome] = useState<string | null>(null)

  async function adicionar(data: EspecForm) {
    setMsg('')
    setErro('')
    try {
      const payload: EspecializacaoPayload = { especializacao: data.especializacao.trim() }
      const dto = await treinadorService.adicionarEspecializacao(usuario.id, payload)
      onChange(dto)
      setMsg('Especialização adicionada!')
      form.reset()
    } catch (err) {
      setErro(extractError(err) || 'Erro ao adicionar especialização.')
    }
  }

  async function remover(nome: string) {
    setRemovendoNome(nome)
    setErro('')
    try {
      await treinadorService.removerEspecializacao(usuario.id, { especializacao: nome })
      onChange({
        ...usuario,
        especializacoes: (usuario.especializacoes ?? []).filter((e) => e !== nome),
      })
      setMsg('Especialização removida.')
    } catch (err) {
      setErro(extractError(err) || 'Erro ao remover especialização.')
    } finally {
      setRemovendoNome(null)
    }
  }

  const especs = usuario.especializacoes ?? []

  return (
    <div className="p-6">
      {especs.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-5">
          {especs.map((e) => (
            <span
              key={e}
              className="bg-[#94e400]/10 text-[#94e400] text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-2"
            >
              {e}
              <button
                onClick={() => remover(e)}
                disabled={removendoNome === e}
                className="text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-white/40 text-sm italic mb-5">Nenhuma especialização cadastrada.</p>
      )}

      <form onSubmit={form.handleSubmit(adicionar)} className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-[#94e400] text-[10px] font-bold uppercase">Nova especialização</label>
          <input
            {...form.register('especializacao', { required: true })}
            className="bg-[#0d100e] border border-white/10 rounded-xl text-white text-sm outline-none w-full focus:border-[#94e400] px-3 py-2"
            placeholder="Ex: Musculação"
          />
        </div>
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="bg-[#94e400] text-black font-extrabold rounded-full px-5 py-2 hover:bg-[#a4f400] disabled:opacity-60 cursor-pointer text-sm"
        >
          <Plus size={14} className="inline" /> Adicionar
        </button>
      </form>
      {msg && <p className="text-[#94e400] text-xs mt-2">{msg}</p>}
      {erro && <p className="text-red-400 text-xs mt-2">{erro}</p>}
    </div>
  )
}

/* ─── Execuções do aluno (histórico + detalhes) ─────────────────────────── */

function ExecucoesTab({ usuario }: { usuario: AlunoDtoCompleto }) {
  const [historico, setHistorico] = useState<ExecucaoTreinoDto[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [detalhes, setDetalhes] = useState<ExecucaoTreinoDto | null>(null)
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false)
  const [erroDetalhes, setErroDetalhes] = useState('')
  const [treinos, setTreinos] = useState<TreinoDto[]>([])
  // Token incrementado a cada nova requisição de detalhes — usado pra ignorar
  // respostas tardias de execuções que o usuário já fechou ou trocou.
  const detalhesReqIdRef = useRef(0)

  const carregar = () => {
    setLoading(true)
    setErro('')
    execucaoTreinoService
      .historico(usuario.id)
      .then((data) => setHistorico(Array.isArray(data) ? data : []))
      .catch((err) => setErro(extractError(err) || 'Não foi possível carregar o histórico.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    carregar()
    // Treinos do aluno usados pra resolver itemTreinoId → nome do exercício
    // dentro do modal de detalhes. Falha silenciosa.
    treinosService
      .listar({ alunoId: usuario.id })
      .then((data) => setTreinos(Array.isArray(data) ? data : []))
      .catch(() => setTreinos([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario.id])

  // itemTreinoId → { nome, ordem } — memoizado pra não rebuildar a cada render.
  const itensLookup = useMemo(() => {
    const map = new Map<string, { nome: string; ordem: number }>()
    for (const t of treinos) {
      for (const item of t.itens ?? []) {
        map.set(item.id, {
          nome: item.exercicio?.nome ?? 'Exercício',
          ordem: item.ordem,
        })
      }
    }
    return map
  }, [treinos])

  async function abrirDetalhes(ex: ExecucaoTreinoDto) {
    const reqId = ++detalhesReqIdRef.current
    setDetalhes(ex)
    setCarregandoDetalhes(true)
    setErroDetalhes('')
    try {
      const fresh = await execucaoTreinoService.detalhes(ex.id)
      // Se o usuário trocou de execução ou fechou o modal durante o fetch,
      // descarta o resultado pra não sobrescrever a UI atual.
      if (reqId !== detalhesReqIdRef.current) return
      setDetalhes(fresh)
    } catch (err) {
      if (reqId !== detalhesReqIdRef.current) return
      setErroDetalhes(extractError(err) || 'Não foi possível carregar os detalhes.')
    } finally {
      if (reqId === detalhesReqIdRef.current) setCarregandoDetalhes(false)
    }
  }

  function fecharDetalhes() {
    // Invalida qualquer fetch em flight.
    detalhesReqIdRef.current++
    setDetalhes(null)
    setCarregandoDetalhes(false)
    setErroDetalhes('')
  }

  const ordenadas = [...historico].sort(
    (a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime(),
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={16} className="text-[#94e400]" />
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
            Execuções de treino
          </h3>
          <span className="text-white/40 text-xs">({ordenadas.length})</span>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="text-[#94e400] hover:text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <p className="text-white/50 text-sm py-6 text-center">Carregando…</p>
      ) : erro ? (
        <p className="text-red-400 text-sm py-6 text-center">{erro}</p>
      ) : ordenadas.length === 0 ? (
        <p className="text-white/40 text-sm italic py-6 text-center">
          Nenhuma execução registrada por este aluno.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {ordenadas.map((ex) => {
            const qtd = ex.exercicios?.length ?? 0
            return (
              <button
                key={ex.id}
                onClick={() => abrirDetalhes(ex)}
                className="text-left bg-[#0d100e] border border-white/5 rounded-xl p-3 hover:border-[#94e400]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Dumbbell size={14} className="text-[#94e400]" />
                    <span className="text-white font-semibold text-sm">
                      {formatarDataPtBr(ex.dataInicio)}
                    </span>
                    {ex.concluido ? (
                      <span className="bg-[#94e400]/20 text-[#94e400] text-[10px] font-bold uppercase rounded-full px-2 py-0.5">
                        Concluído
                      </span>
                    ) : (
                      <span className="bg-yellow-400/20 text-yellow-300 text-[10px] font-bold uppercase rounded-full px-2 py-0.5">
                        Em andamento
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-white/60 text-xs">
                    <span>
                      {qtd} exercício{qtd === 1 ? '' : 's'}
                    </span>
                    {ex.notaFeedback != null && <span>Esforço: {ex.notaFeedback}/5</span>}
                  </div>
                </div>
                {ex.comentarioFeedback && (
                  <p className="text-white/50 text-xs italic mt-1 line-clamp-1">
                    "{ex.comentarioFeedback}"
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Sub-modal de detalhes da execução */}
      {detalhes && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-6"
          onClick={fecharDetalhes}
        >
          <div
            className="bg-[#1c1f1d] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-xl">Detalhes da execução</h3>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-white/60">
                    {formatarDataPtBr(detalhes.dataInicio)} · {formatHora(detalhes.dataInicio)}
                    {detalhes.dataFim && ` → ${formatHora(detalhes.dataFim)}`}
                  </span>
                  {carregandoDetalhes && <span className="text-white/40">atualizando…</span>}
                </div>
              </div>
              <button
                onClick={fecharDetalhes}
                className="text-white/60 hover:text-white cursor-pointer p-1"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {(detalhes.notaFeedback != null || detalhes.comentarioFeedback) && (
              <div className="bg-[#0d100e] border border-white/5 rounded-2xl p-4 mb-4">
                <span className="text-white/50 text-[10px] uppercase tracking-wider font-bold">
                  Feedback do aluno
                </span>
                {detalhes.notaFeedback != null && (
                  <p className="text-white text-sm mt-1">
                    Esforço:{' '}
                    <span className="text-[#94e400] font-bold">{detalhes.notaFeedback}/5</span>
                  </p>
                )}
                {detalhes.comentarioFeedback && (
                  <p className="text-white/70 text-sm italic mt-2">
                    "{detalhes.comentarioFeedback}"
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className="text-[#94e400]" />
              <h4 className="text-white font-semibold text-sm">Exercícios executados</h4>
              <span className="text-white/40 text-xs">
                ({detalhes.exercicios?.length ?? 0})
              </span>
            </div>

            {detalhes.exercicios && detalhes.exercicios.length > 0 ? (
              <div className="flex flex-col gap-2">
                {[...detalhes.exercicios]
                  .map((item) => ({ ...item, info: itensLookup.get(item.itemTreinoId) }))
                  .sort((a, b) => (a.info?.ordem ?? 999) - (b.info?.ordem ?? 999))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0d100e] border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-[#94e400]/15 text-[#94e400] font-bold text-xs flex items-center justify-center shrink-0">
                          {item.info?.ordem ?? '?'}
                        </span>
                        <span className="text-white text-sm font-medium truncate">
                          {item.info?.nome ?? 'Exercício removido'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-white text-sm font-semibold shrink-0">
                        <span>
                          {item.seriesRealizadas}×{item.repeticoesRealizadas}
                        </span>
                        <span className="text-[#94e400]">
                          {item.cargaUtilizada}
                          <span className="text-xs font-normal ml-0.5">kg</span>
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm text-center py-4">
                Nenhum exercício registrado.
              </p>
            )}

            {erroDetalhes && (
              <p className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3 mt-4">
                {erroDetalhes}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Tab Metas — listar + cadastrar (Treinador/Admin) ────────────────────── */

const TIPOS_META: { value: TipoMetaEnum; label: string; sufixo: string }[] = [
  { value: 'PESO', label: 'Peso', sufixo: 'kg' },
  { value: 'GORDURA', label: '% Gordura', sufixo: '%' },
  { value: 'CINTURA', label: 'Cintura', sufixo: 'cm' },
  { value: 'QUADRIL', label: 'Quadril', sufixo: 'cm' },
  { value: 'PEITO', label: 'Peito', sufixo: 'cm' },
  { value: 'BRACO_ESQUERDO', label: 'Braço esquerdo', sufixo: 'cm' },
  { value: 'BRACO_DIREITO', label: 'Braço direito', sufixo: 'cm' },
  { value: 'PERNA_ESQUERDA', label: 'Perna esquerda', sufixo: 'cm' },
  { value: 'PERNA_DIREITA', label: 'Perna direita', sufixo: 'cm' },
  { value: 'PANTURRILHA_ESQUERDA', label: 'Panturrilha esq.', sufixo: 'cm' },
  { value: 'PANTURRILHA_DIREITA', label: 'Panturrilha dir.', sufixo: 'cm' },
  { value: 'PESCOCO', label: 'Pescoço', sufixo: 'cm' },
  { value: 'OMBROS', label: 'Ombros', sufixo: 'cm' },
]

const TIPO_META_LABEL: Record<TipoMetaEnum, string> = Object.fromEntries(
  TIPOS_META.map((t) => [t.value, t.label]),
) as Record<TipoMetaEnum, string>

function MetasTab({ alunoId }: { alunoId: string }) {
  const [metas, setMetas] = useState<MetaDto[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CadastrarMetaPayload>({
    defaultValues: { tipo: 'PESO', valorAlvo: 0, dataLimite: '' },
  })
  const tipoSelecionado = watch('tipo')
  const sufixoForm = TIPOS_META.find((t) => t.value === tipoSelecionado)?.sufixo ?? ''

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const lista = await alunoService.listarMetas(alunoId)
      setMetas(Array.isArray(lista) ? lista : [])
    } catch (err) {
      setErro(extractError(err) || 'Não foi possível carregar as metas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alunoId])

  async function onSubmit(data: CadastrarMetaPayload) {
    setSalvando(true)
    setErro('')
    setMsg('')
    try {
      await alunoService.cadastrarMeta(alunoId, {
        tipo: data.tipo,
        valorAlvo: Number(data.valorAlvo),
        // Backend converte para UTC e exige > hoje
        dataLimite: new Date(data.dataLimite).toISOString(),
      })
      setMsg('Meta cadastrada!')
      reset({ tipo: 'PESO', valorAlvo: 0, dataLimite: '' })
      await carregar()
    } catch (err) {
      setErro(extractError(err) || 'Erro ao cadastrar meta.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-[#94e400]" />
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Cadastrar meta</h3>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="flex flex-col gap-1 md:col-span-5">
            <span className="text-white/60 text-[11px]">Tipo</span>
            <select
              {...register('tipo', { required: true })}
              className="bg-[#0d100e] border border-white/10 rounded-full px-3 h-[40px] text-white text-sm outline-none [color-scheme:dark]"
            >
              {TIPOS_META.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 md:col-span-3">
            <span className="text-white/60 text-[11px]">Valor alvo {sufixoForm && `(${sufixoForm})`}</span>
            <input
              {...register('valorAlvo', { required: true, min: 0.01, valueAsNumber: true })}
              type="number"
              step="any"
              min="0.01"
              placeholder="0"
              className="bg-[#0d100e] border border-white/10 rounded-full px-3 h-[40px] text-white text-sm outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-3">
            <span className="text-white/60 text-[11px]">Data limite</span>
            <input
              {...register('dataLimite', { required: true })}
              type="date"
              className="bg-[#0d100e] border border-white/10 rounded-full px-3 h-[40px] text-white text-sm outline-none [color-scheme:dark]"
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="md:col-span-1 bg-[#94e400] text-black font-bold rounded-full h-[40px] inline-flex items-center justify-center hover:bg-[#a4f400] disabled:opacity-60 cursor-pointer"
          >
            <Plus size={16} />
          </button>
          {(errors.valorAlvo || errors.dataLimite) && (
            <p className="md:col-span-12 text-red-400 text-xs">
              Preencha valor alvo (&gt;0) e data limite futura.
            </p>
          )}
          {msg && <p className="md:col-span-12 text-[#94e400] text-xs">{msg}</p>}
          {erro && <p className="md:col-span-12 text-red-400 text-xs">{erro}</p>}
        </form>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-[#94e400]" />
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Metas cadastradas</h3>
          <span className="text-white/40 text-xs">({metas.length})</span>
        </div>
        {loading ? (
          <p className="text-white/50 text-sm">Carregando...</p>
        ) : metas.length === 0 ? (
          <p className="text-white/40 text-sm italic">Nenhuma meta cadastrada para este aluno.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...metas]
              .sort((a, b) => Number(b.ativa) - Number(a.ativa))
              .map((m) => {
                const sufixo = m.tipo === 'PESO' ? ' kg' : m.tipo === 'GORDURA' ? '%' : ' cm'
                return (
                  <div
                    key={m.id}
                    className={`bg-[#0d100e] border rounded-2xl p-3 flex items-center justify-between gap-3 ${
                      m.ativa ? 'border-[#94e400]/30' : 'border-white/5 opacity-60'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {TIPO_META_LABEL[m.tipo]}
                      </p>
                      <p className="text-white/50 text-xs">
                        Até {formatarDataPtBr(m.dataLimite)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-white font-bold text-sm">
                        {Number(m.valorAlvo).toFixed(1).replace('.', ',')}
                        <span className="text-white/60 text-xs ml-1">{sufixo}</span>
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                          m.ativa
                            ? 'bg-[#94e400]/20 text-[#94e400]'
                            : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {m.ativa ? 'Ativa' : 'Encerrada'}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Tab Evolução Física — Treinador/Admin vendo aluno específico ────────── */

const EVOLUCAO_KEY_LABEL_FICHA: Record<string, string> = {
  peso: 'Peso',
  gordura: '% Gordura',
  braco_esquerdo: 'Braço esquerdo',
  braco_direito: 'Braço direito',
  perna_esquerda: 'Perna esquerda',
  perna_direita: 'Perna direita',
  cintura: 'Cintura',
  quadril: 'Quadril',
  peito: 'Peito',
  panturrilha_esquerda: 'Panturrilha esq.',
  panturrilha_direita: 'Panturrilha dir.',
  pescoco: 'Pescoço',
  ombros: 'Ombros',
}

function EvolucaoFisicaTab({ alunoId }: { alunoId: string }) {
  const [dados, setDados] = useState<EvolucaoFisicaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    setLoading(true)
    setErro('')
    alunoService
      .evolucaoFisicaDeAluno(alunoId)
      .then((data) => setDados(data || {}))
      .catch((err) =>
        setErro(extractError(err) || 'Não foi possível carregar a evolução física.'),
      )
      .finally(() => setLoading(false))
  }, [alunoId])

  const metricas = useMemo<[string, EvolucaoMedida][]>(() => {
    if (!dados) return []
    const ordem = [
      'peso',
      'gordura',
      'cintura',
      'quadril',
      'peito',
      'braco_esquerdo',
      'braco_direito',
      'perna_esquerda',
      'perna_direita',
      'panturrilha_esquerda',
      'panturrilha_direita',
      'pescoco',
      'ombros',
    ]
    return ordem.filter((k) => dados[k]).map((k) => [k, dados[k]] as [string, EvolucaoMedida])
  }, [dados])

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-[#94e400]" />
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
          Evolução física consolidada
        </h3>
      </div>

      {loading ? (
        <p className="text-white/50 text-sm">Carregando...</p>
      ) : erro ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3">
          {erro}
        </div>
      ) : metricas.length === 0 ? (
        <p className="text-white/40 text-sm italic">
          Sem avaliações suficientes pra calcular evolução.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {metricas.map(([chave, m]) => {
            const sufixo = chave === 'peso' ? ' kg' : chave === 'gordura' ? '%' : ' cm'
            const semHist = m.historico.length === 0
            const TendIcon =
              m.tendencia === 'SUBINDO' ? ArrowUp : m.tendencia === 'DESCENDO' ? ArrowDown : Minus
            return (
              <div key={chave} className="bg-[#0d100e] border border-white/5 rounded-2xl p-3">
                <span className="text-white/50 text-[10px] uppercase tracking-wider">
                  {EVOLUCAO_KEY_LABEL_FICHA[chave] ?? chave}
                </span>
                {semHist ? (
                  <p className="text-white/40 text-xs italic mt-1">Sem registros</p>
                ) : (
                  <>
                    <p className="text-white font-bold text-xl leading-tight mt-0.5">
                      {m.ultimoValor.toFixed(1).replace('.', ',')}
                      <span className="text-xs font-normal text-white/60">{sufixo}</span>
                    </p>
                    <div className="flex items-center gap-1 text-[11px] mt-1">
                      <TendIcon
                        size={12}
                        className={
                          m.tendencia === 'SUBINDO'
                            ? 'text-yellow-400'
                            : m.tendencia === 'DESCENDO'
                              ? 'text-[#94e400]'
                              : 'text-white/40'
                        }
                      />
                      <span
                        className={
                          m.deltaAbsoluto > 0
                            ? 'text-yellow-400'
                            : m.deltaAbsoluto < 0
                              ? 'text-[#94e400]'
                              : 'text-white/50'
                        }
                      >
                        {m.deltaAbsoluto > 0 ? '+' : ''}
                        {m.deltaAbsoluto.toFixed(1).replace('.', ',')}
                        {sufixo}
                      </span>
                    </div>
                    {m.meta && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-white/50">
                            Meta: {Number(m.meta.valorAlvo).toFixed(1).replace('.', ',')}
                            {sufixo}
                          </span>
                          <span
                            className={
                              m.meta.status === 'CONCLUIDA'
                                ? 'text-[#94e400] font-semibold'
                                : 'text-white/60'
                            }
                          >
                            {m.meta.progresso.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              m.meta.status === 'CONCLUIDA' ? 'bg-[#94e400]' : 'bg-[#94e400]/60'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, m.meta.progresso))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
