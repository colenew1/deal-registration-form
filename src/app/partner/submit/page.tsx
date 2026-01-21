'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Partner = {
  id: string
  email: string
  full_name: string
  company_name: string
  tsd_name: string | null
}

const AGENT_COUNT_OPTIONS = [
  '1-19',
  '20-49',
  '50-99',
  '100-249',
  '250-499',
  '500-999',
  '1000-2499',
  '2500-4999',
  '5000+',
]

const TIMELINE_OPTIONS = [
  '0-3 months',
  '4-6 months',
  '6-12 months',
  '12+ months',
]

const SOLUTIONS = [
  'Performance Management',
  'Coaching',
  'Conversation Intelligence & Analytics',
  'Data Consolidation for CX',
  'AutoQA/QA',
  'Gamification',
  'Other',
]

const TSD_OPTIONS = [
  'Avant',
  'Telarus',
  'Intelisys',
  'Sandler Partners',
  'AppSmart',
  'TBI',
  'Bridgepointe',
  'Other',
]

export default function SubmitDeal() {
  const router = useRouter()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    // Customer
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
    // Opportunity
    agent_count: '',
    implementation_timeline: '',
    solutions_interested: [] as string[],
    opportunity_description: '',
    // TSD (optional override)
    tsd_name: '',
    tsd_contact_name: '',
    tsd_contact_email: '',
  })

  useEffect(() => {
    const sessionStr = localStorage.getItem('partner_session')
    if (!sessionStr) {
      router.push('/partner/login')
      return
    }

    try {
      const session = JSON.parse(sessionStr)
      setPartner(session.partner)
      // Pre-fill TSD if partner has one set
      if (session.partner.tsd_name) {
        setFormData(prev => ({ ...prev, tsd_name: session.partner.tsd_name }))
      }
    } catch {
      router.push('/partner/login')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSolutionToggle = (solution: string) => {
    setFormData(prev => ({
      ...prev,
      solutions_interested: prev.solutions_interested.includes(solution)
        ? prev.solutions_interested.filter(s => s !== solution)
        : [...prev.solutions_interested, solution],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/partners/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-partner-id': partner?.id || '',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to submit deal')
        return
      }

      router.push('/partner/dashboard?submitted=true')

    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Submit error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--primary-600)' }}></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/partner/dashboard" className="text-xl font-bold" style={{ color: 'var(--primary-600)' }}>
              AmplifAI
            </Link>
            <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground-muted)' }}>
              Partner Portal
            </span>
          </div>
          <Link
            href="/partner/dashboard"
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--foreground-muted)', border: '1px solid var(--card-border)' }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
            Submit New Deal Registration
          </h1>
          <p className="mt-2" style={{ color: 'var(--foreground-muted)' }}>
            Submitting as <strong>{partner?.full_name}</strong> ({partner?.company_name})
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information */}
          <section className="rounded-xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Customer Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="customer_first_name"
                  value={formData.customer_first_name}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="customer_last_name"
                  value={formData.customer_last_name}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Job Title
                </label>
                <input
                  type="text"
                  name="customer_job_title"
                  value={formData.customer_job_title}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="VP of Operations"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="customer_company_name"
                  value={formData.customer_company_name}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="jsmith@acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Address */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Street Address
                </label>
                <input
                  type="text"
                  name="customer_street_address"
                  value={formData.customer_street_address}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  City
                </label>
                <input
                  type="text"
                  name="customer_city"
                  value={formData.customer_city}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Austin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  State
                </label>
                <input
                  type="text"
                  name="customer_state"
                  value={formData.customer_state}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="TX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Postal Code
                </label>
                <input
                  type="text"
                  name="customer_postal_code"
                  value={formData.customer_postal_code}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="78701"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Country
                </label>
                <input
                  type="text"
                  name="customer_country"
                  value={formData.customer_country}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="USA"
                />
              </div>
            </div>
          </section>

          {/* Opportunity Details */}
          <section className="rounded-xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Opportunity Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Number of Agents
                </label>
                <select
                  name="agent_count"
                  value={formData.agent_count}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select range</option>
                  {AGENT_COUNT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Implementation Timeline
                </label>
                <select
                  name="implementation_timeline"
                  value={formData.implementation_timeline}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select timeline</option>
                  {TIMELINE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Solutions Interested
              </label>
              <div className="flex flex-wrap gap-2">
                {SOLUTIONS.map(solution => (
                  <button
                    key={solution}
                    type="button"
                    onClick={() => handleSolutionToggle(solution)}
                    className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{
                      backgroundColor: formData.solutions_interested.includes(solution)
                        ? 'var(--primary-600)'
                        : 'var(--background)',
                      color: formData.solutions_interested.includes(solution)
                        ? 'white'
                        : 'var(--foreground)',
                      border: '1px solid var(--card-border)',
                    }}
                  >
                    {solution}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Opportunity Description
              </label>
              <textarea
                name="opportunity_description"
                value={formData.opportunity_description}
                onChange={handleChange}
                rows={4}
                className="form-input"
                placeholder="Describe the opportunity, current situation, pain points, etc."
              />
            </div>
          </section>

          {/* TSD Information (optional) */}
          <section className="rounded-xl p-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              TSD Information
              <span className="ml-2 text-sm font-normal" style={{ color: 'var(--foreground-muted)' }}>(Optional)</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  TSD Name
                </label>
                <select
                  name="tsd_name"
                  value={formData.tsd_name}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select TSD</option>
                  {TSD_OPTIONS.map(tsd => (
                    <option key={tsd} value={tsd}>{tsd}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  TSD Contact Name
                </label>
                <input
                  type="text"
                  name="tsd_contact_name"
                  value={formData.tsd_contact_name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Contact name"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  TSD Contact Email
                </label>
                <input
                  type="email"
                  name="tsd_contact_email"
                  value={formData.tsd_contact_email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="contact@tsd.com"
                />
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              href="/partner/dashboard"
              className="px-6 py-3 rounded-lg font-medium transition-colors"
              style={{ color: 'var(--foreground-muted)', border: '1px solid var(--card-border)' }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary-600)', color: 'white' }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Deal Registration'}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="text-center py-8">
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Need help? Contact{' '}
          <a href="mailto:greynolds@amplifai.com" className="hover:underline" style={{ color: 'var(--primary-600)' }}>
            greynolds@amplifai.com
          </a>
        </p>
      </footer>
    </div>
  )
}
