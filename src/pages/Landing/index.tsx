import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../lib/gsap'
import LandingNav from '../../components/landing/LandingNav'
import HeroVideo from '../../components/landing/HeroVideo'
import MetodologiaSection from '../../components/landing/MetodologiaSection'
import ComoFuncionaSection from '../../components/landing/ComoFuncionaSection'

type Target = 'topo' | 'metodologia' | 'como-funciona'

export default function LandingPage() {
  const heroRef = useRef<HTMLElement | null>(null)
  const metodologiaRef = useRef<HTMLElement | null>(null)
  const comoFuncionaRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const glassLeftRef = useRef<HTMLDivElement | null>(null)
  const glassRightRef = useRef<HTMLDivElement | null>(null)
  const cardsContainerRef = useRef<HTMLDivElement | null>(null)
  const isAnimatingRef = useRef(false)

  useGSAP(() => {
    // Animação de entrada dos cards de Metodologia
    if (cardsContainerRef.current) {
      const items = cardsContainerRef.current.children
      gsap.from(items, {
        opacity: 0,
        y: 60,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: {
          trigger: cardsContainerRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      })
    }

    // Animação de entrada dos cards de Como Funciona
    const stepGrid = document.querySelector('[data-step-grid]')
    if (stepGrid) {
      gsap.from(stepGrid.children, {
        opacity: 0,
        y: 80,
        scale: 0.92,
        duration: 0.9,
        ease: 'power3.out',
        stagger: { each: 0.1, from: 'start' },
        scrollTrigger: {
          trigger: stepGrid,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      })
    }

    // Sincroniza o vidro/blur com o scroll manual do usuário:
    // - scrollando para baixo (saindo da hero) → mesma animação dos botões: closeGlass
    // - voltando perto do topo → openGlass
    // Guard com isAnimatingRef evita conflito com handleNavigate (cliques nos botões),
    // que já controla a sequência completa.
    ScrollTrigger.create({
      trigger: heroRef.current,
      start: 'top top',
      end: 'bottom 60%',
      onLeave: () => {
        if (!isAnimatingRef.current) closeGlass()
      },
      onEnterBack: () => {
        if (!isAnimatingRef.current) openGlass()
      },
    })
  }, [])

  function closeGlass(): Promise<void> {
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: () => resolve() })
      tl.to([glassLeftRef.current, glassRightRef.current], {
        x: 0,
        duration: 0.7,
        ease: 'power3.inOut',
      }).to(
        videoRef.current,
        {
          filter: 'blur(14px) brightness(0.7)',
          scale: 1.05,
          duration: 0.7,
          ease: 'power2.out',
        },
        '<',
      )
    })
  }

  function openGlass() {
    gsap.to(glassLeftRef.current, {
      x: '-100%',
      duration: 0.7,
      ease: 'power3.inOut',
    })
    gsap.to(glassRightRef.current, {
      x: '100%',
      duration: 0.7,
      ease: 'power3.inOut',
    })
    gsap.to(videoRef.current, {
      filter: 'blur(0px) brightness(1)',
      scale: 1,
      duration: 0.7,
      ease: 'power2.out',
    })
  }

  async function handleNavigate(target: Target) {
    if (isAnimatingRef.current) return
    isAnimatingRef.current = true

    if (target === 'topo') {
      gsap.to(window, {
        scrollTo: { y: 0, autoKill: false },
        duration: 1.1,
        ease: 'power3.inOut',
        onComplete: () => {
          openGlass()
          isAnimatingRef.current = false
        },
      })
      return
    }

    const targetEl =
      target === 'metodologia' ? metodologiaRef.current : comoFuncionaRef.current
    if (!targetEl) {
      isAnimatingRef.current = false
      return
    }

    // 1) Fecha o vidro sobre o vídeo + aplica blur
    await closeGlass()

    // 2) Scroll suave até a seção
    gsap.to(window, {
      scrollTo: { y: targetEl, offsetY: 0, autoKill: false },
      duration: 1.2,
      ease: 'power3.inOut',
      onComplete: () => {
        isAnimatingRef.current = false
      },
    })
  }

  return (
    <div className="min-h-screen bg-[#0d100e] overflow-x-hidden">
      <div className="relative px-[1.7vw] pt-[1.6vh]">
        <LandingNav onScrollTo={handleNavigate} />
        <HeroVideo
          ref={heroRef}
          videoRef={videoRef}
          glassLeftRef={glassLeftRef}
          glassRightRef={glassRightRef}
        />
      </div>

      <MetodologiaSection
        ref={metodologiaRef}
        cardsContainerRef={cardsContainerRef}
        onComoFunciona={() => handleNavigate('como-funciona')}
      />

      <ComoFuncionaSection ref={comoFuncionaRef} />
    </div>
  )
}
