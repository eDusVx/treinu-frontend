import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Dumbbell,
  History,
  Minus,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout'
import Modal from '../../components/Modal'
import { useAuth } from '../../hooks'
import { alunoService } from '../../services/aluno.service'
import { execucaoTreinoService } from '../../services/execucaoTreino.service'
import { treinosService } from '../../services/treinos.service'
import type {
  ClassificacaoIMC,
  DashboardEvolucaoItem,
  EvolucaoFisicaResponse,
  EvolucaoMedida,
  ExecucaoTreinoDto,
  MetaDto,
  TipoMetaEnum,
  TreinoDto,
} from '../../types'
import { extractError, formatarDataPtBr, formatHora } from '../../utils'

const TIPO_META_LABEL: Record<TipoMetaEnum, string> = {
  PESO: 'Peso',
  GORDURA: '% Gordura',
  BRACO_ESQUERDO: 'Braço esquerdo',
  BRACO_DIREITO: 'Braço direito',
  PERNA_ESQUERDA: 'Perna esquerda',
  PERNA_DIREITA: 'Perna direita',
  CINTURA: 'Cintura',
  QUADRIL: 'Quadril',
  PEITO: 'Peito',
  PANTURRILHA_ESQUERDA: 'Panturrilha esq.',
  PANTURRILHA_DIREITA: 'Panturrilha dir.',
  PESCOCO: 'Pescoço',
  OMBROS: 'Ombros',
}

// Chave do dicionário de evolucao-fisica é lowercase do enum (ex.: "peso",
// "braco_esquerdo"). Mantemos um lookup pra título amigável.
const EVOLUCAO_KEY_LABEL: Record<string, string> = {
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

function EvolucaoMedidaCard({ chave, dados }: { chave: string; dados: EvolucaoMedida }) {
  const titulo = EVOLUCAO_KEY_LABEL[chave] ?? chave
  const sufixo = chave === 'peso' ? ' kg' : chave === 'gordura' ? '%' : ' cm'
  const semHistorico = dados.historico.length === 0
  // Para perda (peso/gordura/cintura), descer é positivo. Para outras medidas
  // de massa, subir é positivo. Sem contexto da intenção do aluno, usamos a
  // tendência do backend pra colorir neutro e deixar o usuário interpretar.
  const tendenciaIcone =
    dados.tendencia === 'SUBINDO' ? (
      <ArrowUp size={14} className="text-yellow-400" />
    ) : dados.tendencia === 'DESCENDO' ? (
      <ArrowDown size={14} className="text-[#94e400]" />
    ) : (
      <Minus size={14} className="text-white/40" />
    )
  return (
    <div className="bg-[#0d100e] border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
      <span className="text-white/50 text-[10px] uppercase tracking-wider">{titulo}</span>
      {semHistorico ? (
        <p className="text-white/40 text-xs italic mt-1">Sem registros</p>
      ) : (
        <>
          <p className="text-white font-bold text-2xl leading-tight">
            {dados.ultimoValor.toFixed(1).replace('.', ',')}
            <span className="text-sm font-normal text-white/60">{sufixo}</span>
          </p>
          <div className="flex items-center gap-1.5 text-xs">
            {tendenciaIcone}
            <span
              className={
                dados.deltaAbsoluto > 0
                  ? 'text-yellow-400'
                  : dados.deltaAbsoluto < 0
                    ? 'text-[#94e400]'
                    : 'text-white/50'
              }
            >
              {dados.deltaAbsoluto > 0 ? '+' : ''}
              {dados.deltaAbsoluto.toFixed(1).replace('.', ',')}
              {sufixo}
            </span>
            <span className="text-white/40">
              ({dados.deltaPercentual > 0 ? '+' : ''}
              {dados.deltaPercentual.toFixed(1)}%)
            </span>
          </div>
          {dados.meta && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-white/50">
                  Meta: {Number(dados.meta.valorAlvo).toFixed(1).replace('.', ',')}
                  {sufixo}
                </span>
                <span
                  className={
                    dados.meta.status === 'CONCLUIDA'
                      ? 'text-[#94e400] font-semibold'
                      : 'text-white/60'
                  }
                >
                  {dados.meta.progresso.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    dados.meta.status === 'CONCLUIDA' ? 'bg-[#94e400]' : 'bg-[#94e400]/60'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, dados.meta.progresso))}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const CLASSIFICACAO_LABEL: Record<ClassificacaoIMC, string> = {
  ABAIXO_DO_PESO: 'Abaixo do peso',
  PESO_NORMAL: 'Peso normal',
  SOBREPESO: 'Sobrepeso',
  OBESIDADE_GRAU_I: 'Obesidade grau I',
  OBESIDADE_GRAU_II: 'Obesidade grau II',
  OBESIDADE_GRAU_III: 'Obesidade grau III',
  OUTRO: 'Outro',
}

const CLASSIFICACAO_COR: Record<ClassificacaoIMC, string> = {
  ABAIXO_DO_PESO: 'text-yellow-300',
  PESO_NORMAL: 'text-[#94e400]',
  SOBREPESO: 'text-yellow-400',
  OBESIDADE_GRAU_I: 'text-orange-400',
  OBESIDADE_GRAU_II: 'text-red-400',
  OBESIDADE_GRAU_III: 'text-red-500',
  OUTRO: 'text-white/60',
}

export default function EvolucaoPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<DashboardEvolucaoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [historico, setHistorico] = useState<ExecucaoTreinoDto[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [erroHistorico, setErroHistorico] = useState('')

  // Modal de detalhes de uma execução específica (GET /api/v1/execucoes-treino/{id}).
  // Fica null quando o modal está fechado.
  const [detalhes, setDetalhes] = useState<ExecucaoTreinoDto | null>(null)
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false)
  const [erroDetalhes, setErroDetalhes] = useState('')

  // Treinos do aluno — usado pra resolver `itemTreinoId` em `{ nome, ordem }`
  // já que o DTO de ExecucaoExercicio só devolve IDs, sem nome do exercício.
  const [treinos, setTreinos] = useState<TreinoDto[]>([])

  // Evolução física consolidada — GET /api/aluno/me/evolucao-fisica
  const [evolucaoFisica, setEvolucaoFisica] = useState<EvolucaoFisicaResponse | null>(null)
  const [carregandoEvolucao, setCarregandoEvolucao] = useState(true)
  const [erroEvolucao, setErroEvolucao] = useState('')

  // Metas — GET /api/aluno/{id}/metas
  const [metas, setMetas] = useState<MetaDto[]>([])
  const [carregandoMetas, setCarregandoMetas] = useState(true)
  const [erroMetas, setErroMetas] = useState('')

  const carregar = useCallback(() => {
    setLoading(true)
    setErro('')
    alunoService
      .meuDashboard()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setErro(extractError(err) || 'Não foi possível carregar sua evolução.'))
      .finally(() => setLoading(false))
  }, [])

  const carregarHistorico = useCallback(() => {
    if (!user?.id) return
    setLoadingHistorico(true)
    setErroHistorico('')
    execucaoTreinoService
      .historico(user.id)
      .then((data) => setHistorico(Array.isArray(data) ? data : []))
      .catch((err) =>
        setErroHistorico(extractError(err) || 'Não foi possível carregar o histórico de treinos.'),
      )
      .finally(() => setLoadingHistorico(false))
  }, [user?.id])

  useEffect(() => {
    carregar()
    carregarHistorico()
    // Carrega os treinos do aluno em paralelo. Usado só pra resolver nomes
    // de exercício no modal de detalhes — falha silenciosamente porque o resto
    // da página não depende disso.
    if (user?.id) {
      treinosService
        .listar({ alunoId: user.id })
        .then((data) => setTreinos(Array.isArray(data) ? data : []))
        .catch(() => setTreinos([]))

      setCarregandoEvolucao(true)
      setErroEvolucao('')
      alunoService
        .minhaEvolucaoFisica()
        .then((data) => setEvolucaoFisica(data || {}))
        .catch((err) =>
          setErroEvolucao(extractError(err) || 'Não foi possível carregar a evolução física.'),
        )
        .finally(() => setCarregandoEvolucao(false))

      setCarregandoMetas(true)
      setErroMetas('')
      alunoService
        .listarMetas(user.id)
        .then((data) => setMetas(Array.isArray(data) ? data : []))
        .catch((err) =>
          setErroMetas(extractError(err) || 'Não foi possível carregar suas metas.'),
        )
        .finally(() => setCarregandoMetas(false))
    }
  }, [carregar, carregarHistorico, user?.id])

  // Métricas com histórico, na ordem semântica do enum no backend.
  const metricasOrdenadas = useMemo<[string, EvolucaoMedida][]>(() => {
    if (!evolucaoFisica) return []
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
    return ordem
      .filter((k) => evolucaoFisica[k])
      .map((k) => [k, evolucaoFisica[k]] as [string, EvolucaoMedida])
  }, [evolucaoFisica])

  const metasAtivas = useMemo(() => metas.filter((m) => m.ativa), [metas])

  // Lookup table itemTreinoId → { nome, ordem }. Construído uma vez quando
  // `treinos` muda, evitando varredura O(n) por exercício no render do modal.
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

  const historicoOrdenado = useMemo(
    () =>
      [...historico].sort(
        (a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime(),
      ),
    [historico],
  )

  // Mostra cached do histórico imediatamente para o usuário não ver um flash de
  // loading, e refresca via GET /{id} para garantir consistência (back pode ter
  // mudado entre o /historico e o clique).
  async function abrirDetalhes(execucao: ExecucaoTreinoDto) {
    setDetalhes(execucao)
    setErroDetalhes('')
    setCarregandoDetalhes(true)
    try {
      const fresh = await execucaoTreinoService.detalhes(execucao.id)
      setDetalhes(fresh)
    } catch (err) {
      setErroDetalhes(extractError(err) || 'Não foi possível carregar os detalhes.')
    } finally {
      setCarregandoDetalhes(false)
    }
  }

  function fecharDetalhes() {
    setDetalhes(null)
    setErroDetalhes('')
    setCarregandoDetalhes(false)
  }

  return (
    <DashboardLayout>
      {/* Evolução física consolidada — GET /api/aluno/me/evolucao-fisica */}
      <div className="bg-[#272727] rounded-3xl p-6 border border-white/5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-[#94e400]" />
            <h2 className="text-white font-bold text-xl">Evolução física</h2>
          </div>
          <span className="text-white/40 text-xs">Resumo das suas medidas ao longo do tempo</span>
        </div>

        {carregandoEvolucao ? (
          <div className="text-white/50 text-center py-8">Carregando...</div>
        ) : erroEvolucao ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3">
            {erroEvolucao}
          </div>
        ) : metricasOrdenadas.length === 0 ? (
          <div className="text-white/50 text-center py-8">
            Registre avaliações para acompanhar sua evolução de peso, gordura e medidas.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {metricasOrdenadas.map(([chave, dados]) => (
              <EvolucaoMedidaCard key={chave} chave={chave} dados={dados} />
            ))}
          </div>
        )}
      </div>

      {/* Minhas metas — GET /api/aluno/{id}/metas */}
      <div className="bg-[#272727] rounded-3xl p-6 border border-white/5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-[#94e400]" />
            <h2 className="text-white font-bold text-xl">Minhas metas</h2>
          </div>
          <span className="text-white/40 text-xs">
            {metasAtivas.length} ativa{metasAtivas.length === 1 ? '' : 's'} · {metas.length} total
          </span>
        </div>

        {carregandoMetas ? (
          <div className="text-white/50 text-center py-8">Carregando...</div>
        ) : erroMetas ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3">
            {erroMetas}
          </div>
        ) : metas.length === 0 ? (
          <div className="text-white/50 text-center py-8">
            Seu treinador ainda não cadastrou metas pra você. Quando cadastrar, elas aparecem aqui
            com o progresso calculado a partir das suas avaliações.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...metas]
              .sort((a, b) => Number(b.ativa) - Number(a.ativa))
              .map((m) => {
                const sufixo = m.tipo === 'PESO' ? ' kg' : m.tipo === 'GORDURA' ? '%' : ' cm'
                return (
                  <div
                    key={m.id}
                    className={`bg-[#0d100e] border rounded-2xl p-4 flex flex-col gap-2 ${
                      m.ativa ? 'border-[#94e400]/30' : 'border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold text-sm">
                        {TIPO_META_LABEL[m.tipo]}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          m.ativa
                            ? 'bg-[#94e400]/20 text-[#94e400]'
                            : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {m.ativa ? 'Ativa' : 'Encerrada'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-white/50 text-xs">Alvo:</span>
                      <span className="text-white font-bold text-lg">
                        {Number(m.valorAlvo).toFixed(1).replace('.', ',')}
                      </span>
                      <span className="text-white/60 text-xs">{sufixo}</span>
                    </div>
                    <span className="text-white/50 text-xs">
                      Até {formatarDataPtBr(m.dataLimite)}
                    </span>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      <div className="bg-[#272727] rounded-3xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-[#94e400]" />
            <h2 className="text-white font-bold text-xl">Histórico de avaliações</h2>
          </div>
          <button
            onClick={carregar}
            disabled={loading}
            className="text-[#94e400] hover:text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="text-white/50 text-center py-12">Carregando...</div>
        ) : erro ? (
          <div className="text-red-400 text-center py-12">{erro}</div>
        ) : items.length === 0 ? (
          <div className="text-white/50 text-center py-12">
            Nenhuma avaliação registrada ainda. Peça ao seu treinador para registrar sua primeira avaliação.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {[...items]
              .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
              .map((it) => {
              const det = it.detalhes
              return (
                <div key={it.id} className="bg-[#0d100e] border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#94e400] font-bold text-xs uppercase tracking-wider">{it.tipo}</span>
                    <span className="text-white/50 text-xs">
                      {formatarDataPtBr(it.data)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {det?.peso != null && (
                      <div>
                        <span className="text-white/50 text-xs uppercase">Peso</span>
                        <p className="text-white font-bold text-2xl">
                          {det.peso}
                          <span className="text-sm ml-1">kg</span>
                        </p>
                      </div>
                    )}
                    {det?.altura != null && (
                      <div>
                        <span className="text-white/50 text-xs uppercase">Altura</span>
                        <p className="text-white font-bold text-2xl">
                          {det.altura}
                          <span className="text-sm ml-1">m</span>
                        </p>
                      </div>
                    )}
                    {det?.imc != null && (
                      <div>
                        <span className="text-white/50 text-xs uppercase">IMC</span>
                        <p className="text-white font-bold text-2xl">{det.imc.toFixed(1)}</p>
                      </div>
                    )}
                    {det?.classificacao && (
                      <div>
                        <span className="text-white/50 text-xs uppercase">Classificação</span>
                        <p className={`font-bold text-sm mt-2 ${CLASSIFICACAO_COR[det.classificacao] ?? 'text-white'}`}>
                          {CLASSIFICACAO_LABEL[det.classificacao] ?? det.classificacao}
                        </p>
                      </div>
                    )}
                  </div>
                  {det?.medidas && det.medidas.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                      {det.medidas.map((m) => (
                        <span
                          key={m.id}
                          className="bg-white/5 text-white/70 text-xs font-medium px-3 py-1 rounded-full"
                        >
                          {m.chave.replace(/_/g, ' ')}: {m.valor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Histórico de execuções de treino */}
      <div className="bg-[#272727] rounded-3xl p-6 border border-white/5 mt-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <History size={20} className="text-[#94e400]" />
            <h2 className="text-white font-bold text-xl">Histórico de treinos</h2>
          </div>
          <button
            onClick={carregarHistorico}
            disabled={loadingHistorico}
            className="text-[#94e400] hover:text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={loadingHistorico ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {loadingHistorico ? (
          <div className="text-white/50 text-center py-8">Carregando...</div>
        ) : erroHistorico ? (
          <div className="text-red-400 text-center py-8">{erroHistorico}</div>
        ) : historicoOrdenado.length === 0 ? (
          <div className="text-white/50 text-center py-8">
            Nenhum treino executado ainda. Inicie um treino pela tela{' '}
            <span className="text-[#94e400]">Meus Treinos</span> para começar a acompanhar.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {historicoOrdenado.map((ex) => {
              const qtdExercicios = ex.exercicios?.length ?? 0
              // Back-end calcula pontuação como 10 por execução concluída (ver
              // PlataformaRepository.ObterRankingAlunosAsync). Não é persistido
              // por execução, então derivamos aqui apenas para exibição.
              const pontos = ex.concluido ? 10 : null
              return (
                <button
                  key={ex.id}
                  onClick={() => abrirDetalhes(ex)}
                  className="text-left bg-[#0d100e] border border-white/5 rounded-2xl p-5 hover:border-[#94e400]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Dumbbell size={16} className="text-[#94e400]" />
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
                        {qtdExercicios} exercício{qtdExercicios === 1 ? '' : 's'}
                      </span>
                      {pontos != null && (
                        <span className="text-[#94e400] font-semibold">+{pontos} pts</span>
                      )}
                      {ex.notaFeedback != null && <span>Esforço: {ex.notaFeedback}/5</span>}
                    </div>
                  </div>
                  {ex.comentarioFeedback && (
                    <p className="text-white/60 text-xs italic">"{ex.comentarioFeedback}"</p>
                  )}
                  <span className="text-[#94e400] text-[11px] font-medium mt-3 inline-block">
                    Ver detalhes →
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de detalhes da execução — GET /api/v1/execucoes-treino/{id} */}
      <Modal
        open={detalhes != null}
        onClose={fecharDetalhes}
        title="Detalhes do treino"
        width="lg"
      >
        {detalhes && (
          <div className="flex flex-col gap-5">
            {/* Cabeçalho */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Dumbbell size={18} className="text-[#94e400]" />
                <span className="text-white font-semibold">
                  {formatarDataPtBr(detalhes.dataInicio)}
                </span>
                {detalhes.concluido ? (
                  <span className="bg-[#94e400]/20 text-[#94e400] text-[10px] font-bold uppercase rounded-full px-2 py-0.5">
                    Concluído
                  </span>
                ) : (
                  <span className="bg-yellow-400/20 text-yellow-300 text-[10px] font-bold uppercase rounded-full px-2 py-0.5">
                    Em andamento
                  </span>
                )}
                {carregandoDetalhes && (
                  <span className="text-white/40 text-[11px]">atualizando…</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-white/60 text-xs">
                <span>Início: {formatHora(detalhes.dataInicio)}</span>
                {detalhes.dataFim && <span>Fim: {formatHora(detalhes.dataFim)}</span>}
              </div>
            </div>

            {/* Feedback */}
            {(detalhes.notaFeedback != null || detalhes.comentarioFeedback) && (
              <div className="bg-[#0d100e] border border-white/5 rounded-2xl p-4">
                <span className="text-white/50 text-[10px] uppercase tracking-wider font-bold">
                  Feedback do aluno
                </span>
                {detalhes.notaFeedback != null && (
                  <p className="text-white text-sm mt-1">
                    Esforço percebido:{' '}
                    <span className="text-[#94e400] font-bold">
                      {detalhes.notaFeedback}/5
                    </span>
                  </p>
                )}
                {detalhes.comentarioFeedback && (
                  <p className="text-white/70 text-sm italic mt-2">
                    "{detalhes.comentarioFeedback}"
                  </p>
                )}
              </div>
            )}

            {/* Exercícios executados */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold text-sm">
                  Exercícios executados
                </h3>
                <span className="text-white/40 text-xs">
                  {detalhes.exercicios?.length ?? 0} registrado
                  {(detalhes.exercicios?.length ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
              {detalhes.exercicios && detalhes.exercicios.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {[...detalhes.exercicios]
                    .map((item) => ({ ...item, info: itensLookup.get(item.itemTreinoId) }))
                    // Ordena pela ordem original do treino quando disponível;
                    // exercícios não encontrados no lookup vão pro fim.
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
                <div className="text-white/50 text-sm text-center py-4">
                  Nenhum exercício foi registrado nesta execução.
                </div>
              )}
            </div>

            {erroDetalhes && (
              <p className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3">
                {erroDetalhes}
              </p>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
