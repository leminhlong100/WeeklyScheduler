import { useAmountVisibility } from '../AmountVisibilityContext'

/** Giữ layout ổn định: dài hơn số gốc một chút để không trông như số 0. */
const MASK = '••••••'

/**
 * Bọc quanh một số tiền đã format sẵn (`formatMoney`/`formatAmount`). Khi
 * đang ẩn, thay toàn bộ bằng chấm tròn — không ẩn riêng phần số để không lộ
 * vị trí dấu phẩy/số chữ số, vốn cũng tiết lộ độ lớn của khoản tiền.
 */
export function MaskedAmount({ children }: { children: string }) {
  const { hidden } = useAmountVisibility()
  return <>{hidden ? MASK : children}</>
}
