interface Props {
  title: string
  description: string
  image: string
}

export default function InfoCard({ title, description, image }: Props) {
  return (
    <div
      className="group relative overflow-hidden rounded-[2.2vw] w-full border border-transparent hover:border-[#94e400]/70 transition-[box-shadow,border-color] duration-500"
      style={{ aspectRatio: '565 / 745' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          '0 0 0 1px rgba(148,228,0,0.4), 0 0 36px rgba(148,228,0,0.45), 0 0 90px rgba(148,228,0,0.25)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <img
        src={image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 flex flex-col justify-between h-full py-[6%] px-[6%] font-['Montserrat',sans-serif]">
        <div className="self-start bg-[#d9d9d9] rounded-full px-[6%] py-[2.5%] max-w-full">
          <span className="text-black font-extrabold text-[1.25vw] whitespace-nowrap">
            {title}
          </span>
        </div>
        <p className="text-white font-semibold text-[1.85vw] leading-[1.05] mt-auto">
          {description}
        </p>
      </div>
    </div>
  )
}
