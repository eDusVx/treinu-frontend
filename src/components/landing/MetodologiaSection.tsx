import { forwardRef } from 'react'
import InfoCard from './InfoCard'

interface Props {
  onComoFunciona: () => void
  cardsContainerRef: React.RefObject<HTMLDivElement | null>
}

const MetodologiaSection = forwardRef<HTMLElement, Props>(function MetodologiaSection(
  { onComoFunciona, cardsContainerRef },
  ref,
) {
  return (
    <section
      ref={ref}
      id="metodologia"
      className="relative px-[1.7vw] pt-[8vh] pb-[6vh] bg-[#0d100e] font-['Montserrat',sans-serif]"
    >
      <div
        ref={cardsContainerRef}
        className="grid items-stretch gap-[1.5vw]"
        style={{ gridTemplateColumns: '650fr 565fr 565fr' }}
      >
        {/* Coluna esquerda: badge + título + CTA */}
        <div className="flex flex-col gap-[3vh] py-[1vh] pr-[1vw]">
          <div className="border-[3px] border-[#e9e9e9] rounded-full px-[2vw] py-[1.5vh] inline-flex items-center justify-center self-start">
            <span className="text-white font-extrabold text-[1.45vw]">A Metodologia</span>
          </div>

          <h2 className="text-white font-semibold text-[2.6vw] leading-[1.05] flex-1">
            Treinamento e nutrição caminhando juntos. Onde o esforço na academia encontra o resultado na balança.
          </h2>

          <button
            onClick={onComoFunciona}
            className="group bg-[#e9e9e9] hover:bg-[#94e400] transition-colors rounded-full pl-[2vw] pr-[0.6vw] py-[0.6vh] inline-flex items-center justify-between gap-[1.2vw] self-start cursor-pointer"
          >
            <span className="text-black font-extrabold text-[1.45vw]">Como funciona</span>
            <span className="w-[4.6vw] h-[4.6vw] rounded-full bg-[#94e400] group-hover:bg-[#0d100e] transition-colors flex items-center justify-center shrink-0">
              <svg
                width="48%"
                height="48%"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 19l14-14M9 5h10v10"
                  stroke="black"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:stroke-[#94e400] transition-colors"
                />
              </svg>
            </span>
          </button>
        </div>

        <InfoCard
          title="Prescrição de Treino"
          description="Treinamento periodizado focado em hipertrofia e definição."
          image="/assets/img-prescricao.png"
        />
        <InfoCard
          title="Planejamento Nutricional"
          description="Dieta calculada para o seu objetivo, sem terrorismo nutricional."
          image="/assets/img-nutricao.png"
        />
      </div>
    </section>
  )
})

export default MetodologiaSection
