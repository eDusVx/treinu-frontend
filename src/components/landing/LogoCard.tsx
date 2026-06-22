export default function LogoCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-[2.2vw] flex items-center justify-center w-full ${className}`}
      style={{ aspectRatio: '503 / 409' }}
    >
      <span className="font-['Montserrat',sans-serif] font-extrabold text-black text-[5.5vw] tracking-tight leading-none">
        Treinu
      </span>
    </div>
  )
}
