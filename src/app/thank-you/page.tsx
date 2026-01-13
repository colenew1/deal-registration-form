import Link from 'next/link'

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Deal Registration Received
        </h1>

        <p className="text-gray-600 mb-6">
          Thank you for submitting a deal registration to AmplifAI. We&apos;ve received your submission and our team is on it.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h2 className="font-semibold text-gray-900 mb-2">What&apos;s next?</h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              We&apos;re conducting an internal review to ensure alignment and avoid conflicts.
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              You&apos;ll receive an official acceptance or denial within 24 business hours.
            </li>
          </ul>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          If approved, your deal will be protected and supported per our program guidelines.
        </p>

        <Link
          href="/"
          className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Submit Another Registration
        </Link>
      </div>
    </div>
  )
}
