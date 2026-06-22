import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Dumbbell,
  MessageSquare,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { usuariosService } from '../../../services/usuarios.service'
import { adminService } from '../../../services/admin.service'
import { extractError } from '../../../utils'
import type { MetricasPlataforma, Usuario } from '../../../types'

type Periodo = 7 | 30 | 90

function dataInicioPara(dias: Periodo): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

interface Counters {
  alunos: number | null
  treinadores: number | null
  treinadoresPendentes: number | null
}

export default function DashboardAdminPage() {
  const [counts, setCounts] = useState<Counters>({
    alunos: null,
    treinadores: null,
    treinadoresPendentes: null,
  })

  const [periodo, setPeriodo] = useState<Periodo>(30)
  const [metricas, setMetricas] = useState<MetricasPlataforma | null>(null)
  const [carregandoMetricas, setCarregandoMetricas] = useState(true)
  const [erroMetricas, setErroMetricas] = useState('')

  const dataFimIso = useMemo(() => new Date().toISOString(), [])
  const dataInicioIso = useMemo(() => dataInicioPara(periodo), [periodo])

  useEffect(() => {
    Promise.all([
      usuariosService.listar('ALUNO', 1, 1).then((r) => r.total).catch(() => 0),
      usuariosService
        .listar('TREINADOR', 1, 100)
        .then((r) => r.data ?? [])
        .catch(() => [] as Usuario[]),
    ]).then(([alunos, treinadores]) => {
      setCounts({
        alunos,
        treinadores: treinadores.length,
        treinadoresPendentes: treinadores.filter((t) => !t.ativo).length,
      })
    })
  }, [])

  useEffect(() => {
    setCarregandoMetricas(true)
    setErroMetricas('')
    adminService
      .metricasPlataforma(dataInicioIso, dataFimIso)
      .then(setMetricas)
      .catch((err) => {
        setMetricas(null)
        setErroMetricas(extractError(err) || 'Não foi possível carregar as métricas da plataforma.')
      })
      .finally(() => setCarregandoMetricas(false))
  }, [dataInicioIso, dataFimIso])

  const cards = [
    { icon: Users,       label: 'Alunos',                valor: counts.alunos,               to: '/usuarios' },
    { icon: Dumbbell,    label: 'Treinadores',           valor: counts.treinadores,          to: '/usuarios' },
    { icon: UserCheck,   label: 'Treinadores pendentes', valor: counts.treinadoresPendentes, to: '/admin/aprovacao-treinadores' },
  ]

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.label}
              to={c.to}
              className="bg-[#272727] border border-white/10 rounded-3xl p-5 flex items-center gap-4 hover:border-[#94e400]/40 transition-all"
            >
              <span className="w-14 h-14 rounded-2xl bg-[#94e400]/15 flex items-center justify-center">
                <Icon size={26} className="text-[#94e400]" />
              </span>
              <div className="flex-1">
                <span className="text-white/50 text-xs uppercase tracking-wider">{c.label}</span>
                <p className="text-white font-bold text-3xl leading-tight">
                  {c.valor != null ? c.valor : '—'}
                </p>
              </div>
              <ArrowRight size={18} className="text-white/30" />
            </Link>
          )
        })}
      </div>

      {/* Métricas da plataforma — GET /api/admin/metricas-plataforma */}
      <div className="bg-[#272727] border border-white/10 rounded-3xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-[#94e400]" />
            <h2 className="text-white font-bold text-lg">Métricas da plataforma</h2>
          </div>
          <div className="flex items-center gap-1 bg-[#0d100e] border border-white/10 rounded-full p-1">
            {([7, 30, 90] as Periodo[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  periodo === p
                    ? 'bg-[#94e400] text-black'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        {carregandoMetricas ? (
          <p className="text-white/50 text-sm">Carregando métricas...</p>
        ) : erroMetricas ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3">
            {erroMetricas}
          </div>
        ) : !metricas ? (
          <p className="text-white/40 text-sm italic">Sem dados de telemetria no período.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Usuários ativos (cumulativo) */}
            <div className="bg-[#0d100e] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-[#94e400]" />
                <span className="text-white/70 text-xs uppercase tracking-wider font-semibold">
                  Usuários ativos
                </span>
              </div>
              <p className="text-white font-bold text-4xl leading-tight">
                {metricas.usuariosAtivos.total}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-white/60">
                  {metricas.usuariosAtivos.alunos} alunos
                </span>
                <span className="text-white/30">·</span>
                <span className="text-white/60">
                  {metricas.usuariosAtivos.treinadores} treinadores
                </span>
              </div>
            </div>

            {/* Volumes do período */}
            <div className="bg-[#0d100e] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-[#94e400]" />
                <span className="text-white/70 text-xs uppercase tracking-wider font-semibold">
                  Volume no período
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-white font-bold text-2xl leading-tight">
                    {metricas.volumesPeriodo.novosCadastros}
                  </p>
                  <span className="text-white/50 text-[10px]">cadastros</span>
                </div>
                <div>
                  <p className="text-white font-bold text-2xl leading-tight">
                    {metricas.volumesPeriodo.treinosCriados}
                  </p>
                  <span className="text-white/50 text-[10px]">treinos criados</span>
                </div>
                <div>
                  <p className="text-[#94e400] font-bold text-2xl leading-tight">
                    {metricas.volumesPeriodo.treinosConcluidos}
                  </p>
                  <span className="text-white/50 text-[10px]">concluídos</span>
                </div>
              </div>
            </div>

            {/* Engajamento */}
            <div className="bg-[#0d100e] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-[#94e400]" />
                <span className="text-white/70 text-xs uppercase tracking-wider font-semibold">
                  Engajamento
                </span>
              </div>
              <p className="text-[#94e400] font-bold text-4xl leading-tight">
                {metricas.engajamentoGeral.scoreGeral}
              </p>
              <span className="text-white/50 text-[10px]">score geral</span>
              <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                <span className="text-white/60">
                  {metricas.engajamentoGeral.totalLogins} logins
                </span>
                <span className="text-white/30">·</span>
                <span className="text-white/60">
                  {metricas.engajamentoGeral.totalMensagensChat} msgs
                </span>
                <span className="text-white/30">·</span>
                <span className="text-white/60">
                  {metricas.engajamentoGeral.totalSubmissoes} envios
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          {
            icon: Users,
            label: 'Gerenciar usuários',
            desc: 'Veja a ficha completa de cada usuário, edite contatos, registre avaliações ou gerencie especializações.',
            to: '/usuarios',
          },
          {
            icon: UserCheck,
            label: 'Aprovar treinadores',
            desc: 'Revise e aprove os cadastros pendentes de treinadores para liberar acesso.',
            to: '/admin/aprovacao-treinadores',
          },
          {
            icon: UserPlus,
            label: 'Convidar aluno',
            desc: 'Envie um convite por e-mail em nome de um treinador específico.',
            to: '/admin/convidar',
          },
          {
            icon: Dumbbell,
            label: 'Treinos da plataforma',
            desc: 'Visualize todos os treinos cadastrados, filtre por aluno, treinador ou status.',
            to: '/admin/treinos',
          },
          {
            icon: ClipboardList,
            label: 'Exercícios',
            desc: 'Veja a biblioteca de exercícios cadastrada por cada treinador.',
            to: '/admin/exercicios',
          },
        ].map((card) => {
          const CardIcon = card.icon
          return (
            <Link
              key={card.to}
              to={card.to}
              className="bg-[#272727] hover:bg-[#2c2f2d] rounded-3xl p-6 flex flex-col gap-3 transition-all border border-transparent hover:border-[#94e400]/30"
            >
              <span className="w-10 h-10 rounded-xl bg-[#94e400]/15 flex items-center justify-center">
                <CardIcon size={20} className="text-[#94e400]" />
              </span>
              <span className="text-[#94e400] font-bold text-lg">{card.label}</span>
              <span className="text-white/60 text-sm leading-relaxed">{card.desc}</span>
            </Link>
          )
        })}
      </div>
    </DashboardLayout>
  )
}
