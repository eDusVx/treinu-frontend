import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  MessageCircle,
  Plus,
  Star,
  Trophy,
  Users,
} from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { useAuth } from '../../../hooks'
import { treinosService } from '../../../services/treinos.service'
import { chatService } from '../../../services/chat.service'
import { plataformaService } from '../../../services/plataforma.service'
import { execucaoTreinoService } from '../../../services/execucaoTreino.service'
import { alunoService } from '../../../services/aluno.service'
import { extractError, getInitials } from '../../../utils'
import type {
  ComparativoAlunoItem,
  FeedbackTreinoDto,
  RankingAlunoItem,
  SalaChatDto,
} from '../../../types'

const DIAS_SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']

function KpiCard({
  icon: Icon,
  titulo,
  valor,
  cor = '#94e400',
  legenda,
  aguardando,
}: {
  icon: typeof Users
  titulo: string
  valor: number | string | null
  cor?: string
  legenda?: string
  aguardando?: boolean
}) {
  return (
    <div className="bg-[#272727] border border-white/10 rounded-3xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <span
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${cor}26` }}
        >
          <Icon size={18} style={{ color: cor }} />
        </span>
        <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
          {titulo}
        </span>
      </div>
      <p className="text-white font-bold text-4xl leading-tight">
        {valor != null ? valor : aguardando ? '—' : '...'}
      </p>
      <p className="text-white/40 text-[11px] mt-1">
        {aguardando ? 'Aguardando funcionalidades' : legenda || ''}
      </p>
    </div>
  )
}

// Donut SVG simples — "75%" do Figma. Como não temos endpoint de progresso,
// mostramos um donut neutro com mensagem "aguardando".
function DonutAguardando() {
  const radius = 50
  const stroke = 10
  const c = 2 * Math.PI * radius
  return (
    <svg viewBox="0 0 120 120" className="w-[140px] h-[140px]">
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
      />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#94e400"
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={c}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        opacity="0.4"
      />
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fontSize="22"
        fontWeight="bold"
        fill="#94e400"
      >
        —
      </text>
      <text
        x="60"
        y="76"
        textAnchor="middle"
        fontSize="8"
        fill="rgba(255,255,255,0.5)"
      >
        aguardando
      </text>
    </svg>
  )
}

// Line chart placeholder com a estrutura semanal — sem dados reais (aguardando).
function GraficoSemanalAguardando() {
  return (
    <svg viewBox="0 0 280 120" className="w-full h-[140px]">
      {/* grid horizontal */}
      {[20, 50, 80].map((y) => (
        <line key={y} x1="20" x2="270" y1={y} y2={y} stroke="rgba(255,255,255,0.05)" />
      ))}
      {/* eixo X */}
      {DIAS_SEMANA.map((d, i) => {
        const x = 20 + i * 41.66
        return (
          <text
            key={d}
            x={x}
            y={114}
            fontSize="9"
            fill="rgba(255,255,255,0.4)"
            textAnchor="middle"
          >
            {d}
          </text>
        )
      })}
      <text
        x="140"
        y="55"
        textAnchor="middle"
        fontSize="10"
        fill="rgba(255,255,255,0.3)"
        fontStyle="italic"
      >
        Aguardando dados reais
      </text>
    </svg>
  )
}

export default function DashboardTreinadorPage() {
  const { user } = useAuth()

  const [contagemAlunos, setContagemAlunos] = useState<number | null>(null)
  const [treinosPendentes, setTreinosPendentes] = useState<number | null>(null)
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState<number | null>(null)
  const [salas, setSalas] = useState<SalaChatDto[]>([])
  const [ranking, setRanking] = useState<RankingAlunoItem[]>([])
  const [carregandoRanking, setCarregandoRanking] = useState(false)
  const [erroRanking, setErroRanking] = useState('')
  const [feedbacks, setFeedbacks] = useState<FeedbackTreinoDto[]>([])
  const [carregandoFeedbacks, setCarregandoFeedbacks] = useState(true)
  const [erroFeedbacks, setErroFeedbacks] = useState('')
  const [comparativo, setComparativo] = useState<ComparativoAlunoItem[]>([])
  const [carregandoComparativo, setCarregandoComparativo] = useState(true)
  const [erroComparativo, setErroComparativo] = useState('')

  useEffect(() => {
    if (!user?.id) return

    treinosService
      .listar({ treinadorId: user.id })
      .then((d) => {
        const lista = Array.isArray(d) ? d : []
        const idsAlunos = new Set<string>()
        let pendentes = 0
        for (const t of lista) {
          if (t.alunoId) idsAlunos.add(t.alunoId)
          if (t.status === 'ATIVO') pendentes++
        }
        setContagemAlunos(idsAlunos.size)
        setTreinosPendentes(pendentes)
      })
      .catch(() => {
        setContagemAlunos(0)
        setTreinosPendentes(0)
      })

    chatService
      .totalNaoLidas()
      .then(setMensagensNaoLidas)
      .catch(() => setMensagensNaoLidas(0))

    chatService
      .listarSalas()
      .then((s) => setSalas(Array.isArray(s) ? s : []))
      .catch(() => setSalas([]))

    setCarregandoRanking(true)
    setErroRanking('')
    // Temporariamente sem filtro por treinador — mostra ranking geral da
    // plataforma até o back-end retroalimentar `Aluno.TreinadorId` dos alunos
    // legados (data migration pendente).
    plataformaService
      .obterRanking()
      .then((r) => setRanking(Array.isArray(r) ? r : []))
      .catch((err) => {
        setRanking([])
        setErroRanking(extractError(err) || 'Não foi possível carregar o ranking.')
      })
      .finally(() => setCarregandoRanking(false))

    setCarregandoFeedbacks(true)
    setErroFeedbacks('')
    execucaoTreinoService
      .feedbacks()
      .then((list) => setFeedbacks(Array.isArray(list) ? list : []))
      .catch((err) => {
        setFeedbacks([])
        setErroFeedbacks(extractError(err) || 'Não foi possível carregar as avaliações.')
      })
      .finally(() => setCarregandoFeedbacks(false))

    setCarregandoComparativo(true)
    setErroComparativo('')
    alunoService
      .comparativoPerformance()
      .then((data) => setComparativo(Array.isArray(data) ? data : []))
      .catch((err) => {
        setComparativo([])
        setErroComparativo(
          extractError(err) || 'Não foi possível carregar o comparativo de performance.',
        )
      })
      .finally(() => setCarregandoComparativo(false))
  }, [user?.id])

  // Top 5 alunos por taxa de conclusão (apenas quem tem ao menos 1 treino).
  const topAlunosPerformance = useMemo(
    () =>
      [...comparativo]
        .filter((c) => c.totalTreinos > 0)
        .sort((a, b) => b.taxaConclusao - a.taxaConclusao)
        .slice(0, 5),
    [comparativo],
  )

  // Backend valida nota em 0–5 (ExecucaoTreino.Concluir), mesma escala que a UI exibe.
  const mediaNota5 = useMemo(() => {
    const comNota = feedbacks.filter((f) => typeof f.nota === 'number')
    if (!comNota.length) return null
    return comNota.reduce((acc, f) => acc + (f.nota ?? 0), 0) / comNota.length
  }, [feedbacks])

  // Lista renderizada — top 10 mais recentes. Ordena defensivamente: o backend já
  // devolve em ordem DESC por DataFim, mas garantimos a invariante no front.
  const feedbacksRecentes = useMemo(
    () =>
      [...feedbacks]
        .sort((a, b) => new Date(b.dataFim).getTime() - new Date(a.dataFim).getTime())
        .slice(0, 10),
    [feedbacks],
  )

  const mensagensRecentes = useMemo(() => {
    return [...salas]
      .sort((a, b) => (b.naoLidas || 0) - (a.naoLidas || 0))
      .slice(0, 3)
  }, [salas])

  return (
    <DashboardLayout>
      {/* Botão "Adicionar Novo Treino" */}
      <div className="flex items-center justify-end mb-5">
        <Link
          to="/treinador/treinos"
          className="inline-flex items-center gap-2 bg-[#94e400] text-black font-bold rounded-full px-5 py-2.5 hover:bg-[#a4f400] cursor-pointer text-sm"
        >
          <Plus size={16} strokeWidth={3} />
          Adicionar Novo Treino
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={Users}
          titulo="Total de Alunos"
          valor={contagemAlunos}
          legenda={
            contagemAlunos != null
              ? `${contagemAlunos} aluno${contagemAlunos === 1 ? '' : 's'}`
              : ''
          }
        />
        <KpiCard
          icon={Activity}
          titulo="Treinos Pendentes"
          valor={treinosPendentes}
          legenda={
            treinosPendentes != null
              ? `${treinosPendentes} treino${treinosPendentes === 1 ? '' : 's'} ativo${treinosPendentes === 1 ? '' : 's'}`
              : ''
          }
        />
        <KpiCard
          icon={MessageCircle}
          titulo="Mensagens Não Lidas"
          valor={mensagensNaoLidas}
          cor="#3ecf8e"
          legenda={mensagensNaoLidas === 0 ? 'Tudo em dia!' : ''}
        />
        <KpiCard
          icon={AlertTriangle}
          titulo="Alunos Sem Atividade"
          valor={null}
          cor="#f59e0b"
          aguardando
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-6">
        {/* Progresso Geral */}
        <div className="bg-[#272727] border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Progresso Geral</h2>
            <span className="bg-[#94e400]/15 text-[#94e400] font-semibold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">
              Em breve
            </span>
          </div>
          <p className="text-white/50 text-xs mb-5">Sua atividade essa semana</p>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex flex-col items-center">
              <DonutAguardando />
              <p className="text-white/50 text-[11px] text-center mt-2 max-w-[160px]">
                de treinos finalizados
              </p>
            </div>
            <div className="flex-1 min-w-[260px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-white/70">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#94e400]" /> atual
                  </span>
                  <span className="flex items-center gap-1.5 text-white/50">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/30" /> semana
                  </span>
                </div>
              </div>
              <GraficoSemanalAguardando />
            </div>
          </div>
        </div>

        {/* Mensagens Recentes */}
        <div className="bg-[#272727] border border-white/10 rounded-3xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">Mensagens Recentes</h2>
          {salas.length === 0 ? (
            <p className="text-white/40 text-sm italic">Nenhuma conversa ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {mensagensRecentes.map((s) => (
                <Link
                  key={s.id}
                  to="/treinador/mensagens"
                  className="flex items-center gap-3 hover:bg-white/[0.04] rounded-2xl p-2 -mx-2 cursor-pointer"
                >
                  <span className="w-10 h-10 rounded-full bg-[#94e400]/15 border border-[#94e400] text-[#94e400] font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(s.nome)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-semibold text-sm truncate block">
                      {s.nome}
                    </span>
                    <span className="text-white/50 text-xs truncate block">
                      {s.tipo === 'Direta' || s.tipo === 'Direct' ? 'Conversa direta' : 'Grupo'}
                    </span>
                  </div>
                  {s.naoLidas > 0 && (
                    <span className="bg-[#94e400] text-black text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center shrink-0">
                      {s.naoLidas}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
          <Link
            to={user?.role === 'TREINADOR' ? '/treinador/mensagens' : '/aluno/mensagens'}
            className="mt-4 block text-center border border-[#94e400] text-[#94e400] hover:bg-[#94e400]/10 font-bold text-xs rounded-full py-2 cursor-pointer"
          >
            Ver todas as mensagens
          </Link>
        </div>
      </div>

      {/* Performance dos alunos — GET /api/aluno/comparativo-performance */}
      <div className="bg-[#272727] border border-white/10 rounded-3xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#94e400]" />
            <h2 className="text-white font-bold text-lg">Performance dos seus alunos</h2>
          </div>
          <span className="text-white/40 text-xs">
            Taxa de conclusão de treinos · top 5
          </span>
        </div>

        {carregandoComparativo ? (
          <p className="text-white/50 text-sm">Carregando comparativo...</p>
        ) : erroComparativo ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3">
            {erroComparativo}
          </div>
        ) : topAlunosPerformance.length === 0 ? (
          <p className="text-white/40 text-sm italic">
            Nenhum aluno com treinos executados ainda. Quando eles iniciarem treinos pela tela
            "Meus Treinos", a taxa de conclusão aparece aqui.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {topAlunosPerformance.map((aluno) => (
              <div
                key={aluno.id}
                className="bg-[#0d100e] border border-white/5 rounded-2xl p-3 flex items-center gap-3"
              >
                <span className="w-9 h-9 rounded-full bg-[#94e400]/15 border border-[#94e400] text-[#94e400] font-bold text-xs flex items-center justify-center shrink-0">
                  {getInitials(aluno.nomeAluno)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{aluno.nomeAluno}</p>
                  <p className="text-white/50 text-xs">
                    {aluno.treinosConcluidos}/{aluno.totalTreinos} treino
                    {aluno.totalTreinos === 1 ? '' : 's'} concluído
                    {aluno.treinosConcluidos === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0 w-[120px]">
                  <span
                    className={`text-sm font-bold ${
                      aluno.taxaConclusao >= 70
                        ? 'text-[#94e400]'
                        : aluno.taxaConclusao >= 40
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {aluno.taxaConclusao.toFixed(0)}%
                  </span>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden w-full mt-1">
                    <div
                      className={`h-full ${
                        aluno.taxaConclusao >= 70
                          ? 'bg-[#94e400]'
                          : aluno.taxaConclusao >= 40
                            ? 'bg-yellow-400'
                            : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(100, aluno.taxaConclusao)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Ranking geral da plataforma — sem filtro por treinador */}
        <div className="bg-[#272727] border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-[#94e400]" />
              <h2 className="text-white font-bold text-lg">Ranking geral</h2>
            </div>
            <span className="text-white/40 text-xs">Top alunos da plataforma</span>
          </div>
          {carregandoRanking ? (
            <p className="text-white/50 text-sm">Carregando ranking...</p>
          ) : erroRanking ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3">
              {erroRanking}
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-white/40 text-sm italic">
              Nenhum aluno pontuou ainda. O ranking sobe conforme alunos concluem treinos.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {ranking.slice(0, 5).map((aluno, i) => (
                <div
                  key={aluno.alunoId}
                  className="flex items-center gap-3 bg-[#0d100e] border border-white/5 rounded-2xl p-3"
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
                      {aluno.nomeAluno}
                    </p>
                    <p className="text-white/50 text-xs">
                      {aluno.treinosConcluidos} treino
                      {aluno.treinosConcluidos === 1 ? '' : 's'} concluído
                      {aluno.treinosConcluidos === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-[#94e400] font-bold text-sm shrink-0">
                    {aluno.pontuacaoTotal} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minha Avaliação — feedbacks reais deixados pelos alunos ao concluir treinos */}
        <div className="bg-[#272727] border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Minha Avaliação</h2>
            {feedbacks.length > 0 && (
              <span className="text-white/40 text-xs">
                {feedbacks.length} feedback{feedbacks.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {carregandoFeedbacks ? (
            <p className="text-white/50 text-sm">Carregando avaliações...</p>
          ) : erroFeedbacks ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3">
              {erroFeedbacks}
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-3">
              <div className="text-white font-bold text-5xl leading-none">—</div>
              <div className="text-white/50 text-sm mt-1">/5,0</div>
              <div className="flex items-center gap-1 mt-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={18} className="text-white/20" />
                ))}
              </div>
              <p className="text-white/40 text-[11px] italic mt-3 text-center">
                Nenhum aluno avaliou seus treinos ainda.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center pb-4 border-b border-white/10">
                <div className="text-white font-bold text-5xl leading-none">
                  {mediaNota5 != null ? mediaNota5.toFixed(1).replace('.', ',') : '—'}
                </div>
                <div className="text-white/50 text-sm mt-1">/5,0</div>
                <div className="flex items-center gap-1 mt-2">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const preenchida = mediaNota5 != null && i + 0.5 <= mediaNota5
                    return (
                      <Star
                        key={i}
                        size={18}
                        className={preenchida ? 'text-[#94e400]' : 'text-white/20'}
                        fill={preenchida ? '#94e400' : 'none'}
                      />
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-3 mt-4 max-h-[230px] overflow-y-auto pr-1">
                {feedbacksRecentes.map((f) => (
                  <div
                    key={f.execucaoTreinoId}
                    className="bg-[#0d100e] border border-white/5 rounded-2xl p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-white font-semibold text-xs truncate min-w-0 flex-1">
                        {f.nomeAluno}
                      </span>
                      {f.nota != null && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Star size={12} className="text-[#94e400]" fill="#94e400" />
                          <span className="text-[#94e400] font-bold text-xs">
                            {f.nota.toFixed(1).replace('.', ',')}
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="text-white/50 text-[11px] mb-1.5 truncate">
                      {f.nomeTreino}
                    </p>
                    {f.comentario && (
                      <p className="text-white/80 text-xs italic leading-snug">
                        “{f.comentario}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
