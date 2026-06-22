import { forwardRef } from 'react'

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
  glassLeftRef: React.RefObject<HTMLDivElement | null>
  glassRightRef: React.RefObject<HTMLDivElement | null>
}

const HeroVideo = forwardRef<HTMLElement, Props>(function HeroVideo(
  { videoRef, glassLeftRef, glassRightRef },
  ref,
) {
  return (
    <section
      ref={ref}
      id="topo"
      className="relative w-full overflow-hidden rounded-[2.3vw]"
      style={{ aspectRatio: '1854 / 1006' }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover will-change-[filter]"
        src="/videos/treinu-hero.mp4"
      />
      <div className="absolute inset-0 bg-black/35 pointer-events-none" />

      {/* Glass overlay — duas metades que fecham no centro */}
      <div
        ref={glassLeftRef}
        className="absolute top-0 left-0 w-1/2 h-full pointer-events-none z-20"
        style={{
          transform: 'translateX(-100%)',
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.18) 80%, rgba(255,255,255,0.30) 100%)',
          backdropFilter: 'blur(18px) saturate(120%)',
          WebkitBackdropFilter: 'blur(18px) saturate(120%)',
          borderRight: '1px solid rgba(255,255,255,0.28)',
          boxShadow: 'inset -10px 0 30px rgba(255,255,255,0.08)',
        }}
      />
      <div
        ref={glassRightRef}
        className="absolute top-0 right-0 w-1/2 h-full pointer-events-none z-20"
        style={{
          transform: 'translateX(100%)',
          background:
            'linear-gradient(270deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.18) 80%, rgba(255,255,255,0.30) 100%)',
          backdropFilter: 'blur(18px) saturate(120%)',
          WebkitBackdropFilter: 'blur(18px) saturate(120%)',
          borderLeft: '1px solid rgba(255,255,255,0.28)',
          boxShadow: 'inset 10px 0 30px rgba(255,255,255,0.08)',
        }}
      />

    </section>
  )
})

export default HeroVideo
