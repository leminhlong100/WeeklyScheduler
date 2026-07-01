import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'
import { GradientButton } from '@/components/common/GradientButton'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { translateFieldError } from '@/lib/utils/formErrors'
import { resetPasswordSchema, type ResetPasswordInput } from '../schemas/authSchemas'
import { useUpdatePassword } from '../hooks/useAuthMutations'

export function ResetPasswordForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const updatePassword = useUpdatePassword()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  const onSubmit = ({ password }: ResetPasswordInput) => {
    updatePassword.mutate(password, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: () => toast.error(t.somethingWentWrong),
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField
        label={t.password}
        htmlFor="password"
        error={translateFieldError(t, errors.password?.message)}
      >
        <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
      </FormField>
      <FormField
        label={t.confirmPassword}
        htmlFor="confirmPassword"
        error={translateFieldError(t, errors.confirmPassword?.message)}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
        />
      </FormField>

      <GradientButton type="submit" disabled={updatePassword.isPending} className="h-11">
        {t.setNewPassword}
      </GradientButton>
    </form>
  )
}
