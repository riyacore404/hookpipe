import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">hookpipe</h1>
          <p className="text-sm text-gray-500 mt-1">Webhook delivery platform</p>
        </div>
        <SignIn />
      </div>
    </div>
  )
}