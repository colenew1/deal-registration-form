import Link from 'next/link'

export default function ThankYou() {
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

      <main className="container py-12">
        <div className="max-w-lg mx-auto">
          <div className="card card-elevated p-8 text-center animate-fade-in">
            {/* Success Icon */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: 'var(--success-50)' }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: 'var(--success-600)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold mb-3">
              Registration Submitted Successfully
            </h1>

            {/* Description */}
            <p className="mb-8" style={{ color: 'var(--foreground-muted)' }}>
              Thank you for submitting your deal registration. Our team has received your submission and will review it promptly.
            </p>

            {/* What's Next Section */}
            <div
              className="rounded-lg p-5 mb-8 text-left"
              style={{ backgroundColor: 'var(--background-subtle)' }}
            >
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" style={{ color: 'var(--primary-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What happens next?
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}
                  >
                    1
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>Internal Review</span>
                    <br />
                    We&apos;ll review your registration to ensure alignment and avoid conflicts.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}
                  >
                    2
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>Decision Notification</span>
                    <br />
                    You&apos;ll receive an official acceptance or denial within 24 business hours.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}
                  >
                    3
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>Deal Protection</span>
                    <br />
                    If approved, your deal will be protected and supported per our program guidelines.
                  </p>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                href="/"
                className="btn btn-primary btn-large w-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Submit Another Registration
              </Link>
              <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                Have questions? Contact{' '}
                <a
                  href="mailto:partners@amplifai.com"
                  style={{ color: 'var(--primary-600)' }}
                  className="hover:underline font-medium"
                >
                  partners@amplifai.com
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Powered by AmplifAI
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
