import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'
import { GradientButton } from '@/components/common/GradientButton'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateFieldError } from '@/lib/utils/formErrors'
import { forgotPasswordSchema, type ForgotPasswordInput } from '../schemas/authSchemas'
import { useSendPasswordReset } from '../hooks/useAuthMutations'

export function ForgotPasswordForm() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const sendReset = useSendPasswordReset()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = ({ email }: ForgotPasswordInput) => {
    sendReset.mutate(email, {
      onSuccess: () => toast.success(t.resetLinkSent),
      onError: () => toast.error(t.somethingWentWrong),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label={t.email} htmlFor="email" error={translateFieldError(t, errors.email?.message)}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </FormField>

        <GradientButton type="submit" disabled={sendReset.isPending} className="h-11">
          {t.sendResetLink}
        </GradientButton>
      </form>

      <p className="text-center text-sm font-medium">
        <Link to="/login" className="font-bold hover:underline" style={{ color: theme.accent }}>
          {t.backToLogin}
        </Link>
      </p>
    </div>
  )
}
