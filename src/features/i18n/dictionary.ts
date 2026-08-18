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
  taskColor: string
  /** Chip that clears a task's own colour so it follows its category again. */
  taskColorAuto: string
  /** Shared by the task and category pickers' "any colour" swatch. */
  customColor: string
  copyLastWeek: string
  copyLastWeekConfirm: string
  repeatOnDays: string
  selectTasks: string
  /** "{n} selected" — {n} is replaced with the current selection count. */
  selectedCount: string
  deleteSelected: string
  /** "{n}" is replaced with the number of tasks about to be deleted. */
  deleteSelectedConfirm: string
  clearWeek: string
  clearWeekConfirm: string
  tasksCleared: string
  /** "{n}" is replaced with the number of tasks deleted. */
  tasksDeletedCount: string
  editSelected: string
  /** "{n}" is replaced with the number of tasks being edited. */
  bulkEditTitle: string
  bulkEditHint: string
  /** "{n}" is replaced with the number of tasks updated. */
  tasksUpdatedCount: string
  keepUnchanged: string

  markDone: string
  markNotDone: string
  doneLabel: string

  search: string
  searchPh: string
  /** "{n}" is replaced with the minimum number of characters a search needs. */
  searchMinChars: string
  searchNoResults: string
  /** "{n}" is replaced with the number of matches found. */
  searchResultsCount: string

  weekStats: string
  statsTotalTime: string
  statsTaskCount: string
  statsDone: string
  statsBusiestDay: string
  statsByCategory: string
  statsEmpty: string
  statsUncategorized: string

  repeatWeekly: string
  repeatNone: string
  /** "{n}" is replaced with the number of weeks the task repeats for. */
  repeatWeeksCount: string
  seriesNotice: string
  applyToSeries: string
  deleteSeries: string
  deleteSeriesConfirm: string
  seriesUpdated: string
  seriesDeleted: string
  /** "{n}" is replaced with the number of occurrences created. */
  seriesCreated: string

  note: string
  noteAddItemPh: string
  editNote: string
  closeNote: string

  stickers: string
  editStickers: string
  stickerTitle: string
  dragHint: string
  /** Mobile variant of dragHint — touch taps to place instead of dragging. */
  tapHint: string
  /** Mobile floating pill that exits sticker edit mode after the tray auto-closes. */
  stickerDone: string
  clearAll: string
  themeTitle: string
  themeSub: string

  // --- theme picker: user-authored themes ---
  themeMine: string
  themePresets: string
  themeCreate: string
  themeEdit: string
  themeDuplicate: string
  themeDelete: string
  themeDeleteConfirm: string
  /** Contains `{n}`. */
  themeLimitReached: string
  themeSaveFailed: string

  // --- theme studio shell ---
  studioTitle: string
  studioCreateTitle: string
  studioSave: string
  studioSaving: string
  studioCancel: string
  studioClose: string
  studioUnsaved: string
  studioDiscardConfirm: string
  /** Hold-to-hide, so the whole app is visible behind the panel on a phone. */
  studioPeek: string
  studioMinimize: string
  studioExpand: string
  studioTabBasics: string
  studioTabColors: string
  studioTabDecor: string
  studioTabArt: string
  studioTabAdvanced: string

  // --- basics tab ---
  studioName: string
  studioNamePh: string
  studioIcon: string
  studioIconPh: string
  studioBasedOn: string
  studioReseedConfirm: string
  studioMode: string
  studioModeLight: string
  studioModeDark: string

  // --- colours tab ---
  studioAccent: string
  studioSecondary: string
  studioSecondaryAuto: string
  studioHighlight: string
  studioPaper: string
  studioPaperPure: string
  studioPaperTinted: string
  studioPaperWarm: string
  studioIntensity: string
  studioSidebarDepth: string
  studioLineTint: string
  studioLineTintWhite: string
  studioLineTintAccent: string
  studioRandomize: string
  studioTokens: string
  studioTokensHint: string

  // --- decor tab ---
  studioShapes: string
  studioShapesHint: string
  studioDecorColors: string
  studioSidebarShapeNote: string

  // --- artwork tab ---
  studioScene: string
  studioSceneHint: string
  studioSceneOpacity: string
  studioScenePosition: string
  studioPosCenterBottom: string
  studioPosCenterCenter: string
  studioPosCenterTop: string
  studioPosLeftBottom: string
  studioPosRightBottom: string
  studioSideScene: string
  studioSideSceneHint: string
  studioFigures: string
  studioFiguresHint: string
  studioAddFigure: string
  studioFigureX: string
  studioFigureH: string
  studioFigureFlip: string
  studioFigureOpacity: string
  studioRemove: string

  // --- advanced tab ---
  studioAdvancedNote: string
  studioGroupSurfaces: string
  studioGroupText: string
  studioGroupLines: string
  studioGroupBrand: string
  studioLineAlpha: string
  studioResetToken: string
  studioResetAll: string

  // --- readability warnings ---
  themeIssueTextSurface: string
  themeIssueMuted: string
  themeIssueSidebar: string
  themeIssueScene: string
  /** Contains `{n}`. */
  studioUseOpacity: string
  studioDarkenSidebar: string

  // --- validation + image errors ---
  themeErrHex: string
  themeErrTooLong: string
  themeErrCssChars: string
  themeErrCssFunc: string
  themeErrCssParens: string
  themeErrArtOrigin: string
  themeErrArtChars: string
  themeErrPercent: string
  themeErrNeedDecor: string
  themeErrNeedColor: string
  /** Contains `{n}` — the measured size in KB. */
  themeImageTooBig: string
  themeImageTooSmall: string
  themeImageFailed: string
  themeWarnNoAlpha: string
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
  defaultCategoryWork: string
  defaultCategoryHealth: string
  defaultCategoryLearning: string
  defaultCategoryPersonal: string
  defaultCategorySocial: string
  defaultCategoryMeal: string

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
  installApp: string
  iosInstallHint: string
  gotIt: string

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
