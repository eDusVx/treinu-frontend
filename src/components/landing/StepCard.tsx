type Size = 'lg' | 'md' | 'tall'

interface Props {
  number: string
  title: string
  description: string
  back: string
  size?: Size
  className?: string
}

const SIZE_RATIO: Record<Size, string> = {
  lg: '805 / 984',
  md: '504 / 480',
  tall: '504 / 557',
}

const NUMBER_SIZE: Record<Size, string> = {
  lg: 'text-[6.8vw]',
  md: 'text-[3.3vw]',
  tall: 'text-[3.6vw]',
}

const TITLE_SIZE: Record<Size, string> = {
  lg: 'text-[3.3vw]',
  md: 'text-[2vw]',
  tall: 'text-[2.4vw]',
}

const DESC_SIZE: Record<Size, string> = {
  lg: 'text-[3.3vw]',
  md: 'text-[1.85vw]',
  tall: 'text-[2.3vw]',
}

const BACK_SIZE: Record<Size, string> = {
  lg: 'text-[3.3vw]',
  md: 'text-[1.85vw]',
  tall: 'text-[2.3vw]',
}

export default function StepCard({
  number,
  title,
  description,
  back,
  size = 'md',
  className = '',
}: Props) {
  return (
    <div
      className={`group relative rounded-[2.2vw] [perspective:1500px] cursor-pointer w-full ${className}`}
      style={{ aspectRatio: SIZE_RATIO[size] }}
    >
      <div className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        {/* Frente */}
        <div
          className="absolute inset-0 bg-[#3f3f3f] rounded-[2.2vw] overflow-hidden flex flex-col font-['Montserrat',sans-serif] text-[#94e400] [backface-visibility:hidden]"
          style={{ padding: '7% 8% 7% 8%' }}
        >
          <p className={`font-bold leading-none ${NUMBER_SIZE[size]}`}>{number}.</p>
          <p
            className={`font-bold leading-[1.05] mt-[6%] ${TITLE_SIZE[size]}`}
          >
            {title}
          </p>
          <p
            className={`font-normal leading-[1.05] mt-auto ${DESC_SIZE[size]}`}
          >
            {description}
          </p>
        </div>

        {/* Verso */}
        <div
          className="absolute inset-0 bg-[#3f3f3f] rounded-[2.2vw] overflow-hidden flex items-center font-['Montserrat',sans-serif] text-[#94e400] [transform:rotateY(180deg)] [backface-visibility:hidden]"
          style={{ padding: '8% 8% 8% 8%' }}
        >
          <p className={`font-normal leading-[1.1] ${BACK_SIZE[size]}`}>{back}</p>
        </div>
      </div>
    </div>
  )
}
