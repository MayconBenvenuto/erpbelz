import { Activity, Clock, CheckCircle2, XCircle } from 'lucide-react'

export function statusIcon(status) {
  switch (status) {
    case 'aberta':
      return <Activity className="h-4 w-4 text-blue-600" />
    case 'em validação':
      return <Clock className="h-4 w-4 text-amber-600" />
    case 'em execução':
      return <Activity className="h-4 w-4 text-purple-600" />
    case 'concluída':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'cancelada':
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Activity className="h-4 w-4" />
  }
}
