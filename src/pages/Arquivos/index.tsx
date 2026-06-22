import { FolderOpen } from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout'
import PlaceholderCard from '../../components/PlaceholderCard'

export default function ArquivosPage() {
  return (
    <DashboardLayout>
      <PlaceholderCard
        icon={FolderOpen}
        titulo="Arquivos"
        descricao="Em breve: PDFs do treino, fotos de avaliação física e documentos compartilhados pelo seu treinador."
      />
    </DashboardLayout>
  )
}
