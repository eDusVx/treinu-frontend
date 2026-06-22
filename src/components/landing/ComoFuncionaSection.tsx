import { forwardRef } from 'react'
import StepCard from './StepCard'
import LogoCard from './LogoCard'

const ComoFuncionaSection = forwardRef<HTMLElement>(function ComoFuncionaSection(_, ref) {
  return (
    <section
      ref={ref}
      id="como-funciona"
      className="relative px-[1.7vw] py-[6vh] bg-[#0d100e]"
    >
      <div
        className="grid gap-[1.5vw] items-start"
        style={{ gridTemplateColumns: '805fr 504fr 504fr' }}
        data-step-grid
      >
        {/* Coluna 1 — Passo 1 (alto, ocupa altura das duas linhas) */}
        <StepCard
          size="lg"
          number="1"
          title="Professor cria sua conta"
          description="Cadastro livre para profissionais iniciarem o acompanhamento dos alunos."
          back="O professor acessa a plataforma, cria seu perfil e passa a ter controle sobre convites, treinos, dietas e evolução dos alunos."
        />

        {/* Coluna 2 — Passo 2 + Passo 3 empilhados */}
        <div className="flex flex-col gap-[1.5vw]">
          <StepCard
            number="2"
            title="Convite exclusivo para o aluno"
            description="Cada aluno entra por um link gerado pelo professor."
            back="Esse convite garante que o aluno seja cadastrado corretamente e já fique vinculado ao profissional responsável."
          />
          <StepCard
            number="3"
            title="Aluno entra já conectado"
            description="O cadastro do aluno acontece de forma simples, rápida e segura."
            back="Ao acessar pelo link, o aluno cria sua conta e já entra com acesso ao professor, ao plano alimentar e ao treino definido."
          />
        </div>

        {/* Coluna 3 — Passo 4 + Logo empilhados */}
        <div className="flex flex-col gap-[1.5vw]">
          <StepCard
            size="tall"
            number="4"
            title="Tudo em um só lugar"
            description="Treino, dieta, métricas e contato direto dentro da plataforma."
            back="Professor e aluno acompanham evolução, ajustam estratégias e mantêm a rotina organizada em um único sistema."
          />
          <LogoCard />
        </div>
      </div>
    </section>
  )
})

export default ComoFuncionaSection
