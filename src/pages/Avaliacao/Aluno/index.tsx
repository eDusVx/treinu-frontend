import { useEffect, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import AvaliacaoFisicaForm from '../../../components/AvaliacaoFisicaForm'
import { alunoService } from '../../../services/aluno.service'
import type { AvaliacaoFisicaCompleta, AvaliacaoPayload } from '../../../types'

export default function AvaliacaoAlunoPage() {
  const [ultima, setUltima] = useState<AvaliacaoFisicaCompleta | undefined>()

  // Pré-preenchimento com a última avaliação registrada (mais recente)
  useEffect(() => {
    let cancelado = false
    alunoService
      .meuDashboard()
      .then((data) => {
        if (cancelado || !data?.length) return
        const maisRecente = [...data].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
        )[0]
        if (maisRecente?.detalhes) setUltima(maisRecente.detalhes)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [])

  async function enviar(payload: AvaliacaoPayload): Promise<AvaliacaoFisicaCompleta | undefined> {
    const dto = await alunoService.adicionarMinhaAvaliacao(payload)
    const nova = dto.avaliacaoFisica?.[0]
    if (nova) setUltima(nova)
    return nova
  }

  return (
    <DashboardLayout>
      <div className="bg-[#272727] rounded-3xl p-6 border border-white/5 max-w-3xl">
        <p className="text-white/60 text-sm mb-6">
          Preencha todos os campos. As 11 medidas são obrigatórias para uma avaliação completa.
        </p>
        <AvaliacaoFisicaForm
          onSubmit={enviar}
          preencherCom={ultima}
          textoBotao="Registrar avaliação"
          mensagemErroPadrao="Erro ao registrar avaliação."
        />
      </div>
    </DashboardLayout>
  )
}
