import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  MessageCircle,
  Target,
  TrendingUp,
  Trophy,
  User as UserIcon,
  Utensils,
} from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { useAuth } from '../../../hooks'
import { treinosService } from '../../../services/treinos.service'
import { alunoService } from '../../../services/aluno.service'
import { plataformaService } from '../../../services/plataforma.service'
import { formatarDataPtBr, getInitials } from '../../../utils'
import type {
  TreinoDto,
  DashboardEvolucaoItem,
  ClassificacaoIMC,
  MetaDto,
  RankingAlunoItem,
  TipoMetaEnum,
  TreinoStatusEnum,
} from '../../../types'

const TIPO_META_LABEL_DASH: Record<TipoMetaEnum, string> = {
  PESO: 'Peso',
  GORDURA: '% Gordura',
  BRACO_ESQUERDO: 'Braço esq.',
  BRACO_DIREITO: 'Braço dir.',
  PERNA_ESQUERDA: 'Perna esq.',
  PERNA_DIREITA: 'Perna dir.',
  CINTURA: 'Cintura',
  QUADRIL: 'Quadril',
  PEITO: 'Peito',
  PANTURRILHA_ESQUERDA: 'Pant. esq.',
  PANTURRILHA_DIREITA: 'Pant. dir.',
  PESCOCO: 'Pescoço',
  OMBROS: 'Ombros',
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

const STATUS_COR: Record<TreinoStatusEnum, string> = {
  ATIVO: 'bg-[#94e400] text-black',
  VENCIDO: 'bg-red-500/30 text-red-200',
}

function formatDiaSemana(d: Date): string {
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase().slice(0, 3)
}

function formatMes(d: Date): string {
  return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase().slice(0, 3)
}

function diferencaPeso(items: DashboardEvolucaoItem[]) {
  // Ordena por data DESCENDENTE (mais recente primeiro). Backend retorna crescente.
  const ordenados = [...items].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  )
  const pesos = ordenados
    .map((i) => i.detalhes?.peso)
    .filter((v): v is number => typeof v === 'number')
  if (pesos.length === 0) return {} as { atual?: number; anterior?: number; delta?: number }
  if (pesos.length === 1) return { atual: pesos[0] }
  return { atual: pesos[0], anterior: pesos[1], delta: Number((pesos[0] - pesos[1]).toFixed(1)) }
}

export default function DashboardAlunoPage() {
  const { user } = useAuth()
  const [treinos, setTreinos] = useState<TreinoDto[]>([])
  const [loadingTreinos, setLoadingTreinos] = useState(false)
  const [erroTreinos, setErroTreinos] = useState('')
  const [evolucao, setEvolucao] = useState<DashboardEvolucaoItem[]>([])
  const [loadingEvolucao, setLoadingEvolucao] = useState(false)
  const [ranking, setRanking] = useState<RankingAlunoItem[]>([])
  const [loadingRanking, setLoadingRanking] = useState(false)
  const [metas, setMetas] = useState<MetaDto[]>([])
  const [loadingMetas, setLoadingMetas] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    setLoadingTreinos(true)
    treinosService
      .listar({ alunoId: user.id })
      .then((data) => setTreinos(Array.isArray(data) ? data : []))
      .catch(() => setErroTreinos('Não foi possível carregar seus treinos.'))
      .finally(() => setLoadingTreinos(false))

    setLoadingEvolucao(true)
    alunoService
      .meuDashboard()
      .then((data) => setEvolucao(Array.isArray(data) ? data : []))
      .catch(() => {
        /* sem avaliação ainda — UI mostra estado vazio */
      })
      .finally(() => setLoadingEvolucao(false))

    setLoadingRanking(true)
    plataformaService
      .obterRanking()
      .then((r) => setRanking(Array.isArray(r) ? r : []))
      .catch(() => setRanking([]))
      .finally(() => setLoadingRanking(false))

    setLoadingMetas(true)
    alunoService
      .listarMetas(user.id)
      .then((m) => setMetas(Array.isArray(m) ? m : []))
      .catch(() => setMetas([]))
      .finally(() => setLoadingMetas(false))
  }, [user?.id])

  const metasAtivasDash = useMemo(() => metas.filter((m) => m.ativa).slice(0, 3), [metas])

  const minhaPosicao = useMemo(() => {
    if (!user?.id || ranking.length === 0) return null
    const idx = ranking.findIndex((r) => r.alunoId === user.id)
    if (idx < 0) return null
    return { posicao: idx + 1, dados: ranking[idx] }
  }, [ranking, user?.id])

  const treinoHoje = useMemo<TreinoDto | undefined>(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return (
      treinos.find((t) => {
        const inicio = new Date(t.dataInicio)
        const fim = new Date(t.dataFim)
        return inicio <= hoje && fim >= hoje && t.status === 'ATIVO'
      }) ?? treinos.find((t) => t.status === 'ATIVO')
    )
  }, [treinos])

  const divisaoHojeInfo = useMemo(() => {
    if (!treinoHoje) return null
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    const hojeNum = new Date().getDay()
    const nomeDia = diasSemana[hojeNum]
    
    let letraDivisao: string | null = null
    switch (hojeNum) {
      case 0: letraDivisao = treinoHoje.divisaoDomingo || null; break
      case 1: letraDivisao = treinoHoje.divisaoSegunda || null; break
      case 2: letraDivisao = treinoHoje.divisaoTerca || null; break
      case 3: letraDivisao = treinoHoje.divisaoQuarta || null; break
      case 4: letraDivisao = treinoHoje.divisaoQuinta || null; break
      case 5: letraDivisao = treinoHoje.divisaoSexta || null; break
      case 6: letraDivisao = treinoHoje.divisaoSabado || null; break
    }
    
    if (!letraDivisao) {
      return {
        nomeDia,
        letra: null,
        nome: 'Descanso',
        ehDescanso: true
      }
    }

    let nomeDivisao = ''
    switch (letraDivisao.toUpperCase()) {
      case 'A': nomeDivisao = treinoHoje.nomeDivisaoA || 'Divisão A'; break
      case 'B': nomeDivisao = treinoHoje.nomeDivisaoB || 'Divisão B'; break
      case 'C': nomeDivisao = treinoHoje.nomeDivisaoC || 'Divisão C'; break
      case 'D': nomeDivisao = treinoHoje.nomeDivisaoD || 'Divisão D'; break
      default: nomeDivisao = `Divisão ${letraDivisao}`
    }

    return {
      nomeDia,
      letra: letraDivisao,
      nome: nomeDivisao,
      ehDescanso: false
    }
  }, [treinoHoje])

  const proximos = useMemo<TreinoDto[]>(() => {
    const agora = Date.now()
    return treinos
      .filter((t) => new Date(t.dataInicio).getTime() > agora)
      .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime())
      .slice(0, 3)
  }, [treinos])

  const peso = useMemo(() => diferencaPeso(evolucao), [evolucao])
  const ultimaAvaliacao = useMemo(() => {
    if (!evolucao.length) return undefined
    return [...evolucao].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    )[0]?.detalhes
  }, [evolucao])

  return (
    <DashboardLayout>
      {/* Linha 1 — Treino de Hoje + Plano Alimentar (placeholder) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Treino de Hoje */}
        <div className="relative bg-gradient-to-br from-[#1a2410] to-[#0d100e] border border-white/5 rounded-3xl overflow-hidden h-[376px] p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <Dumbbell size={20} className="text-[#94e400]" />
            <span className="text-[#ccc] font-semibold tracking-wider text-sm">TREINO DE HOJE</span>
          </div>

          {loadingTreinos ? (
            <div className="text-white/50 text-sm mt-4">Carregando treinos...</div>
          ) : erroTreinos ? (
            <div className="text-red-400 text-sm mt-4">{erroTreinos}</div>
          ) : treinoHoje ? (
            divisaoHojeInfo?.ehDescanso ? (
              <>
                <h2 className="text-white font-extrabold text-[2.2rem] leading-tight mt-2">
                  Hoje é dia de descanso! 🌟
                </h2>
                <p className="text-white/60 mt-4 max-w-md leading-snug">
                  Nenhum treino agendado para hoje ({divisaoHojeInfo.nomeDia}). Aproveite para recuperar as energias e alimentar-se bem!
                </p>
                <div className="mt-auto">
                  <Link
                    to="/aluno/treinos"
                    className="inline-flex items-center gap-2 bg-[#94e400] text-black font-bold rounded-full px-7 py-3 hover:bg-[#a4f400] transition-colors"
                  >
                    Ver Cronograma Semanal <ArrowRight size={16} />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-white font-extrabold text-[2.5rem] leading-tight mt-2">
                  {treinoHoje.nome}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[#94e400] text-[10px] font-extrabold bg-[#94e400]/10 px-2.5 py-0.5 rounded-full border border-[#94e400]/20 uppercase tracking-wider">
                    Divisão {divisaoHojeInfo?.letra}: {divisaoHojeInfo?.nome}
                  </span>
                  <span className="text-white text-xs font-semibold">
                    {treinoHoje.itens?.length ?? 0} exercícios hoje
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${STATUS_COR[treinoHoje.status]}`}
                  >
                    {treinoHoje.status}
                  </span>
                </div>
                {treinoHoje.descricao && (
                  <p className="text-white/60 mt-4 max-w-md leading-snug">{treinoHoje.descricao}</p>
                )}
                <div className="mt-auto">
                  <Link
                    to="/aluno/treinos"
                    className="inline-flex items-center gap-2 bg-[#94e400] text-black font-bold rounded-full px-7 py-3 hover:bg-[#a4f400] transition-colors"
                  >
                    Iniciar Treino <ArrowRight size={16} />
                  </Link>
                </div>
              </>
            )
          ) : (
            <>
              <h2 className="text-white font-extrabold text-[2.5rem] leading-tight mt-2">Sem treino hoje</h2>
              <p className="text-white/60 mt-3 max-w-md leading-snug">
                Aguarde a programação do seu treinador ou explore seus treinos cadastrados.
              </p>
              <div className="mt-auto">
                <Link
                  to="/aluno/treinos"
                  className="inline-flex items-center gap-2 bg-[#94e400] text-black font-bold rounded-full px-7 py-3 hover:bg-[#a4f400] transition-colors"
                >
                  Ver Treinos <ArrowRight size={16} />
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Plano Alimentar — EM BREVE */}
        <div className="relative bg-[#272727] border-2 border-dashed border-[#4d4d4d] rounded-3xl overflow-hidden h-[376px] p-8 flex flex-col items-center justify-center text-center">
          <span className="w-16 h-16 rounded-full bg-[#94e400]/10 flex items-center justify-center mb-4">
            <Utensils size={28} className="text-[#94e400]" />
          </span>
          <span className="text-[#ccc] font-semibold tracking-wider text-sm mb-2">
            PLANO ALIMENTAR
          </span>
          <h2 className="text-white font-bold text-2xl">Em breve</h2>
          <p className="text-white/50 text-sm mt-3 max-w-xs leading-relaxed">
            Acompanhamento de refeições e macros será adicionado em uma próxima entrega.
          </p>
          <span className="mt-4 inline-block bg-[#94e400]/15 text-[#94e400] font-semibold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">
            Funcionalidade futura
          </span>
        </div>
      </div>

      {/* Linha 2 — Seu Progresso + Seu Professor */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Seu Progresso */}
        <div className="bg-[#272727] border-2 border-[#4d4d4d] rounded-3xl p-6 min-h-[250px] flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={20} className="text-[#94e400]" />
            <span className="text-[#ccc] font-semibold tracking-wider text-sm">SEU PROGRESSO</span>
          </div>

          {loadingEvolucao ? (
            <div className="text-white/50 text-sm">Carregando evolução...</div>
          ) : evolucao.length === 0 ? (
            <div className="text-white/50 text-sm flex-1 flex items-center">
              Nenhuma avaliação registrada ainda. Registre uma em{' '}
              <Link to="/aluno/avaliacao" className="text-[#94e400] underline ml-1">
                Avaliação
              </Link>
              .
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                <div className="flex flex-col">
                  <span className="text-[#ccc] font-semibold text-xs uppercase">Peso atual</span>
                  <p className="text-white font-bold text-3xl leading-tight mt-1">
                    {peso.atual?.toFixed(1) ?? '—'}
                    <span className="text-base font-bold ml-1">kg</span>
                  </p>
                </div>
                {ultimaAvaliacao?.altura != null && (
                  <div className="flex flex-col">
                    <span className="text-[#ccc] font-semibold text-xs uppercase">Altura</span>
                    <p className="text-white font-bold text-3xl leading-tight mt-1">
                      {ultimaAvaliacao.altura}
                      <span className="text-base font-bold ml-1">m</span>
                    </p>
                  </div>
                )}
                {ultimaAvaliacao?.imc != null && (
                  <div className="flex flex-col">
                    <span className="text-[#ccc] font-semibold text-xs uppercase">IMC</span>
                    <p className="text-white font-bold text-3xl leading-tight mt-1">
                      {ultimaAvaliacao.imc.toFixed(1)}
                    </p>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[#ccc] font-semibold text-xs uppercase">Avaliações</span>
                  <p className="text-white font-bold text-3xl leading-tight mt-1">{evolucao.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {peso.delta != null && (
                  <span
                    className={`border-[1.5px] rounded-full px-3 py-1 text-sm font-semibold ${
                      peso.delta < 0
                        ? 'border-[#94e400] text-[#94e400]'
                        : 'border-yellow-400 text-yellow-400'
                    }`}
                  >
                    {peso.delta > 0 ? '+' : ''}
                    {peso.delta} kg
                  </span>
                )}
                {ultimaAvaliacao?.classificacao && (
                  <span className="border-[1.5px] border-[#94e400] text-[#94e400] rounded-full px-3 py-1 text-xs font-semibold">
                    {CLASSIFICACAO_LABEL[ultimaAvaliacao.classificacao] ?? ultimaAvaliacao.classificacao}
                  </span>
                )}
                {peso.delta != null && (
                  <span className="text-[#ccc] text-xs">desde a última avaliação</span>
                )}
              </div>
            </>
          )}

          <Link
            to="/aluno/evolucao"
            className="inline-flex items-center gap-1 border-[1.5px] border-[#94e400] text-[#94e400] font-medium text-xs rounded-full px-4 py-1.5 mt-4 self-start hover:bg-[#94e400]/10"
          >
            Ver evolução <ChevronRight size={14} />
          </Link>
        </div>

        {/* Seu Professor — EM BREVE (vínculo aluno↔treinador não existe no backend ainda) */}
        <div className="bg-[#272727] border-2 border-dashed border-[#4d4d4d] rounded-3xl p-6 min-h-[250px] flex flex-col items-center justify-center text-center">
          <span className="w-14 h-14 rounded-full bg-[#94e400]/10 flex items-center justify-center mb-3">
            <UserIcon size={26} className="text-[#94e400]" />
          </span>
          <span className="text-[#ccc] font-semibold tracking-wider text-sm">SEU PROFESSOR</span>
          <h3 className="text-white font-bold text-xl mt-2">Em breve</h3>
          <p className="text-white/50 text-sm mt-2 max-w-xs leading-relaxed">
            O vínculo entre aluno e treinador será exibido aqui assim que disponibilizado pelo
            backend.
          </p>
          <span className="mt-3 inline-block bg-[#94e400]/15 text-[#94e400] font-semibold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">
            Funcionalidade futura
          </span>
        </div>
      </div>

      {/* Linha 3 — Próximos Treinos */}
      <div className="bg-[#272727] border-2 border-[#4d4d4d] rounded-3xl p-6">
        <div className="flex items-stretch gap-6">
          <div className="flex flex-col items-start gap-3 shrink-0 px-2">
            <CalendarDays size={48} className="text-[#94e400]" />
            <span className="text-[#ccc] font-semibold tracking-wider text-sm leading-tight">
              PRÓXIMOS<br />TREINOS
            </span>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {proximos.length === 0 && !loadingTreinos ? (
              <div className="col-span-3 text-white/50 text-sm py-8 text-center">
                Nenhum treino programado.
              </div>
            ) : (
              proximos.map((t) => {
                const data = new Date(t.dataInicio)
                return (
                  <div key={t.id} className="bg-[#474747] rounded-2xl p-4 flex gap-4 items-center">
                    <div className="bg-gradient-to-b from-[#94e400] to-[#527e00] w-[84px] h-[84px] rounded-lg flex flex-col items-center justify-center shrink-0">
                      <span className="text-black font-semibold text-xs leading-none">
                        {formatDiaSemana(data)}
                      </span>
                      <span className="text-black font-extrabold text-3xl leading-none my-1">
                        {data.getDate()}
                      </span>
                      <span className="text-black font-medium text-xs leading-none">
                        {formatMes(data)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-white font-semibold text-lg truncate">{t.nome}</span>
                      <span className="text-[#cbcbcb] text-sm truncate">
                        {t.descricao || `${t.itens?.length ?? 0} exercícios`}
                      </span>
                      <span
                        className={`inline-block text-[10px] font-bold rounded-full px-2 py-0.5 mt-1 self-start uppercase ${STATUS_COR[t.status]}`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <Link
            to="/aluno/treinos"
            className="flex flex-col items-center justify-center gap-1 shrink-0 px-3 text-[#ccc] hover:text-white"
          >
            <span className="font-semibold text-xs leading-tight text-center">VER<br />AGENDA<br />COMPLETA</span>
            <ArrowRight size={20} className="mt-1" />
          </Link>
        </div>
      </div>

      {/* Ranking — top alunos da plataforma */}
      <div className="mt-6 bg-[#272727] border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-[#94e400]" />
            <h2 className="text-white font-bold text-lg">Ranking</h2>
          </div>
          {minhaPosicao && (
            <span className="bg-[#94e400]/15 text-[#94e400] text-xs font-bold rounded-full px-3 py-1">
              Você está em #{minhaPosicao.posicao} · {minhaPosicao.dados.pontuacaoTotal} pts
            </span>
          )}
        </div>

        {loadingRanking ? (
          <p className="text-white/50 text-sm">Carregando ranking...</p>
        ) : ranking.length === 0 ? (
          <p className="text-white/40 text-sm italic">
            Conclua treinos pela tela <span className="text-[#94e400]">Meus Treinos</span> para
            aparecer no ranking.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {ranking.slice(0, 6).map((aluno, i) => {
              const ehVoce = aluno.alunoId === user?.id
              return (
                <div
                  key={aluno.alunoId}
                  className={`flex items-center gap-3 rounded-2xl p-3 border ${
                    ehVoce
                      ? 'bg-[#94e400]/10 border-[#94e400]/60'
                      : 'bg-[#0d100e] border-white/5'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      i === 0
                        ? 'bg-[#94e400] text-black'
                        : i === 1
                          ? 'bg-white/30 text-white'
                          : i === 2
                            ? 'bg-orange-400/30 text-orange-200'
                            : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="w-9 h-9 rounded-full bg-[#94e400]/15 border border-[#94e400] text-[#94e400] font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(aluno.nomeAluno)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {ehVoce ? 'Você' : aluno.nomeAluno}
                    </p>
                    <p className="text-white/50 text-xs">
                      {aluno.treinosConcluidos} treino
                      {aluno.treinosConcluidos === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-[#94e400] font-bold text-sm shrink-0">
                    {aluno.pontuacaoTotal}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Minhas metas — GET /api/aluno/{id}/metas */}
      <div className="mt-6 bg-[#272727] border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-[#94e400]" />
            <h2 className="text-white font-bold text-lg">Minhas metas</h2>
          </div>
          {metas.length > 0 && (
            <Link
              to="/aluno/evolucao"
              className="text-[#94e400] text-xs font-semibold inline-flex items-center gap-1 hover:text-white"
            >
              Ver todas <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {loadingMetas ? (
          <p className="text-white/50 text-sm">Carregando metas...</p>
        ) : metasAtivasDash.length === 0 ? (
          <p className="text-white/40 text-sm italic">
            Seu treinador ainda não cadastrou metas pra você. Quando cadastrar, aparecem aqui.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {metasAtivasDash.map((m) => {
              const sufixo = m.tipo === 'PESO' ? ' kg' : m.tipo === 'GORDURA' ? '%' : ' cm'
              return (
                <div
                  key={m.id}
                  className="bg-[#0d100e] border border-[#94e400]/30 rounded-2xl p-4 flex flex-col gap-1"
                >
                  <span className="text-white/50 text-[10px] uppercase tracking-wider">
                    {TIPO_META_LABEL_DASH[m.tipo]}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white font-bold text-2xl">
                      {Number(m.valorAlvo).toFixed(1).replace('.', ',')}
                    </span>
                    <span className="text-white/60 text-xs">{sufixo}</span>
                  </div>
                  <span className="text-white/50 text-[11px]">
                    Até {formatarDataPtBr(m.dataLimite)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Mensagens — placeholder em uma linha */}
      <div className="mt-6 bg-[#272727] border-2 border-dashed border-[#4d4d4d] rounded-3xl p-5 flex items-center gap-4">
        <span className="w-10 h-10 rounded-full bg-[#94e400]/10 flex items-center justify-center shrink-0">
          <MessageCircle size={18} className="text-[#94e400]" />
        </span>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">Mensagens com seu treinador</p>
          <p className="text-white/50 text-xs">Funcionalidade em desenvolvimento.</p>
        </div>
        <span className="bg-[#94e400]/15 text-[#94e400] font-semibold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">
          Em breve
        </span>
      </div>
    </DashboardLayout>
  )
}
