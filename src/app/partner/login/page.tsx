import { redirect } from 'next/navigation'

export default function PartnerLogin() {
  redirect('/login?redirect=/partner/dashboard')
}
