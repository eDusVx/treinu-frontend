import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  titulo: string
  descricao: string
  children?: ReactNode
}

export default function PlaceholderCard({ icon: Icon, titulo, descricao, children }: Props) {
  return (
    <div className="bg-[#272727] border-2 border-[#4d4d4d] border-dashed rounded-3xl p-12 flex flex-col items-center text-center gap-4">
      <span className="w-20 h-20 rounded-full bg-[#94e400]/10 flex items-center justify-center">
        <Icon size={36} className="text-[#94e400]" />
      </span>
      <h2 className="text-white font-bold text-2xl">{titulo}</h2>
      <p className="text-white/60 max-w-md leading-relaxed">{descricao}</p>
      <span className="inline-block bg-[#94e400]/15 text-[#94e400] font-semibold text-xs uppercase tracking-wider px-4 py-1.5 rounded-full">
        Em breve · funcionalidade futura
      </span>
      {children}
    </div>
  )
}
