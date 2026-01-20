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

// Reusable Input Component
function FormInput({
  label,
  required,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  className = '',
}: {
  label: string
  required?: boolean
  type?: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className={`form-label ${required ? 'form-label-required' : ''}`}>
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="form-input"
      />
    </div>
  )
}

// Reusable Select Component
function FormSelect({
  label,
  required,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
}: {
  label: string
  required?: boolean
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: string[]
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className={`form-label ${required ? 'form-label-required' : ''}`}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="form-input form-select"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}

// Section Header Component
function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <h2 className="section-heading">
      <span className="step-indicator">{step}</span>
      {title}
    </h2>
  )
}

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background-subtle)' }}>
      {/* Header */}
      <header className="page-header">
        <div className="container">
          <div className="flex items-center gap-3">
            <div className="icon-container w-10 h-10 rounded-lg" style={{ backgroundColor: 'var(--primary-600)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold">AmplifAI Partner Portal</h1>
              <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Deal Registration</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl font-semibold mb-2">Partner Deal Registration</h1>
            <p style={{ color: 'var(--foreground-muted)' }}>
              Register a new sales opportunity to protect your deal and receive support from AmplifAI
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error mb-6 animate-fade-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p>{error}</p>
            </div>
          )}

          {/* Main Form Card */}
          <form onSubmit={handleSubmit} className="card card-elevated p-6 sm:p-8 animate-fade-in">
            {/* Section 1: Customer Information */}
            <section className="opacity-0 animate-fade-in stagger-1">
              <SectionHeader step={1} title="Customer Information" />

              <div className="grid-form">
                <FormInput
                  label="First Name"
                  required
                  name="customer_first_name"
                  value={formData.customer_first_name}
                  onChange={handleChange}
                  placeholder="John"
                />
                <FormInput
                  label="Last Name"
                  required
                  name="customer_last_name"
                  value={formData.customer_last_name}
                  onChange={handleChange}
                  placeholder="Smith"
                />
                <FormInput
                  label="Job Title"
                  required
                  name="customer_job_title"
                  value={formData.customer_job_title}
                  onChange={handleChange}
                  placeholder="Contact Center Manager"
                />
                <FormInput
                  label="Company Name"
                  required
                  name="customer_company_name"
                  value={formData.customer_company_name}
                  onChange={handleChange}
                  placeholder="SMSC Gaming Enterprise"
                />
                <FormInput
                  label="Email"
                  required
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  placeholder="jsmith@company.com"
                />
                <FormInput
                  label="Phone"
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  placeholder="952-445-9000"
                />
                <FormInput
                  label="Street Address"
                  name="customer_street_address"
                  value={formData.customer_street_address}
                  onChange={handleChange}
                  placeholder="2400 Mystic Lake Blvd"
                  className="grid-form-full"
                />
                <FormInput
                  label="City"
                  name="customer_city"
                  value={formData.customer_city}
                  onChange={handleChange}
                  placeholder="Prior Lake"
                />
                <FormInput
                  label="State / Region"
                  name="customer_state"
                  value={formData.customer_state}
                  onChange={handleChange}
                  placeholder="MN"
                />
                <FormInput
                  label="Postal Code"
                  name="customer_postal_code"
                  value={formData.customer_postal_code}
                  onChange={handleChange}
                  placeholder="55372"
                />
                <FormInput
                  label="Country"
                  name="customer_country"
                  value={formData.customer_country}
                  onChange={handleChange}
                  placeholder="USA"
                />
              </div>
            </section>

            <div className="section-divider" />

            {/* Section 2: Opportunity Details */}
            <section className="opacity-0 animate-fade-in stagger-2">
              <SectionHeader step={2} title="Opportunity Details" />

              <div className="grid-form">
                <FormSelect
                  label="Number of Contact Center Agents"
                  required
                  name="agent_count"
                  value={formData.agent_count}
                  onChange={handleChange}
                  options={AGENT_COUNTS}
                  placeholder="Select range"
                />
                <FormSelect
                  label="Implementation Timeline"
                  name="implementation_timeline"
                  value={formData.implementation_timeline}
                  onChange={handleChange}
                  options={TIMELINES}
                  placeholder="Select timeline"
                />

                {/* Solutions Checkboxes */}
                <div className="grid-form-full">
                  <label className="form-label form-label-required">
                    Which solutions are they looking for?
                  </label>
                  <div className="option-grid">
                    {SOLUTIONS.map(solution => (
                      <div key={solution} className="option-item">
                        <input
                          type="checkbox"
                          id={`solution-${solution}`}
                          checked={formData.solutions_interested.includes(solution)}
                          onChange={() => handleSolutionChange(solution)}
                          className="form-checkbox"
                        />
                        <label htmlFor={`solution-${solution}`}>{solution}</label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Opportunity Description */}
                <div className="grid-form-full">
                  <label htmlFor="opportunity_description" className="form-label form-label-required">
                    Opportunity Description
                  </label>
                  <p className="form-helper" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                    Describe the customer&apos;s use case, challenges, and goals. Include any competing solutions or integrations needed.
                  </p>
                  <textarea
                    id="opportunity_description"
                    name="opportunity_description"
                    value={formData.opportunity_description}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Customer's use case, challenges, goals, current solutions, and any competition..."
                    className="form-input form-textarea"
                  />
                </div>
              </div>
            </section>

            <div className="section-divider" />

            {/* Section 3: Partner Information */}
            <section className="opacity-0 animate-fade-in stagger-3">
              <SectionHeader step={3} title="Partner Information (Trusted Advisor)" />

              <div className="grid-form">
                <FormInput
                  label="Full Name"
                  required
                  name="ta_full_name"
                  value={formData.ta_full_name}
                  onChange={handleChange}
                  placeholder="Mallory Santucci"
                />
                <FormInput
                  label="Company Name"
                  required
                  name="ta_company_name"
                  value={formData.ta_company_name}
                  onChange={handleChange}
                  placeholder="SHI"
                />
                <FormInput
                  label="Email"
                  required
                  type="email"
                  name="ta_email"
                  value={formData.ta_email}
                  onChange={handleChange}
                  placeholder="mallory_santucci@shi.com"
                />
                <FormInput
                  label="Phone"
                  type="tel"
                  name="ta_phone"
                  value={formData.ta_phone}
                  onChange={handleChange}
                  placeholder="555-555-5555"
                />
              </div>
            </section>

            <div className="section-divider" />

            {/* Section 4: TSD Information */}
            <section className="opacity-0 animate-fade-in stagger-4">
              <SectionHeader step={4} title="TSD Information" />

              <div className="grid-form">
                <FormInput
                  label="TSD Name"
                  required
                  name="tsd_name"
                  value={formData.tsd_name}
                  onChange={handleChange}
                  placeholder="Avant"
                />
                <FormInput
                  label="Contact Name"
                  name="tsd_contact_name"
                  value={formData.tsd_contact_name}
                  onChange={handleChange}
                  placeholder="Emely Irula"
                />
                <FormInput
                  label="Contact Email"
                  type="email"
                  name="tsd_contact_email"
                  value={formData.tsd_contact_email}
                  onChange={handleChange}
                  placeholder="eirula@goavant.net"
                  className="grid-form-full sm:col-span-1"
                />
              </div>
            </section>

            {/* Submit Button */}
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-large w-full"
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting Registration...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Deal Registration
                  </>
                )}
              </button>
              <p className="text-center mt-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                By submitting, you agree to our deal registration program terms and conditions.
              </p>
            </div>
          </form>

          {/* Footer */}
          <footer className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Need help? Contact <a href="mailto:partners@amplifai.com" className="hover:underline" style={{ color: 'var(--primary-600)' }}>partners@amplifai.com</a>
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--foreground-muted)' }}>
              Powered by AmplifAI
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
