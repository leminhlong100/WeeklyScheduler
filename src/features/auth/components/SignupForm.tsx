import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'
import { GradientButton } from '@/components/common/GradientButton'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateFieldError } from '@/lib/utils/formErrors'
import { signupSchema, type SignupInput } from '../schemas/authSchemas'
import { useSignUp } from '../hooks/useAuthMutations'
import { GoogleButton } from './GoogleButton'

export function SignupForm() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const signUp = useSignUp()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) })

  const onSubmit = (values: SignupInput) => {
    signUp.mutate(values, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: () => toast.error(t.somethingWentWrong),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          label={t.displayName}
          htmlFor="displayName"
          error={translateFieldError(t, errors.displayName?.message)}
        >
          <Input id="displayName" autoComplete="name" {...register('displayName')} />
        </FormField>
        <FormField label={t.email} htmlFor="email" error={translateFieldError(t, errors.email?.message)}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </FormField>
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

        <GradientButton type="submit" disabled={signUp.isPending} className="mt-1 h-11">
          {t.createAccount}
        </GradientButton>
      </form>

      <GoogleButton />

      <p className="text-center text-sm font-medium text-muted-foreground">
        {t.alreadyHaveAccount}{' '}
        <Link to="/login" className="font-bold hover:underline" style={{ color: theme.accent }}>
          {t.login}
        </Link>
      </p>
    </div>
  )
}
