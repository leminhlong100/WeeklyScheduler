/**
 * Shape of one locale's strings. Every locale file must satisfy this
 * interface, so a missing translation is a compile error, not a runtime gap.
 */
export interface Dictionary {
  appName: string
  appSub: string

  today: string
  newEvent: string
  categories: string
  save: string
  cancel: string
  delete: string
  date: string
  start: string
  duration: string
  category: string
  titlePh: string
  minuteShort: string
  addEvent: string
  editEvent: string
  duplicate: string
  copyLastWeek: string
  repeatOnDays: string

  note: string
  noteAddItemPh: string
  editNote: string
  closeNote: string

  stickers: string
  editStickers: string
  stickerTitle: string
  dragHint: string
  clearAll: string
  themeTitle: string
  themeSub: string
  stickerCatLove: string
  stickerCatNature: string
  stickerCatAnimals: string
  stickerCatFood: string
  stickerCatObjects: string
  stickerCatShapes: string
  stickerCatCustom: string
  addCustomSticker: string
  stickerSyncing: string

  manageCategories: string
  addCategory: string
  editCategory: string
  categoryName: string
  categoryNamePh: string
  categoryEmoji: string
  categoryColor: string
  deleteCategoryConfirm: string
  noCategories: string

  login: string
  signup: string
  logout: string
  email: string
  password: string
  confirmPassword: string
  displayName: string
  forgotPassword: string
  resetPassword: string
  sendResetLink: string
  setNewPassword: string
  backToLogin: string
  continueWithGoogle: string
  orDivider: string
  dontHaveAccount: string
  alreadyHaveAccount: string
  createAccount: string
  signInCta: string
  resetLinkSent: string

  fieldRequired: string
  invalidEmail: string
  passwordTooShort: string
  passwordMismatch: string

  updateAvailable: string
  reloadApp: string

  taskCreated: string
  taskUpdated: string
  taskDeleted: string
  taskDuplicated: string
  weekCopied: string
  noTasksLastWeek: string
  categoryCreated: string
  categoryUpdated: string
  categoryDeleted: string
  somethingWentWrong: string

  dow: [string, string, string, string, string, string, string]
  miniDow: [string, string, string, string, string, string, string]
  mon: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ]
}
