import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Bell,
  Check,
  ChevronDown,
  Home,
  Dumbbell,
  Utensils,
  TrendingUp,
  MessageCircle,
  ClipboardList,
  FolderOpen,
  Settings,
  Users,
  UserCheck,
  UserPlus,
  LogOut,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react'

// Limpa marcações antigas (legado: backend agora persiste lidas).
try {
  if (typeof localStorage !== 'undefined') localStorage.removeItem('treinu.notificacoesLidasLocal')
} catch {
  /* noop */
}

function tempoRelativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const seg = Math.floor(ms / 1000)
  if (seg < 60) return 'agora'
  const min = Math.floor(seg / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d} dia${d > 1 ? 's' : ''}`
  const sem = Math.floor(d / 7)
  if (sem < 4) return `há ${sem} sem`
  const mes = Math.floor(d / 30)
  if (mes < 12) return `há ${mes} mês${mes > 1 ? 'es' : ''}`
  return `há ${Math.floor(d / 365)} ano(s)`
}

type NotifFiltro = 'todas' | 'naoLidas' | 'lidas'
import { useAuth } from '../hooks'
import { notificacoesService } from '../services/notificacoes.service'
import { getInitials } from '../utils'
import type { NotificacaoDto, UserRole } from '../types'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

interface Props {
  children: ReactNode
}

const NAV_ALUNO: NavItem[] = [
  { label: 'Início',         to: '/aluno/dashboard',  icon: Home },
  { label: 'Treino',         to: '/aluno/treinos',    icon: Dumbbell },
  { label: 'Dieta',          to: '/aluno/dieta',      icon: Utensils },
  { label: 'Evolução',       to: '/aluno/evolucao',   icon: TrendingUp },
  { label: 'Mensagens',      to: '/aluno/mensagens',  icon: MessageCircle },
  { label: 'Avaliação',      to: '/aluno/avaliacao',  icon: ClipboardList },
  { label: 'Arquivos',       to: '/aluno/arquivos',   icon: FolderOpen },
  { label: 'Configurações',  to: '/configuracoes',    icon: Settings },
]

const NAV_TREINADOR: NavItem[] = [
  { label: 'Início',         to: '/treinador/dashboard', icon: Home },
  { label: 'Alunos',         to: '/usuarios',            icon: Users },
  { label: 'Convidar Aluno', to: '/treinador/convidar',  icon: UserPlus },
  { label: 'Treinos',        to: '/treinador/treinos',   icon: Dumbbell },
  { label: 'Exercícios',     to: '/treinador/exercicios', icon: ClipboardList },
  { label: 'Mensagens',      to: '/treinador/mensagens', icon: MessageCircle },
  { label: 'Configurações',  to: '/configuracoes',       icon: Settings },
]

const NAV_ADMIN: NavItem[] = [
  { label: 'Painel',                    to: '/admin/dashboard',              icon: Home },
  { label: 'Usuários',                  to: '/usuarios',                     icon: Users },
  { label: 'Treinos',                   to: '/admin/treinos',                icon: Dumbbell },
  { label: 'Exercícios',                to: '/admin/exercicios',             icon: ClipboardList },
  { label: 'Convidar Aluno',            to: '/admin/convidar',               icon: MessageCircle },
  { label: 'Aprovação dos treinadores', to: '/admin/aprovacao-treinadores',  icon: UserCheck },
  { label: 'Configurações',             to: '/configuracoes',                icon: Settings },
]

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  ALUNO: NAV_ALUNO,
  TREINADOR: NAV_TREINADOR,
  ADMIN: NAV_ADMIN,
}

const ROLE_LABEL: Record<UserRole, string> = {
  ALUNO: 'ALUNO',
  TREINADOR: 'TREINADOR',
  ADMIN: 'ADMIN',
}

function formatDateBR(d = new Date()): string {
  return d
    .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    .replace(/^\w/, (c) => c.toUpperCase())
}

const SUBTITLE_BY_ROLE: Record<UserRole, string> = {
  ALUNO: 'Acompanhe seu progresso e seu treino.',
  TREINADOR: 'Acompanhe seus alunos e organize os treinos.',
  ADMIN: 'Visão geral da plataforma.',
}

export default function DashboardLayout({ children }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const role = user?.role
  const navItems = useMemo<NavItem[]>(() => (role ? NAV_BY_ROLE[role] : []), [role])

  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notificacoes, setNotificacoes] = useState<NotificacaoDto[]>([])
  const [loadingNotif, setLoadingNotif] = useState(false)
  const [notifErro, setNotifErro] = useState('')
  const [filtroNotif, setFiltroNotif] = useState<NotifFiltro>('todas')

  const profileRef = useRef<HTMLDivElement | null>(null)
  const notifRef = useRef<HTMLDivElement | null>(null)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function goToProfile() {
    setProfileOpen(false)
    if (role === 'ALUNO') navigate('/aluno/dashboard')
    else if (role === 'TREINADOR') navigate('/treinador/dashboard')
    else navigate('/admin/dashboard')
  }

  const notifReqToken = useRef(0)

  const carregarNotificacoes = useCallback(async () => {
    const token = ++notifReqToken.current
    setLoadingNotif(true)
    setNotifErro('')
    try {
      const data = await notificacoesService.listar()
      if (notifReqToken.current !== token) return
      setNotificacoes(Array.isArray(data) ? data : [])
    } catch {
      if (notifReqToken.current === token) {
        setNotifErro('Não foi possível carregar notificações.')
      }
    } finally {
      if (notifReqToken.current === token) setLoadingNotif(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    carregarNotificacoes()
    return () => {
      // Invalida a request em flight quando user muda ou desmonta.
      notifReqToken.current++
    }
  }, [user, carregarNotificacoes])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = getInitials(user?.nome || user?.email)

  // Optimistic update: atualiza UI antes da confirmação do PATCH; se falhar, reverte.
  async function marcarComoLida(id: string) {
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
    try {
      await notificacoesService.marcarComoLida(id)
    } catch {
      setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: false } : n)))
    }
  }

  async function marcarTodasComoLidas() {
    const idsParaMarcar = notificacoes.filter((n) => !n.lida).map((n) => n.id)
    if (idsParaMarcar.length === 0) return
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    const results = await Promise.allSettled(
      idsParaMarcar.map((id) => notificacoesService.marcarComoLida(id)),
    )
    // Reverte só as que falharam
    const idsFalhas = idsParaMarcar.filter((_, i) => results[i].status === 'rejected')
    if (idsFalhas.length > 0) {
      setNotificacoes((prev) =>
        prev.map((n) => (idsFalhas.includes(n.id) ? { ...n, lida: false } : n)),
      )
    }
  }

  const naoLidas = notificacoes.filter((n) => !n.lida).length
  const notificacoesFiltradas = notificacoes.filter((n) => {
    if (filtroNotif === 'naoLidas') return !n.lida
    if (filtroNotif === 'lidas') return n.lida
    return true
  })

  return (
    <div className="flex min-h-screen bg-[#0d100e] font-[Montserrat,Poppins,sans-serif] text-white">
      {/* Sidebar */}
      <aside className="flex flex-col bg-[#222] w-[270px] min-h-screen shrink-0 py-7 px-4 gap-2">
        <div className="flex flex-col gap-1 px-3 mb-6">
          <span className="text-[#94e400] font-extrabold text-3xl tracking-tight leading-none">Treinu</span>
          <span className="text-[#d8d8d8] text-xs font-medium tracking-widest mt-2">
            {role ? ROLE_LABEL[role] : ''}
          </span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to + '/'))
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 px-4 py-2.5 rounded-full font-medium text-[15px] transition-all ${
                  active
                    ? 'bg-white/[0.12] text-white border-r-2 border-[#94e400]'
                    : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon
                  size={20}
                  className={active ? 'text-[#94e400]' : 'text-white/70 group-hover:text-white'}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white font-medium text-sm transition-all cursor-pointer"
        >
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="flex items-center justify-between px-10 pt-9 pb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-white font-bold text-[2rem] leading-tight tracking-tight">
              Olá, {user?.nome?.split(' ')[0] || 'Usuário'}!
            </h1>
            <p className="text-[#a9a9a9] text-base font-medium">
              {role ? SUBTITLE_BY_ROLE[role] : ''}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Notificações */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => {
                  setNotifOpen((v) => !v)
                  setProfileOpen(false)
                }}
                className="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Notificações"
              >
                <Bell size={22} className="text-white/80" />
                {naoLidas > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-[#94e400] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[380px] bg-[#1c1f1d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-white font-semibold text-sm">Notificações</h3>
                    <div className="flex items-center gap-3">
                      {naoLidas > 0 && (
                        <button
                          onClick={marcarTodasComoLidas}
                          className="text-white/60 text-xs hover:text-white cursor-pointer"
                          title="Marcar todas como lidas"
                        >
                          Marcar todas
                        </button>
                      )}
                      <button
                        onClick={carregarNotificacoes}
                        className="text-[#94e400] text-xs font-semibold hover:underline cursor-pointer"
                      >
                        Atualizar
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-2 border-b border-white/10 flex gap-1">
                    {([
                      { v: 'todas', l: 'Todas' },
                      { v: 'naoLidas', l: `Não lidas${naoLidas > 0 ? ` (${naoLidas})` : ''}` },
                      { v: 'lidas', l: 'Lidas' },
                    ] as { v: NotifFiltro; l: string }[]).map((f) => (
                      <button
                        key={f.v}
                        onClick={() => setFiltroNotif(f.v)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer ${
                          filtroNotif === f.v
                            ? 'bg-[#94e400] text-black'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {f.l}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    {loadingNotif ? (
                      <div className="px-5 py-8 text-center text-white/50 text-sm">Carregando...</div>
                    ) : notifErro ? (
                      <div className="px-5 py-8 text-center text-red-400 text-sm">{notifErro}</div>
                    ) : notificacoesFiltradas.length === 0 ? (
                      <div className="px-5 py-8 text-center text-white/50 text-sm">
                        {filtroNotif === 'naoLidas'
                          ? 'Tudo em dia! Sem notificações não lidas.'
                          : 'Nenhuma notificação aqui.'}
                      </div>
                    ) : (
                      notificacoesFiltradas.map((n) => {
                        const lida = n.lida
                        return (
                          <div
                            key={n.id}
                            className={`group px-5 py-3 border-b border-white/5 ${
                              !lida ? 'bg-[#94e400]/[0.04]' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {!lida ? (
                                <span className="mt-1.5 w-2 h-2 rounded-full bg-[#94e400] shrink-0" />
                              ) : (
                                <span className="mt-1.5 w-2 h-2 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold leading-tight ${lida ? 'text-white/70' : 'text-white'}`}>
                                  {n.titulo}
                                </p>
                                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                                  {n.mensagem}
                                </p>
                                <p
                                  className="text-white/30 text-[11px] mt-1.5"
                                  title={new Date(n.criadaEm).toLocaleString('pt-BR')}
                                >
                                  {tempoRelativo(n.criadaEm)}
                                </p>
                              </div>
                              {!lida && (
                                <button
                                  onClick={() => marcarComoLida(n.id)}
                                  className="text-white/40 hover:text-[#94e400] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Marcar como lida"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Data */}
            <span className="text-[#b2b2b2] text-base font-medium hidden md:block">
              {formatDateBR()}
            </span>

            {/* Avatar */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => {
                  setProfileOpen((v) => !v)
                  setNotifOpen(false)
                }}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <span className="w-10 h-10 rounded-full bg-[#94e400]/15 border-2 border-[#94e400] text-[#94e400] font-bold text-sm flex items-center justify-center">
                  {initials}
                </span>
                <ChevronDown size={16} className="text-white/70" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-[200px] bg-[#94e400] text-black rounded-2xl overflow-hidden shadow-2xl z-50">
                  <button
                    onClick={goToProfile}
                    className="w-full flex items-center gap-3 px-5 py-3 font-semibold text-sm hover:bg-[#86d100] cursor-pointer border-b border-black/30"
                  >
                    <UserIcon size={16} />
                    Meu Perfil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-5 py-3 font-semibold text-sm hover:bg-[#86d100] cursor-pointer"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Linha divisória + badge de status */}
        <div className="px-10">
          <div className="flex items-center justify-between pb-4">
            {naoLidas > 0 ? (
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[#94e400]/15 flex items-center justify-center">
                  <Bell size={14} className="text-[#94e400]" />
                </span>
                <span className="text-[#94e400] font-medium text-sm">
                  Você tem {naoLidas} notificação{naoLidas > 1 ? 'ões' : ''} não lida{naoLidas > 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              <span />
            )}
          </div>
          <div className="h-px bg-white/10" />
        </div>

        <main className="flex-1 px-10 py-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
