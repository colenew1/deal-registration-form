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
  'Under 100',
  '100-249',
  '250-499',
  '500-999',
  '1000+',
]

const TIMELINES = [
  'Immediate',
  '1-3 months',
  '3-6 months',
  '6+ months',
]

export default function RegistrationForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    // Customer Info
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
    // Partner Info (TA)
    ta_full_name: '',
    ta_email: '',
    ta_phone: '',
    ta_company_name: '',
    // TSD Info
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

    // Validate at least one solution selected
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Partner Deal Registration</h1>
            <p className="mt-2 text-gray-600">Register a new opportunity with AmplifAI</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Customer Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_first_name"
                    value={formData.customer_first_name}
                    onChange={handleChange}
                    required
                    placeholder="John"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_last_name"
                    value={formData.customer_last_name}
                    onChange={handleChange}
                    required
                    placeholder="Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_job_title"
                    value={formData.customer_job_title}
                    onChange={handleChange}
                    required
                    placeholder="Contact Center Manager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_company_name"
                    value={formData.customer_company_name}
                    onChange={handleChange}
                    required
                    placeholder="SMSC Gaming Enterprise"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleChange}
                    required
                    placeholder="jsmith@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    placeholder="952-445-9000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="customer_street_address"
                    value={formData.customer_street_address}
                    onChange={handleChange}
                    placeholder="2400 Mystic Lake Blvd"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="customer_city"
                    value={formData.customer_city}
                    onChange={handleChange}
                    placeholder="Prior Lake"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State/Region</label>
                  <input
                    type="text"
                    name="customer_state"
                    value={formData.customer_state}
                    onChange={handleChange}
                    placeholder="MN"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    name="customer_postal_code"
                    value={formData.customer_postal_code}
                    onChange={handleChange}
                    placeholder="55372"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="customer_country"
                    value={formData.customer_country}
                    onChange={handleChange}
                    placeholder="USA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Opportunity Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">Opportunity Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Contact Center Agents <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="agent_count"
                    value={formData.agent_count}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Please Select</option>
                    {AGENT_COUNTS.map(count => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Implementation Timeline
                  </label>
                  <select
                    name="implementation_timeline"
                    value={formData.implementation_timeline}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Please Select</option>
                    {TIMELINES.map(timeline => (
                      <option key={timeline} value={timeline}>{timeline}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Which solutions are they looking for: (multiple select) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SOLUTIONS.map(solution => (
                      <label key={solution} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.solutions_interested.includes(solution)}
                          onChange={() => handleSolutionChange(solution)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{solution}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opportunity Description <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-2">
                    Please enter the customer&apos;s use case, challenges, and/or goals. You can also list any other solutions we would integrate with or competing against.
                  </p>
                  <textarea
                    name="opportunity_description"
                    value={formData.opportunity_description}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Customer's use case, challenges, goals, current solutions, and any competition..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Partner Information (TA) */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">Partner Information (Trusted Advisor)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TA Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ta_full_name"
                    value={formData.ta_full_name}
                    onChange={handleChange}
                    required
                    placeholder="Mallory Santucci"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TA Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ta_company_name"
                    value={formData.ta_company_name}
                    onChange={handleChange}
                    required
                    placeholder="SHI"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TA Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="ta_email"
                    value={formData.ta_email}
                    onChange={handleChange}
                    required
                    placeholder="mallory_santucci@shi.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TA Phone
                  </label>
                  <input
                    type="tel"
                    name="ta_phone"
                    value={formData.ta_phone}
                    onChange={handleChange}
                    placeholder="555-555-5555"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* TSD Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">TSD Information (Technology Service Distributor)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TSD Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tsd_name"
                    value={formData.tsd_name}
                    onChange={handleChange}
                    required
                    placeholder="Avant"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TSD Contact Name
                  </label>
                  <input
                    type="text"
                    name="tsd_contact_name"
                    value={formData.tsd_contact_name}
                    onChange={handleChange}
                    placeholder="Emely Irula"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TSD Contact Email
                  </label>
                  <input
                    type="email"
                    name="tsd_contact_email"
                    value={formData.tsd_contact_email}
                    onChange={handleChange}
                    placeholder="eirula@goavant.net"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Deal Registration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
