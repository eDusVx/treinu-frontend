import { Utensils } from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout'
import PlaceholderCard from '../../components/PlaceholderCard'

export default function DietaPage() {
  return (
    <DashboardLayout>
      <PlaceholderCard
        icon={Utensils}
        titulo="Plano alimentar"
        descricao="Em breve você poderá acompanhar seu plano alimentar, refeições do dia e macronutrientes diretamente por aqui."
      />
    </DashboardLayout>
  )
}
