// Utilitários para evitar bug de timezone com input type="date".
// Backend persiste DateTime; o input só dá "YYYY-MM-DD".

/** Converte "YYYY-MM-DD" em ISO string fixando 12:00 LOCAL para evitar rollover de dia. */
export function dateInputParaIso(yyyymmdd: string): string {
  if (!yyyymmdd) return new Date().toISOString()
  // "2026-04-27T12:00:00" — interpretado como local; toISOString() converte para UTC sem trocar de dia em fusos -12 a +12.
  const d = new Date(`${yyyymmdd}T12:00:00`)
  return d.toISOString()
}

/** Formata uma string ISO vinda do backend exibindo o DIA ORIGINAL, ignorando o fuso. */
export function formatarDataPtBr(iso?: string | null): string {
  if (!iso) return ''
  // Se vier "2026-04-27T00:00:00Z", pegamos só a parte de data — assim a UI mostra o dia que o usuário escolheu.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  // Fallback: usa Date local
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR')
}

/** Iniciais "JM" a partir de um nome completo (ou as 2 primeiras letras se for uma palavra só). */
export function getInitials(input?: string): string {
  if (!input) return '?'
  const parts = input.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Hora "HH:mm" pt-BR. Retorna string vazia se ISO inválida. */
export function formatHora(iso?: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/** Extrai mensagem de erro do response do axios — tenta detail, depois primeiro field error. */
export function extractError(err: unknown): string {
  const e = err as {
    response?: { data?: { detail?: string; errors?: Record<string, string[]> } }
  }
  const detail = e.response?.data?.detail
  const errors = e.response?.data?.errors
  const firstFieldError = errors ? Object.values(errors).flat()[0] : undefined
  return detail || firstFieldError || ''
}

export const isYoutube = (url?: string): boolean => {
  if (!url) return false
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i
  return ytRegex.test(url)
}

export const isDirectVideo = (url?: string): boolean => {
  if (!url) return false
  return /\.(mp4|webm|ogg|mov)$/i.test(url)
}

export const isDirectImage = (url?: string): boolean => {
  if (!url) return false
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(url)
}

export function obterThumbVideo(url?: string): string | null {
  if (!url) return null
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i
  const match = url.match(ytRegex)
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
  }
  return null
}

