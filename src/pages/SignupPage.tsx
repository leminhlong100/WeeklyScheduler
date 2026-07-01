import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { SignupForm } from '@/features/auth/components/SignupForm'
import { useTranslation } from '@/features/i18n/LocaleContext'

export function SignupPage() {
  const { t } = useTranslation()
  return (
    <AuthLayout title={t.createAccount}>
      <SignupForm />
    </AuthLayout>
  )
}
