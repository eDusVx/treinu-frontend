// ─── Enums (espelham o backend exato) ────────────────────────────────────────

export type UserRole = 'ADMIN' | 'TREINADOR' | 'ALUNO'

export type GeneroEnum = 'MASCULINO' | 'FEMININO'

export type ObjetivoEnum =
  | 'EMAGRECIMENTO'
  | 'HIPERTROFIA'
  | 'SAUDE'
  | 'PERFORMANCE'
  | 'REABILITACAO'
  | 'OUTROS'

export type TipoContatoEnum = 'TELEFONE' | 'REDE_SOCIAL' | 'SITE'

export type PlataformaRedeSocialEnum = 'INSTAGRAM' | 'FACEBOOK' | 'TWITTER' | 'EMAIL'

export type PerfilEnum = 'ALUNO' | 'TREINADOR' | 'ADMIN'

export type ChaveMedidaEnum =
  | 'BRACO_ESQUERDO'
  | 'BRACO_DIREITO'
  | 'PERNA_ESQUERDA'
  | 'PERNA_DIREITA'
  | 'CINTURA'
  | 'QUADRIL'
  | 'PEITO'
  | 'PANTURRILHA_ESQUERDA'
  | 'PANTURRILHA_DIREITA'
  | 'PESCOCO'
  | 'OMBROS'

// ─── Auth ─────────────────────────────────────────────────────────────────────
// ASP.NET Core serializa respostas em camelCase por padrão (JsonMvcOptionsSetup)

export interface TokenDto {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  email: string
  nome: string
  role: UserRole
}

// ─── Paginação ────────────────────────────────────────────────────────────────
// ASP.NET Core serializa PaginationResponse<T> em camelCase

export interface PaginationResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Usuário ──────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string
  nomeCompleto: string
  email: string
  perfil: PerfilEnum
  ativo: boolean
}

// ─── Cadastro ─────────────────────────────────────────────────────────────────

export interface RegisterAlunoPayload {
  nomeCompleto: string
  email: string
  senha: string
  dataNascimento: string
  genero: GeneroEnum
  cpf: string
  aceiteTermoAdesao: boolean
  objetivo: ObjetivoEnum
  tokenConvite: string
}

export interface RegisterTreinadorPayload {
  nomeCompleto: string
  email: string
  senha: string
  dataNascimento: string
  genero: GeneroEnum
  cpf: string
  aceiteTermoAdesao: boolean
  cref: string
}

// ─── Contato ──────────────────────────────────────────────────────────────────

export interface ContatoPayload {
  tipo: TipoContatoEnum
  valor: string
  descricao?: string
  principal?: boolean
  plataforma?: PlataformaRedeSocialEnum | null
  nomeExibicao?: string | null
}

// ─── Especialização ───────────────────────────────────────────────────────────

export interface EspecializacaoPayload {
  especializacao: string
}

// ─── Avaliação Física (polimórfica) ───────────────────────────────────────────

export interface MedidaDto {
  chave: ChaveMedidaEnum
  valor: number
}

export interface QuestionarioDto {
  tipoAvaliacao: 'QUESTIONARIO'
  data: string
  altura: number
  peso: number
  medidas: MedidaDto[]
  // Backend DTO de ENTRADA mapeia este campo com [JsonPropertyName("gorduraCorporal")]
  // → a propriedade C# (PercentualGordura) só lê do alias "gorduraCorporal" no body.
  // Na RESPOSTA da entidade, o mesmo dado volta como `percentualGordura` (camelCase
  // padrão), por isso AvaliacaoFisicaCompleta tem outra chave.
  gorduraCorporal?: number | null
}

export interface DocumentoDto {
  tipoAvaliacao: 'DOCUMENTO'
  data: string
  nome: string
  arquivo: string
}

export type AvaliacaoFisicaDto = QuestionarioDto | DocumentoDto

// Backend espera o AvaliacaoFisicaDto no root do body (sem wrapper)
export type AvaliacaoPayload = AvaliacaoFisicaDto

// ─── Convite ──────────────────────────────────────────────────────────────────

export interface ConvitePayload {
  email: string
  treinadorId: string
}

// ─── Treinos ──────────────────────────────────────────────────────────────────

export type TreinoStatusEnum = 'ATIVO' | 'VENCIDO'

export interface ItemTreinoPayload {
  exercicioId: string
  series: number
  repeticoes: string
  carga: string
  pausa: string
  observacoes: string
  ordem: number
  divisao: string
}

export interface CriarTreinoPayload {
  nome: string
  descricao: string
  dataInicio: string
  dataFim: string
  treinadorId: string
  alunoId: string
  itens: ItemTreinoPayload[]
  nomeDivisaoA?: string | null
  nomeDivisaoB?: string | null
  nomeDivisaoC?: string | null
  nomeDivisaoD?: string | null
  divisaoSegunda?: string | null
  divisaoTerca?: string | null
  divisaoQuarta?: string | null
  divisaoQuinta?: string | null
  divisaoSexta?: string | null
  divisaoSabado?: string | null
  divisaoDomingo?: string | null
}

export interface ItemTreinoDto {
  id: string
  exercicioId: string
  exercicio?: ExercicioDto
  series: number
  repeticoes: string
  carga: string
  pausa: string
  observacoes: string
  ordem: number
  divisao: string
}

export interface TreinoDto {
  id: string
  nome: string
  descricao: string
  dataInicio: string
  dataFim: string
  status: TreinoStatusEnum
  treinadorId: string
  alunoId: string
  itens: ItemTreinoDto[]
  nomeDivisaoA?: string | null
  nomeDivisaoB?: string | null
  nomeDivisaoC?: string | null
  nomeDivisaoD?: string | null
  divisaoSegunda?: string | null
  divisaoTerca?: string | null
  divisaoQuarta?: string | null
  divisaoQuinta?: string | null
  divisaoSexta?: string | null
  divisaoSabado?: string | null
  divisaoDomingo?: string | null
}

export interface ListarTreinosFiltro {
  alunoId?: string
  treinadorId?: string
  status?: TreinoStatusEnum
}

export interface EditarTreinoPayload {
  nome: string
  descricao: string
  dataInicio: string
  dataFim: string
  nomeDivisaoA?: string | null
  nomeDivisaoB?: string | null
  nomeDivisaoC?: string | null
  nomeDivisaoD?: string | null
  divisaoSegunda?: string | null
  divisaoTerca?: string | null
  divisaoQuarta?: string | null
  divisaoQuinta?: string | null
  divisaoSexta?: string | null
  divisaoSabado?: string | null
  divisaoDomingo?: string | null
}

export interface AdicionarItemTreinoPayload {
  exercicioId: string
  series: number
  repeticoes: string
  carga: string
  pausa: string
  observacoes: string
  ordem: number
  divisao: string
}

// ─── Exercícios ───────────────────────────────────────────────────────────────

export interface RegistrarExercicioPayload {
  nome: string
  descricao: string
  tags: string
  arquivoDemonstracao?: string
  treinadorId: string
}

export interface ExercicioDto {
  id: string
  nome: string
  descricao: string
  tags: string
  arquivoDemonstracao?: string
  treinadorId: string
  criadoEm: string
}

// ─── Notificações ─────────────────────────────────────────────────────────────

export interface NotificacaoDto {
  id: string
  usuarioId: string
  titulo: string
  mensagem: string
  lida: boolean
  criadaEm: string
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type TipoSalaChat = 'Direta' | 'Grupo'

export interface SalaChatDto {
  id: string
  nome: string
  tipo: TipoSalaChat | string
  criadorId?: string | null
  naoLidas: number
  totalParticipantes: number
}

export interface MensagemChatDto {
  id: string
  salaId: string
  remetenteId: string
  nomeRemetente: string
  conteudo: string
  dataEnvio: string
  tipo: string
}

export interface CriarSalaPayload {
  nome: string
  participantesIds: string[]
  ehGrupo: boolean
}

// ─── Dashboard de Evolução ────────────────────────────────────────────────────

export type ClassificacaoIMC =
  | 'ABAIXO_DO_PESO'
  | 'PESO_NORMAL'
  | 'SOBREPESO'
  | 'OBESIDADE_GRAU_I'
  | 'OBESIDADE_GRAU_II'
  | 'OBESIDADE_GRAU_III'
  | 'OUTRO'

export interface AvaliacaoFisicaCompleta {
  id: string
  data: string
  altura: number
  peso: number
  imc: number
  classificacao: ClassificacaoIMC
  medidas: { id: string; chave: ChaveMedidaEnum; valor: number }[]
  percentualGordura?: number | null
}

export interface DashboardEvolucaoItem {
  id: string
  data: string
  tipo: string
  detalhes: AvaliacaoFisicaCompleta
}

export type DashboardEvolucaoResponse = DashboardEvolucaoItem[]

// ─── Aluno DTO completo (resposta de POST/DELETE de contato e avaliação) ──────

export interface ContatoCompleto {
  id: string
  tipo: TipoContatoEnum
  valor: string
  descricao?: string | null
  principal: boolean
  plataforma?: PlataformaRedeSocialEnum | null
  nomeExibicao?: string | null
}

export interface AlunoDtoCompleto {
  id: string
  nomeCompleto: string
  email: string
  dataNascimento: string
  genero: GeneroEnum
  contato: ContatoCompleto[]
  cpf: string
  perfil: PerfilEnum
  ativo: boolean
  aceiteTermoAdesao: boolean
  objetivo: ObjetivoEnum
  avaliacaoFisica: AvaliacaoFisicaCompleta[]
}

export interface TreinadorDtoCompleto {
  id: string
  nomeCompleto: string
  email: string
  dataNascimento: string
  genero: GeneroEnum
  contato: ContatoCompleto[]
  cpf: string
  perfil: PerfilEnum
  ativo: boolean
  aceiteTermoAdesao: boolean
  cref: string
  especializacoes: string[]
}

export type UsuarioCompleto = AlunoDtoCompleto | TreinadorDtoCompleto

export function isAluno(u: UsuarioCompleto): u is AlunoDtoCompleto {
  return u.perfil === 'ALUNO'
}

export function isTreinador(u: UsuarioCompleto): u is TreinadorDtoCompleto {
  return u.perfil === 'TREINADOR'
}

// ─── Execução de Treino (tracking em tempo real) ─────────────────────────────

export interface IniciarExecucaoPayload {
  treinoId: string
}

export interface IniciarExecucaoResponse {
  execucaoTreinoId: string
}

export interface RegistrarExercicioExecutadoPayload {
  itemTreinoId: string
  seriesRealizadas: number
  repeticoesRealizadas: number
  cargaUtilizada: number
}

export interface ConcluirExecucaoPayload {
  notaFeedback?: number | null
  comentarioFeedback?: string | null
}

// Espelha Treinu.Domain.Dtos.ExecucaoExercicioDto.
export interface ExecucaoExercicioDto {
  id: string
  itemTreinoId: string
  seriesRealizadas: number
  repeticoesRealizadas: number
  cargaUtilizada: number
}

// Espelha Treinu.Domain.Dtos.ExecucaoTreinoDto.
export interface ExecucaoTreinoDto {
  id: string
  treinoId: string
  alunoId: string
  dataInicio: string
  dataFim?: string | null
  concluido: boolean
  notaFeedback?: number | null
  comentarioFeedback?: string | null
  exercicios: ExecucaoExercicioDto[]
}

export interface FeedbackTreinoDto {
  execucaoTreinoId: string
  alunoId: string
  nomeAluno: string
  nomeTreino: string
  nota: number | null
  comentario: string | null
  dataFim: string
}

// ─── Plataforma ───────────────────────────────────────────────────────────────

export interface SugestaoPayload {
  titulo: string
  descricao: string
}

export interface AvaliacaoPlataformaPayload {
  nota: number
  comentario?: string
}

export interface RankingAlunoItem {
  alunoId: string
  nomeAluno: string
  treinosConcluidos: number
  pontuacaoTotal: number
}

// ─── Configurações de notificação ─────────────────────────────────────────────
// Backend retorna defaults `true` para todos os campos quando o usuário ainda
// não personalizou (ver ConfiguracaoNotificacao.CriarPadrao).

export interface ConfigurarNotificacoesPayload {
  receberEmail: boolean
  receberPush: boolean
  alertaVencimentoAvaliacao: boolean
  alertaVencimentoTreino: boolean
  alertaNovoTreino: boolean
}

// ─── Metas (TipoMetaEnum espelha Treinu.Domain.Enums.TipoMetaEnum) ────────────

export type TipoMetaEnum =
  | 'PESO'
  | 'GORDURA'
  | 'BRACO_ESQUERDO'
  | 'BRACO_DIREITO'
  | 'PERNA_ESQUERDA'
  | 'PERNA_DIREITA'
  | 'CINTURA'
  | 'QUADRIL'
  | 'PEITO'
  | 'PANTURRILHA_ESQUERDA'
  | 'PANTURRILHA_DIREITA'
  | 'PESCOCO'
  | 'OMBROS'

export interface MetaDto {
  id: string
  alunoId: string
  tipo: TipoMetaEnum
  valorAlvo: number
  dataLimite: string
  dataCriacao: string
  ativa: boolean
}

export interface CadastrarMetaPayload {
  tipo: TipoMetaEnum
  valorAlvo: number
  // ISO date — backend converte para UTC e exige >= hoje + 1 dia
  dataLimite: string
}

// ─── Evolução física consolidada ──────────────────────────────────────────────
// Backend devolve Dictionary<string, EvolucaoMedidaDto> com chaves lowercase:
// "peso", "gordura", "braco_esquerdo", "braco_direito", "perna_esquerda", etc.

export type TendenciaEvolucao = 'SUBINDO' | 'DESCENDO' | 'ESTAVEL'
export type StatusMetaEvolucao = 'CONCLUIDA' | 'PENDENTE'

export interface HistoricoValor {
  date: string
  value: number
}

export interface MetaEvolucaoInfo {
  id: string
  valorAlvo: number
  dataLimite: string
  status: StatusMetaEvolucao
  // 0–100
  progresso: number
}

export interface EvolucaoMedida {
  historico: HistoricoValor[]
  ultimoValor: number
  deltaAbsoluto: number
  deltaPercentual: number
  tendencia: TendenciaEvolucao
  meta: MetaEvolucaoInfo | null
}

export type EvolucaoFisicaResponse = Record<string, EvolucaoMedida>

// ─── Comparativo de performance dos alunos ────────────────────────────────────

export interface ComparativoHistoricoItem {
  periodo: string
  total: number
  concluidos: number
  taxaConclusao: number
}

export interface ComparativoAlunoItem {
  id: string
  nomeAluno: string
  totalTreinos: number
  treinosConcluidos: number
  // 0–100
  taxaConclusao: number
  // Só vem preenchido quando o caller passa agrupamento=semana|mes
  historico: ComparativoHistoricoItem[] | null
}

// ─── Métricas da plataforma (admin) ───────────────────────────────────────────

export interface MetricasPlataforma {
  usuariosAtivos: {
    alunos: number
    treinadores: number
    total: number
  }
  volumesPeriodo: {
    novosCadastros: number
    treinosCriados: number
    treinosConcluidos: number
  }
  engajamentoGeral: {
    totalLogins: number
    totalMensagensChat: number
    totalSubmissoes: number
    scoreGeral: number
  }
}
