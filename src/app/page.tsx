'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

export default function RegistrationForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    customer_first_name: '',
    customer_last_name: '',
    customer_job_title: '',
    customer_company_name: '',
    customer_email: '',
    customer_phone: '',
    customer_street_address: '',
    customer_city: '',
    customer_state: '',
    customer_postal_code: '',
    customer_country: '',
    agent_count: '',
    implementation_timeline: '',
    solutions_interested: [] as string[],
    opportunity_description: '',
    ta_full_name: '',
    ta_email: '',
    ta_phone: '',
    ta_company_name: '',
    tsd_name: '',
    tsd_contact_name: '',
    tsd_contact_email: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSolutionChange = (solution: string) => {
    setFormData(prev => ({
      ...prev,
      solutions_interested: prev.solutions_interested.includes(solution)
        ? prev.solutions_interested.filter(s => s !== solution)
        : [...prev.solutions_interested, solution]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.solutions_interested.length === 0) {
      setError('Please select at least one solution')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      router.push('/thank-you')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="glass-card glow rounded-2xl p-8 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold section-header">Partner Deal Registration</h1>
            <p className="mt-2 text-[var(--text-muted)]">Register a new opportunity with AmplifAI</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-500 text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Customer Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold section-header flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-sm">1</span>
                Customer Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    First Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_first_name"
                    value={formData.customer_first_name}
                    onChange={handleChange}
                    required
                    placeholder="John"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Last Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_last_name"
                    value={formData.customer_last_name}
                    onChange={handleChange}
                    required
                    placeholder="Smith"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Job Title <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_job_title"
                    value={formData.customer_job_title}
                    onChange={handleChange}
                    required
                    placeholder="Contact Center Manager"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Company Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_company_name"
                    value={formData.customer_company_name}
                    onChange={handleChange}
                    required
                    placeholder="SMSC Gaming Enterprise"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleChange}
                    required
                    placeholder="jsmith@company.com"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    placeholder="952-445-9000"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Street Address</label>
                  <input
                    type="text"
                    name="customer_street_address"
                    value={formData.customer_street_address}
                    onChange={handleChange}
                    placeholder="2400 Mystic Lake Blvd"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    name="customer_city"
                    value={formData.customer_city}
                    onChange={handleChange}
                    placeholder="Prior Lake"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State/Region</label>
                  <input
                    type="text"
                    name="customer_state"
                    value={formData.customer_state}
                    onChange={handleChange}
                    placeholder="MN"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Postal Code</label>
                  <input
                    type="text"
                    name="customer_postal_code"
                    value={formData.customer_postal_code}
                    onChange={handleChange}
                    placeholder="55372"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <input
                    type="text"
                    name="customer_country"
                    value={formData.customer_country}
                    onChange={handleChange}
                    placeholder="USA"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Opportunity Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold section-header flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-sm">2</span>
                Opportunity Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of Contact Center Agents <span className="text-orange-500">*</span>
                  </label>
                  <select
                    name="agent_count"
                    value={formData.agent_count}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  >
                    <option value="">Please Select</option>
                    {AGENT_COUNTS.map(count => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Implementation Timeline</label>
                  <select
                    name="implementation_timeline"
                    value={formData.implementation_timeline}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  >
                    <option value="">Please Select</option>
                    {TIMELINES.map(timeline => (
                      <option key={timeline} value={timeline}>{timeline}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Which solutions are they looking for? <span className="text-orange-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border-2 border-[var(--input-border)] bg-[var(--input-bg)]">
                    {SOLUTIONS.map(solution => (
                      <label key={solution} className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.solutions_interested.includes(solution)}
                          onChange={() => handleSolutionChange(solution)}
                          className="w-5 h-5 rounded border-2 border-[var(--input-border)] cursor-pointer"
                        />
                        <span className="text-sm group-hover:text-purple-500 transition-colors">{solution}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Opportunity Description <span className="text-orange-500">*</span>
                  </label>
                  <p className="text-sm text-[var(--text-muted)] mb-2">
                    Please enter the customer&apos;s use case, challenges, and/or goals. You can also list any other solutions we would integrate with or competing against.
                  </p>
                  <textarea
                    name="opportunity_description"
                    value={formData.opportunity_description}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Customer's use case, challenges, goals, current solutions, and any competition..."
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Partner Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold section-header flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-sm">3</span>
                Partner Information (Trusted Advisor)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    TA Full Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ta_full_name"
                    value={formData.ta_full_name}
                    onChange={handleChange}
                    required
                    placeholder="Mallory Santucci"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    TA Company Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ta_company_name"
                    value={formData.ta_company_name}
                    onChange={handleChange}
                    required
                    placeholder="SHI"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    TA Email <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="ta_email"
                    value={formData.ta_email}
                    onChange={handleChange}
                    required
                    placeholder="mallory_santucci@shi.com"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">TA Phone</label>
                  <input
                    type="tel"
                    name="ta_phone"
                    value={formData.ta_phone}
                    onChange={handleChange}
                    placeholder="555-555-5555"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* TSD Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold section-header flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-sm">4</span>
                TSD Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    TSD Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tsd_name"
                    value={formData.tsd_name}
                    onChange={handleChange}
                    required
                    placeholder="Avant"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">TSD Contact Name</label>
                  <input
                    type="text"
                    name="tsd_contact_name"
                    value={formData.tsd_contact_name}
                    onChange={handleChange}
                    placeholder="Emely Irula"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">TSD Contact Email</label>
                  <input
                    type="email"
                    name="tsd_contact_email"
                    value={formData.tsd_contact_email}
                    onChange={handleChange}
                    placeholder="eirula@goavant.net"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 btn-primary text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Deal Registration'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Powered by AmplifAI
        </p>
      </div>
    </div>
  )
}
