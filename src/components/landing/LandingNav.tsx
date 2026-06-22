import { Link } from 'react-router-dom'

interface Props {
  onScrollTo: (target: 'topo' | 'metodologia' | 'como-funciona') => void
}

export default function LandingNav({ onScrollTo }: Props) {
  return (
    <nav className="absolute top-0 left-0 right-0 z-50 px-[3vw] py-[1.6vh] flex items-center justify-between font-['Montserrat',sans-serif]">
      <button
        onClick={() => onScrollTo('topo')}
        className="text-[#e9e9e9] font-extrabold text-[1.6vw] tracking-tight cursor-pointer"
      >
        Treinu
      </button>

      <div className="flex items-center gap-[3vw]">
        <button
          onClick={() => onScrollTo('topo')}
          className="text-[#e9e9e9] font-extrabold text-[1.1vw] cursor-pointer hover:text-[#94e400] transition-colors"
        >
          Início
        </button>
        <button
          onClick={() => onScrollTo('metodologia')}
          className="text-[#e9e9e9] font-extrabold text-[1.1vw] cursor-pointer hover:text-[#94e400] transition-colors"
        >
          A Metodologia
        </button>
        <button
          onClick={() => onScrollTo('como-funciona')}
          className="text-[#e9e9e9] font-extrabold text-[1.1vw] cursor-pointer hover:text-[#94e400] transition-colors"
        >
          Como Funciona
        </button>
      </div>

      <div className="flex items-center gap-[1.5vw]">
        <Link
          to="/login"
          className="text-[#e9e9e9] font-extrabold text-[1.1vw] hover:text-[#94e400] transition-colors"
        >
          Login
        </Link>
        <Link
          to="/cadastro/treinador"
          className="bg-[#e9e9e9] text-black font-extrabold rounded-full px-[1.8vw] py-[1.4vh] text-[1.1vw] hover:bg-[#94e400] transition-colors"
        >
          Cadastro
        </Link>
      </div>
    </nav>
  )
}
