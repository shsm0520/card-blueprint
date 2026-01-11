import { Metadata } from 'next'
import AdminPanel from '@/components/admin/AdminPanel'
import { Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Admin Panel - Card Strategy Tree',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Panel
              </h1>
              <p className="text-gray-600 mt-1">
                Manage referral links and card data
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Panel */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminPanel />
      </main>
    </div>
  )
}
