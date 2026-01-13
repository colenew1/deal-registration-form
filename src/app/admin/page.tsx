'use client'

import { useEffect, useState } from 'react'
import { DealRegistration } from '@/lib/supabase'

const ACCOUNT_EXECUTIVES = [
  { name: 'Oliver Gohring', email: 'ogohring@amplifai.com' },
  { name: 'Curt Tilly', email: 'ctilly@amplifai.com' },
]

const REJECTION_REASONS = [
  'Channel conflict with pre-existing registration',
  'Already in active sales engagement',
  'Insufficient information provided',
  'Does not meet minimum agent count requirement',
  'Other',
]

export default function AdminDashboard() {
  const [registrations, setRegistrations] = useState<DealRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selectedReg, setSelectedReg] = useState<DealRegistration | null>(null)
  const [actionModal, setActionModal] = useState<'approve' | 'reject' | null>(null)
  const [selectedAE, setSelectedAE] = useState(ACCOUNT_EXECUTIVES[0])
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const fetchRegistrations = async () => {
    try {
      const res = await fetch('/api/registrations')
      const data = await res.json()
      setRegistrations(data)
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedReg) return
    setProcessing(true)

    try {
      const res = await fetch(`/api/registrations/${selectedReg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          assigned_ae_name: selectedAE.name,
          assigned_ae_email: selectedAE.email,
        }),
      })

      if (res.ok) {
        await fetchRegistrations()
        setActionModal(null)
        setSelectedReg(null)
      }
    } catch (err) {
      console.error('Approve error:', err)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedReg) return
    setProcessing(true)

    try {
      const reason = rejectionReason === 'Other' ? customReason : rejectionReason
      const res = await fetch(`/api/registrations/${selectedReg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: reason,
        }),
      })

      if (res.ok) {
        await fetchRegistrations()
        setActionModal(null)
        setSelectedReg(null)
      }
    } catch (err) {
      console.error('Reject error:', err)
    } finally {
      setProcessing(false)
    }
  }

  const filteredRegistrations = registrations.filter(r =>
    filter === 'all' ? true : r.status === filter
  )

  const stats = {
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Deal Registration Admin</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-700">{stats.pending}</div>
            <div className="text-sm text-yellow-600">Pending Review</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-700">{stats.approved}</div>
            <div className="text-sm text-green-600">Approved</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-700">{stats.rejected}</div>
            <div className="text-sm text-red-600">Rejected</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md font-medium capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Registration List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner (TA)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TSD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRegistrations.map(reg => (
                <tr key={reg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{reg.customer_company_name}</div>
                    <div className="text-sm text-gray-500">{reg.customer_first_name} {reg.customer_last_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{reg.ta_company_name}</div>
                    <div className="text-sm text-gray-500">{reg.ta_full_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{reg.tsd_name}</div>
                    <div className="text-sm text-gray-500">{reg.tsd_contact_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      reg.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      reg.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {reg.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(reg.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedReg(reg)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No registrations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedReg && !actionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-gray-900">Registration Details</h2>
                <button onClick={() => setSelectedReg(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    selectedReg.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedReg.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedReg.status.toUpperCase()}
                  </span>
                  {selectedReg.assigned_ae_name && (
                    <span className="text-sm text-gray-500">
                      Assigned to: {selectedReg.assigned_ae_name}
                    </span>
                  )}
                </div>

                {/* Customer Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Customer Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Company:</span> <span className="font-medium">{selectedReg.customer_company_name}</span></div>
                    <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{selectedReg.customer_first_name} {selectedReg.customer_last_name}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedReg.customer_email}</span></div>
                    <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{selectedReg.customer_phone || '-'}</span></div>
                    <div><span className="text-gray-500">Title:</span> <span className="font-medium">{selectedReg.customer_job_title || '-'}</span></div>
                    <div><span className="text-gray-500">Agents:</span> <span className="font-medium">{selectedReg.agent_count || '-'}</span></div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Address:</span>{' '}
                      <span className="font-medium">
                        {[selectedReg.customer_street_address, selectedReg.customer_city, selectedReg.customer_state, selectedReg.customer_postal_code].filter(Boolean).join(', ') || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Opportunity */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Opportunity Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                    <div><span className="text-gray-500">Timeline:</span> <span className="font-medium">{selectedReg.implementation_timeline || '-'}</span></div>
                    <div><span className="text-gray-500">Solutions:</span> <span className="font-medium">{selectedReg.solutions_interested?.join(', ') || '-'}</span></div>
                    <div>
                      <span className="text-gray-500">Description:</span>
                      <p className="mt-1 font-medium">{selectedReg.opportunity_description || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Partner Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Partner (Trusted Advisor)</h3>
                  <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Company:</span> <span className="font-medium">{selectedReg.ta_company_name}</span></div>
                    <div><span className="text-gray-500">Name:</span> <span className="font-medium">{selectedReg.ta_full_name}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedReg.ta_email}</span></div>
                    <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{selectedReg.ta_phone || '-'}</span></div>
                  </div>
                </div>

                {/* TSD Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">TSD Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">TSD:</span> <span className="font-medium">{selectedReg.tsd_name}</span></div>
                    <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{selectedReg.tsd_contact_name || '-'}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedReg.tsd_contact_email || '-'}</span></div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedReg.status === 'rejected' && selectedReg.rejection_reason && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Rejection Reason</h3>
                    <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700">
                      {selectedReg.rejection_reason}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedReg.status === 'pending' && (
                <div className="mt-6 pt-6 border-t flex gap-3">
                  <button
                    onClick={() => setActionModal('approve')}
                    className="flex-1 py-2 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setActionModal('reject')}
                    className="flex-1 py-2 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {actionModal === 'approve' && selectedReg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Approve Registration</h2>
            <p className="text-gray-600 mb-4">
              Approving deal for <strong>{selectedReg.customer_company_name}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Account Executive
              </label>
              <select
                value={selectedAE.email}
                onChange={(e) => setSelectedAE(ACCOUNT_EXECUTIVES.find(ae => ae.email === e.target.value) || ACCOUNT_EXECUTIVES[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {ACCOUNT_EXECUTIVES.map(ae => (
                  <option key={ae.email} value={ae.email}>{ae.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 py-2 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {actionModal === 'reject' && selectedReg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reject Registration</h2>
            <p className="text-gray-600 mb-4">
              Rejecting deal for <strong>{selectedReg.customer_company_name}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
              >
                {REJECTION_REASONS.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
              {rejectionReason === 'Other' && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom reason..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || (rejectionReason === 'Other' && !customReason)}
                className="flex-1 py-2 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
