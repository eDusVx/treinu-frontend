import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'

// Públicas — costumam ser a primeira tela acessada, vale lazy também para
// não carregar tudo de uma vez no cold start.
const LandingPage = lazy(() => import('../pages/Landing'))
const LoginPage = lazy(() => import('../pages/Login'))
const RecuperarSenhaPage = lazy(() => import('../pages/RecuperarSenha'))
const LoginCodigoPage = lazy(() => import('../pages/LoginCodigo'))
const CadastroAlunoPage = lazy(() => import('../pages/CadastroAluno'))
const CadastroTreinadorPage = lazy(() => import('../pages/CadastroTreinador'))

// Privadas
const DashboardAlunoPage = lazy(() => import('../pages/Dashboard/Aluno'))
const DashboardTreinadorPage = lazy(() => import('../pages/Dashboard/Treinador'))
const DashboardAdminPage = lazy(() => import('../pages/Dashboard/Admin'))
const UsuariosPage = lazy(() => import('../pages/Usuarios'))
const AprovacaoTreinadoresPage = lazy(() => import('../pages/AprovacaoTreinadores'))
const TreinosAlunoPage = lazy(() => import('../pages/Treinos/Aluno'))
const TreinosTreinadorPage = lazy(() => import('../pages/Treinos/Treinador'))
const TreinosAdminPage = lazy(() => import('../pages/Treinos/Admin'))
const ExerciciosPage = lazy(() => import('../pages/Exercicios'))
const ExerciciosAdminPage = lazy(() => import('../pages/Exercicios/Admin'))
const EvolucaoPage = lazy(() => import('../pages/Evolucao'))
const AvaliacaoAlunoPage = lazy(() => import('../pages/Avaliacao/Aluno'))
const DietaPage = lazy(() => import('../pages/Dieta'))
// Mensagens é o chunk mais pesado (puxa @microsoft/signalr) — carrega só sob demanda.
const MensagensPage = lazy(() => import('../pages/Mensagens'))
const ArquivosPage = lazy(() => import('../pages/Arquivos'))
const ConfiguracoesPage = lazy(() => import('../pages/Configuracoes'))
const ConvidarAlunoPage = lazy(() => import('../pages/Convidar'))

function FullPageLoading() {
  return (
    <div className="min-h-screen bg-[#0d100e] flex items-center justify-center">
      <div className="flex items-center gap-3 text-white/60">
        <span className="w-5 h-5 rounded-full border-2 border-[#94e400] border-t-transparent animate-spin" />
        <span className="text-sm font-medium">Carregando…</span>
      </div>
    </div>
  )
}

export default function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageLoading />}>
        <Routes>
          {/* Raiz - Landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Rotas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
          <Route path="/login-codigo" element={<LoginCodigoPage />} />
          <Route path="/cadastro/aluno/:token" element={<CadastroAlunoPage />} />
          <Route path="/cadastro/treinador" element={<CadastroTreinadorPage />} />

          {/* Rotas privadas - Aluno */}
          <Route path="/aluno/dashboard" element={<PrivateRoute component={DashboardAlunoPage} roles={['ALUNO']} />} />
          <Route path="/aluno/treinos" element={<PrivateRoute component={TreinosAlunoPage} roles={['ALUNO']} />} />
          <Route path="/aluno/dieta" element={<PrivateRoute component={DietaPage} roles={['ALUNO']} />} />
          <Route path="/aluno/evolucao" element={<PrivateRoute component={EvolucaoPage} roles={['ALUNO']} />} />
          <Route path="/aluno/mensagens" element={<PrivateRoute component={MensagensPage} roles={['ALUNO']} />} />
          <Route path="/aluno/avaliacao" element={<PrivateRoute component={AvaliacaoAlunoPage} roles={['ALUNO']} />} />
          <Route path="/aluno/arquivos" element={<PrivateRoute component={ArquivosPage} roles={['ALUNO']} />} />

          {/* Rotas privadas - Treinador */}
          <Route path="/treinador/dashboard" element={<PrivateRoute component={DashboardTreinadorPage} roles={['TREINADOR']} />} />
          <Route path="/treinador/treinos" element={<PrivateRoute component={TreinosTreinadorPage} roles={['TREINADOR']} />} />
          <Route path="/treinador/exercicios" element={<PrivateRoute component={ExerciciosPage} roles={['TREINADOR']} />} />
          <Route path="/treinador/mensagens" element={<PrivateRoute component={MensagensPage} roles={['TREINADOR']} />} />
          <Route path="/treinador/convidar" element={<PrivateRoute component={ConvidarAlunoPage} roles={['TREINADOR']} />} />

          {/* Rotas privadas - Admin */}
          <Route path="/admin/dashboard" element={<PrivateRoute component={DashboardAdminPage} roles={['ADMIN']} />} />
          <Route path="/admin/aprovacao-treinadores" element={<PrivateRoute component={AprovacaoTreinadoresPage} roles={['ADMIN']} />} />
          <Route path="/admin/treinos" element={<PrivateRoute component={TreinosAdminPage} roles={['ADMIN']} />} />
          <Route path="/admin/exercicios" element={<PrivateRoute component={ExerciciosAdminPage} roles={['ADMIN']} />} />
          <Route path="/admin/convidar" element={<PrivateRoute component={ConvidarAlunoPage} roles={['ADMIN']} />} />

          {/* Rotas compartilhadas - Admin e Treinador */}
          <Route path="/usuarios" element={<PrivateRoute component={UsuariosPage} roles={['ADMIN', 'TREINADOR']} />} />

          {/* Rotas compartilhadas - todos os perfis autenticados */}
          <Route path="/configuracoes" element={<PrivateRoute component={ConfiguracoesPage} roles={['ADMIN', 'TREINADOR', 'ALUNO']} />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
