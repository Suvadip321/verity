import { redirect } from 'next/navigation'

/**
 * Root route — redirect immediately to the dashboard.
 * The dashboard will handle unauthenticated users client-side.
 */
export default function Home() {
  redirect('/dashboard')
}
