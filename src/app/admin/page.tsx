'use client'

import { useEffect, useState } from 'react'
import { DealRegistration } from '@/lib/supabase'

const SOLUTIONS = [
  'Performance Management',
  'Coaching',
  'Conversation Intelligence & Analytics',
  'Data Consolidation for CX',
  'AutoQA / QA',
  'Gamification',
  'Other',
]

const AGENT_COUNTS = [
  '1-19',
  '20-49',
  '50-100',
  '101 to 249',
  '250 to 499',
  '500 to 999',
  '1000 to 2499',
  '2500 to 4999',
  '5000+',
]

const TIMELINES = [
  '0-3 months',
  '4-6 months',
  '6-12 months',
  '12+ months',
]

export default function AdminDashboard() {
  const [registrations, setRegistrations] = useState<DealRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedReg, setSelectedReg] = useState<DealRegistration | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<DealRegistration>>({})
  const [saving, setSaving] = useState(false)

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

  const handleEdit = () => {
    if (selectedReg) {
      setEditData({ ...selectedReg })
      setEditMode(true)
    }
  }

  const handleSave = async () => {
    if (!selectedReg) return
    setSaving(true)

    try {
      const res = await fetch(`/api/registrations/${selectedReg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          ...editData,
        }),
      })

      if (res.ok) {
        await fetchRegistrations()
        setEditMode(false)
        setSelectedReg(null)
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setEditData({})
  }

  const handleFieldChange = (field: string, value: string | string[]) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleSolutionChange = (solution: string) => {
    const current = editData.solutions_interested || []
    const updated = current.includes(solution)
      ? current.filter(s => s !== solution)
      : [...current, solution]
    setEditData(prev => ({ ...prev, solutions_interested: updated }))
  }

  const filteredRegistrations = registrations.filter(r =>
    filter === 'all' ? true : r.status === filter
  )

  const stats = {
    total: registrations.length,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-card border-b border-[var(--input-border)]">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold section-header">Deal Registration Admin</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4 border-l-4 border-purple-500">
            <div className="text-3xl font-bold text-purple-500">{stats.total}</div>
            <div className="text-sm text-[var(--text-muted)]">Total</div>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-yellow-500">
            <div className="text-3xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-sm text-[var(--text-muted)]">Pending</div>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-green-500">
            <div className="text-3xl font-bold text-green-500">{stats.approved}</div>
            <div className="text-sm text-[var(--text-muted)]">Approved</div>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-red-500">
            <div className="text-3xl font-bold text-red-500">{stats.rejected}</div>
            <div className="text-sm text-[var(--text-muted)]">Rejected</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-medium capitalize transition-all ${
                filter === f
                  ? 'btn-primary text-white'
                  : 'glass-card hover:border-purple-500'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Registration List */}
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--input-border)]">
            <thead className="bg-[var(--input-bg)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Partner (TA)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">TSD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--input-border)]">
              {filteredRegistrations.map(reg => (
                <tr key={reg.id} className="hover:bg-[var(--input-bg)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{reg.customer_company_name}</div>
                    <div className="text-sm text-[var(--text-muted)]">{reg.customer_first_name} {reg.customer_last_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{reg.ta_company_name}</div>
                    <div className="text-sm text-[var(--text-muted)]">{reg.ta_full_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>{reg.tsd_name}</div>
                    <div className="text-sm text-[var(--text-muted)]">{reg.tsd_contact_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                      reg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                      reg.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {reg.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {formatDate(reg.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedReg(reg)}
                      className="text-purple-500 hover:text-purple-400 font-medium text-sm"
                    >
                      View / Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-muted)]">
                    No registrations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Detail/Edit Modal */}
      {selectedReg && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold section-header">
                  {editMode ? 'Edit Registration' : 'Registration Details'}
                </h2>
                <button
                  onClick={() => { setSelectedReg(null); setEditMode(false); setEditData({}); }}
                  className="text-[var(--text-muted)] hover:text-[var(--foreground)]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {editMode ? (
                /* Edit Form */
                <div className="space-y-6">
                  {/* Customer Info */}
                  <div>
                    <h3 className="font-semibold mb-3 section-header">Customer Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">First Name</label>
                        <input
                          type="text"
                          value={editData.customer_first_name || ''}
                          onChange={(e) => handleFieldChange('customer_first_name', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Last Name</label>
                        <input
                          type="text"
                          value={editData.customer_last_name || ''}
                          onChange={(e) => handleFieldChange('customer_last_name', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Job Title</label>
                        <input
                          type="text"
                          value={editData.customer_job_title || ''}
                          onChange={(e) => handleFieldChange('customer_job_title', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Company Name</label>
                        <input
                          type="text"
                          value={editData.customer_company_name || ''}
                          onChange={(e) => handleFieldChange('customer_company_name', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Email</label>
                        <input
                          type="email"
                          value={editData.customer_email || ''}
                          onChange={(e) => handleFieldChange('customer_email', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Phone</label>
                        <input
                          type="tel"
                          value={editData.customer_phone || ''}
                          onChange={(e) => handleFieldChange('customer_phone', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Street Address</label>
                        <input
                          type="text"
                          value={editData.customer_street_address || ''}
                          onChange={(e) => handleFieldChange('customer_street_address', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">City</label>
                        <input
                          type="text"
                          value={editData.customer_city || ''}
                          onChange={(e) => handleFieldChange('customer_city', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">State</label>
                        <input
                          type="text"
                          value={editData.customer_state || ''}
                          onChange={(e) => handleFieldChange('customer_state', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={editData.customer_postal_code || ''}
                          onChange={(e) => handleFieldChange('customer_postal_code', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Country</label>
                        <input
                          type="text"
                          value={editData.customer_country || ''}
                          onChange={(e) => handleFieldChange('customer_country', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Opportunity Details */}
                  <div>
                    <h3 className="font-semibold mb-3 section-header">Opportunity Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Agent Count</label>
                        <select
                          value={editData.agent_count || ''}
                          onChange={(e) => handleFieldChange('agent_count', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        >
                          <option value="">Select...</option>
                          {AGENT_COUNTS.map(count => (
                            <option key={count} value={count}>{count}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Timeline</label>
                        <select
                          value={editData.implementation_timeline || ''}
                          onChange={(e) => handleFieldChange('implementation_timeline', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        >
                          <option value="">Select...</option>
                          {TIMELINES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-[var(--text-muted)] mb-2">Solutions</label>
                        <div className="grid grid-cols-2 gap-2">
                          {SOLUTIONS.map(solution => (
                            <label key={solution} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(editData.solutions_interested || []).includes(solution)}
                                onChange={() => handleSolutionChange(solution)}
                                className="w-4 h-4 rounded"
                              />
                              <span className="text-sm">{solution}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-[var(--text-muted)] mb-1">Description</label>
                        <textarea
                          value={editData.opportunity_description || ''}
                          onChange={(e) => handleFieldChange('opportunity_description', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Partner Info */}
                  <div>
                    <h3 className="font-semibold mb-3 section-header">Partner (Trusted Advisor)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">TA Full Name</label>
                        <input
                          type="text"
                          value={editData.ta_full_name || ''}
                          onChange={(e) => handleFieldChange('ta_full_name', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">TA Company</label>
                        <input
                          type="text"
                          value={editData.ta_company_name || ''}
                          onChange={(e) => handleFieldChange('ta_company_name', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">TA Email</label>
                        <input
                          type="email"
                          value={editData.ta_email || ''}
                          onChange={(e) => handleFieldChange('ta_email', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">TA Phone</label>
                        <input
                          type="tel"
                          value={editData.ta_phone || ''}
                          onChange={(e) => handleFieldChange('ta_phone', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TSD Info */}
                  <div>
                    <h3 className="font-semibold mb-3 section-header">TSD Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">TSD Name</label>
                        <input
                          type="text"
                          value={editData.tsd_name || ''}
                          onChange={(e) => handleFieldChange('tsd_name', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-1">TSD Contact Name</label>
                        <input
                          type="text"
                          value={editData.tsd_contact_name || ''}
                          onChange={(e) => handleFieldChange('tsd_contact_name', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-[var(--text-muted)] mb-1">TSD Contact Email</label>
                        <input
                          type="email"
                          value={editData.tsd_contact_email || ''}
                          onChange={(e) => handleFieldChange('tsd_contact_email', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-[var(--input-border)]">
                    <button
                      onClick={handleCancel}
                      className="flex-1 py-3 px-4 glass-card font-medium rounded-xl hover:border-purple-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 py-3 px-4 btn-primary text-white font-medium rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-6">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                      selectedReg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                      selectedReg.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {selectedReg.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">
                      Submitted {formatDate(selectedReg.created_at)}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h3 className="font-semibold mb-2">Customer Information</h3>
                    <div className="bg-[var(--input-bg)] rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-[var(--text-muted)]">Company:</span> <span className="font-medium">{selectedReg.customer_company_name}</span></div>
                      <div><span className="text-[var(--text-muted)]">Contact:</span> <span className="font-medium">{selectedReg.customer_first_name} {selectedReg.customer_last_name}</span></div>
                      <div><span className="text-[var(--text-muted)]">Email:</span> <span className="font-medium">{selectedReg.customer_email}</span></div>
                      <div><span className="text-[var(--text-muted)]">Phone:</span> <span className="font-medium">{selectedReg.customer_phone || '-'}</span></div>
                      <div><span className="text-[var(--text-muted)]">Title:</span> <span className="font-medium">{selectedReg.customer_job_title || '-'}</span></div>
                      <div><span className="text-[var(--text-muted)]">Agents:</span> <span className="font-medium">{selectedReg.agent_count || '-'}</span></div>
                      <div className="col-span-2">
                        <span className="text-[var(--text-muted)]">Address:</span>{' '}
                        <span className="font-medium">
                          {[selectedReg.customer_street_address, selectedReg.customer_city, selectedReg.customer_state, selectedReg.customer_postal_code].filter(Boolean).join(', ') || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Opportunity */}
                  <div>
                    <h3 className="font-semibold mb-2">Opportunity Details</h3>
                    <div className="bg-[var(--input-bg)] rounded-xl p-4 text-sm space-y-2">
                      <div><span className="text-[var(--text-muted)]">Timeline:</span> <span className="font-medium">{selectedReg.implementation_timeline || '-'}</span></div>
                      <div><span className="text-[var(--text-muted)]">Solutions:</span> <span className="font-medium">{selectedReg.solutions_interested?.join(', ') || '-'}</span></div>
                      <div>
                        <span className="text-[var(--text-muted)]">Description:</span>
                        <p className="mt-1 font-medium">{selectedReg.opportunity_description || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Partner Info */}
                  <div>
                    <h3 className="font-semibold mb-2">Partner (Trusted Advisor)</h3>
                    <div className="bg-[var(--input-bg)] rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-[var(--text-muted)]">Company:</span> <span className="font-medium">{selectedReg.ta_company_name}</span></div>
                      <div><span className="text-[var(--text-muted)]">Name:</span> <span className="font-medium">{selectedReg.ta_full_name}</span></div>
                      <div><span className="text-[var(--text-muted)]">Email:</span> <span className="font-medium">{selectedReg.ta_email}</span></div>
                      <div><span className="text-[var(--text-muted)]">Phone:</span> <span className="font-medium">{selectedReg.ta_phone || '-'}</span></div>
                    </div>
                  </div>

                  {/* TSD Info */}
                  <div>
                    <h3 className="font-semibold mb-2">TSD Information</h3>
                    <div className="bg-[var(--input-bg)] rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-[var(--text-muted)]">TSD:</span> <span className="font-medium">{selectedReg.tsd_name}</span></div>
                      <div><span className="text-[var(--text-muted)]">Contact:</span> <span className="font-medium">{selectedReg.tsd_contact_name || '-'}</span></div>
                      <div><span className="text-[var(--text-muted)]">Email:</span> <span className="font-medium">{selectedReg.tsd_contact_email || '-'}</span></div>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <div className="pt-4 border-t border-[var(--input-border)]">
                    <button
                      onClick={handleEdit}
                      className="w-full py-3 px-4 btn-primary text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Registration
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
