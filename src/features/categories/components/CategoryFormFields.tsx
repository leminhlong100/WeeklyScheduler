import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'
import { ColorSwatches } from '@/components/form/ColorSwatches'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateFieldError } from '@/lib/utils/formErrors'
import type { CategoryFormInput } from '../schemas/categorySchema'
import { CATEGORY_COLOR_PRESETS, CATEGORY_EMOJI_PRESETS } from '../data/categoryPresets'

interface CategoryFormFieldsProps {
  form: UseFormReturn<CategoryFormInput>
}

export function CategoryFormFields({ form }: CategoryFormFieldsProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form
  const emoji = watch('emoji')
  const color = watch('color')

  return (
    <div className="flex flex-col gap-4">
      <FormField label={t.categoryName} htmlFor="name" error={translateFieldError(t, errors.name?.message)}>
        <Input
          id="name"
          placeholder={t.categoryNamePh}
          style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
          {...register('name')}
        />
      </FormField>

      <div>
        <div className="mb-2 text-xs font-extrabold" style={{ color: theme.muted }}>
          {t.categoryEmoji}
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {CATEGORY_EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setValue('emoji', e, { shouldValidate: true })}
              className="grid aspect-square place-items-center rounded-xl border-[1.5px] text-base"
              style={{
                borderColor: emoji === e ? theme.accent : theme.border,
                background: theme.chip,
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-extrabold" style={{ color: theme.muted }}>
          {t.categoryColor}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ColorSwatches
            value={color ?? null}
            onChange={(next) => setValue('color', next, { shouldValidate: true })}
            presets={CATEGORY_COLOR_PRESETS}
            ringColor={theme.text}
            customLabel={t.customColor}
          />
        </div>
      </div>
    </div>
  )
}
