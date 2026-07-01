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
import { loginSchema, type LoginInput } from '../schemas/authSchemas'
import { useSignIn } from '../hooks/useAuthMutations'
import { GoogleButton } from './GoogleButton'

export function LoginForm() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const signIn = useSignIn()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (values: LoginInput) => {
    signIn.mutate(values, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: () => toast.error(t.somethingWentWrong),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label={t.email} htmlFor="email" error={translateFieldError(t, errors.email?.message)}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </FormField>
        <FormField
          label={t.password}
          htmlFor="password"
          error={translateFieldError(t, errors.password?.message)}
        >
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
        </FormField>

        <div className="-mt-1 text-right">
          <Link
            to="/forgot-password"
            className="text-xs font-semibold hover:underline"
            style={{ color: theme.accent }}
          >
            {t.forgotPassword}
          </Link>
        </div>

        <GradientButton type="submit" disabled={signIn.isPending} className="h-11">
          {t.signInCta}
        </GradientButton>
      </form>

      <GoogleButton />

      <p className="text-center text-sm font-medium text-muted-foreground">
        {t.dontHaveAccount}{' '}
        <Link to="/signup" className="font-bold hover:underline" style={{ color: theme.accent }}>
          {t.signup}
        </Link>
      </p>
    </div>
  )
}
