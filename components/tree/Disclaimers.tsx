import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * Required disclaimers as per requirements:
 * 1. Offer Warning
 * 2. Approval Disclaimer
 * 3. Financial Advice
 */
export default function Disclaimers() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-3">
        {/* Offer Warning */}
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-gray-700">
            <strong>Offer Warning:</strong> This tree may not reflect the
            latest signup bonuses. Offers change frequently - verify current
            details before applying.
          </AlertDescription>
        </Alert>

        {/* Approval Disclaimer */}
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-sm text-gray-700">
            <strong>Approval Disclaimer:</strong> This service does not
            guarantee card approval. Results vary by credit score, history,
            income, and existing relationships.
          </AlertDescription>
        </Alert>

        {/* Financial Advice */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-gray-700">
            <strong>Not Financial Advice:</strong> This service does not
            provide financial advice. Review your personal situation before
            applying for credit cards.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
