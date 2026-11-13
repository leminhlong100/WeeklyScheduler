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

  eventContent: string
  eventContentPh: string

  dailyNotes: string
  dailyNotePh: string
  dailyNotesEmpty: string
  dailyNoteDate: string
  dailyNoteAdd: string
  dailyNoteDelete: string
  /** Toggle marking a note's day as special (birthday, party…). */
  dailyNoteSpecial: string

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
  themeMenu: string
  themeCreateFrom: string
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
  studioTabColors: string
  studioTabDecor: string
  studioTabAdvanced: string

  // --- basics tab ---
  studioName: string
  studioNamePh: string
  studioIcon: string
  studioIconPh: string
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

  // --- decor tab ---
  studioShapes: string
  studioShapesHint: string
  studioDecorColors: string

  // --- artwork tab ---
  studioScene: string
  studioSceneHint: string
  studioMobileScene: string
  studioMobileSceneHint: string
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
  studioCropEdit: string
  studioCropTitle: string
  studioCropHint: string
  studioCropZoom: string
  studioCropAspect: string
  studioCropOriginal: string
  studioCropReset: string
  studioCropCancel: string
  studioCropApply: string

  // --- advanced tab ---
  studioAdvancedNote: string
  studioDiscard: string
  studioSuggested: string
  studioIntensityLow: string
  studioIntensityHigh: string
  studioSidebarLight: string
  studioSidebarDeep: string
  studioSidebarUpgrade: string
  studioReadability: string
  studioReadabilityOk: string
  studioIssuesCount: string
  studioFixAuto: string
  studioSaveBlocked: string
  studioMoreOptions: string
  studioTokensTitle: string
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
  themeIssueScene: string
  /** Contains `{n}`. */
  studioUseOpacity: string

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
  themeImageShrunk: string
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
  categoryEmojiCustomPh: string
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
  categoryNameExists: string
  categoryUpdated: string
  categoryDeleted: string
  somethingWentWrong: string
  errNetwork: string
  /** Lỗi mạng khi lưu giao dịch: nói rõ là CHƯA lưu. */
  errNetworkNotSaved: string
  errSessionExpired: string
  errDuplicate: string
  errReference: string
  errRequired: string
  errInvalidValue: string
  errTooLong: string
  errRateLimit: string
  errPermission: string
  errNotFound: string
  errInvalidLogin: string
  errEmailTaken: string
  errEmailNotConfirmed: string
  errWeakPassword: string
  errSamePassword: string

  /* --- Module switcher (sidebar) --- */
  navScheduler: string
  navExpenses: string
  navOverview: string
  navTransactions: string
  navReport: string
  navMore: string
  spendableTitle: string
  spendableOver: string
  spendablePerDay: string
  spendableUsed: string
  spendablePlanned: string
  balanceTitle: string
  allTimeBalanceTitle: string
  setBudgetCta: string
  monthIncomeShort: string
  monthExpenseShort: string
  budgetsTitle: string
  seeAll: string
  upcomingTitle: string
  overdueBadge: string
  recentTitle: string
  seeAllTransactions: string
  emptyTitle: string
  emptyStep1: string
  emptyStep2: string
  emptyStep3: string
  backToThisMonth: string
  pickMonth: string
  filterResultSummary: string
  moreLedgers: string
  moreSettings: string
  moreLanguage: string
  moreGoScheduler: string
  dayYesterday: string
  plannedDayTotal: string
  yearSection: string
  /** Sidebar year card when the open ledger has nothing this year. */
  sidebarYearEmpty: string
  /** Accessible name of the sidebar's 12-month spending bars. */
  sidebarYearChart: string

  /* --- Expenses --- */
  expensesTitle: string
  expensesSub: string
  addExpense: string
  editExpense: string
  addTransaction: string
  addIncome: string
  editIncome: string
  saveAndAddAnother: string
  incomeCreated: string
  incomeUpdated: string
  incomeMarkReceived: string
  incomeMarkedReceived: string
  expenseAmount: string
  expenseAmountPh: string
  expenseCurrency: string
  expenseNote: string
  expenseNotePh: string
  expenseDate: string
  expenseCategory: string
  expenseUncategorized: string
  /** Placeholder on rows with no note — NOT the same thing as "uncategorized". */
  expenseNoNote: string
  /** Badge on rows the AI extracted (as opposed to typed by hand). */
  expenseSourceAi: string
  noExpenses: string
  loadErrorTitle: string
  loadErrorHint: string
  offlineNotice: string
  /** Dòng nhỏ dưới thẻ chính của Tổng quan: "Cập nhật lúc {time}". */
  dataUpdatedAtTime: string
  refreshData: string
  /** Kỳ hạn mức không theo tháng: "Kỳ {start} – {end}". */
  budgetCycleRange: string
  budgetCycleStartLabel: string
  budgetCycleStartHint: string
  loadingLabel: string
  expenseMonthTotal: string
  expenseYearTotal: string

  /* --- Thu / chi / số dư (migration 0011) --- */
  expenseKind: string
  expenseKindExpense: string
  expenseKindIncome: string
  expenseIncomeTotal: string
  expenseExpenseTotal: string
  expenseBalance: string
  /* Default income categories seeded alongside the expense ones. */
  defaultIncomeCategorySalary: string
  defaultIncomeCategoryBonus: string
  defaultIncomeCategoryInvestment: string
  defaultIncomeCategoryOther: string

  /* --- Kỳ dự kiến vs đã trả (migration 0012) --- */
  /** Badge on a row that hasn't been paid yet. */
  expensePlannedBadge: string
  /** Compact marker in a day header: that day holds unpaid rows. */
  expensePlannedShort: string
  /** Explains that planned rows are excluded from the totals above. */
  expensePlannedNotCounted: string
  /** Shown while picking a repeat length, before anything is saved. */
  expensePlannedHint: string
  /** Shown when editing a row that is still planned. */
  expensePlannedEditHint: string
  expenseMarkPaid: string
  expenseMarkedPaid: string
  deleteExpenseConfirm: string
  expenseCreated: string
  expenseUpdated: string
  expenseDeleted: string
  expenseAmountPositive: string
  expenseAmountWhole: string
  expenseAmountTooLarge: string
  fieldTooLong: string
  /* Default expense categories seeded at signup (migration 0009). */
  defaultExpenseCategoryFood: string
  defaultExpenseCategoryTransport: string
  defaultExpenseCategoryHome: string
  defaultExpenseCategoryShopping: string
  defaultExpenseCategoryHealth: string
  defaultExpenseCategoryFun: string
  defaultExpenseCategoryOther: string

  /* --- Nhập nhanh bằng AI (Bước 4) --- */
  quickAdd: string
  quickAddPh: string
  quickAddLabel: string
  quickAddSend: string
  quickAddThinking: string
  /** "{n}" = số ký tự tối đa cho một lần nhập. */
  quickAddTooLong: string
  draftTitle: string
  draftHint: string
  draftCount: string
  draftLowConfidence: string
  draftDiscard: string
  saveAll: string
  /** "{n}" = số khoản chi vừa lưu. */
  expensesSavedCount: string
  aiNoItems: string
  aiErrorAuth: string
  aiErrorRateLimited: string
  aiErrorTimeout: string
  aiErrorParseFailed: string
  aiErrorConfig: string
  aiErrorGeneric: string
  retry: string
  undo: string
  confirmTitle: string
  confirmLeave: string
  confirmRegenerate: string
  confirmRemove: string
  restored: string
  enterManually: string

  tabExpenseList: string
  tabReport: string
  reportNoData: string
  reportVsPrevMonth: string
  /**
   * Dùng khi tháng đang xem chưa kết thúc: hai bên chỉ so tới cùng một ngày.
   * "{d}" = ngày trong tháng.
   */
  reportVsPrevMonthPartial: string
  reportNoPrevMonth: string
  reportSpentOfIncome: string
  reportFlat: string
  reportBudget: string
  reportOverBudget: string
  reportByExpenseCategory: string
  reportByIncomeCategory: string

  /* --- Lọc & tìm trong danh sách --- */
  filterSearchPh: string
  filterClear: string
  filterNoResults: string
  filterKindAll: string
  filterKindExpense: string
  filterKindIncome: string
  filterCategoryAll: string

  voiceInput: string
  voiceListening: string
  voiceErrorDenied: string
  voiceErrorNoSpeech: string
  voiceErrorNoMic: string
  voiceErrorNetwork: string
  voiceErrorGeneric: string

  manageExpenseCategories: string

  ledgerPersonal: string
  ledgerNew: string
  ledgerCreate: string
  ledgerCreateTitle: string
  ledgerCreateHint: string
  ledgerName: string
  ledgerNamePh: string
  ledgerNameRequired: string
  ledgerEmoji: string
  ledgerCreated: string
  ledgerSaved: string
  ledgerSettings: string
  ledgerSharedWithMe: string
  ledgerViewOnly: string
  ledgerShareTitle: string
  ledgerShareHint: string
  ledgerInviteEnable: string
  ledgerInviteCopy: string
  ledgerInviteCopied: string
  ledgerInviteCopyFailed: string
  ledgerInviteShare: string
  ledgerInviteShareText: string
  ledgerInviteRegenerate: string
  ledgerInviteRegenerateConfirm: string
  ledgerInviteDisable: string
  ledgerMembers: string
  ledgerNoMembers: string
  ledgerRemoveMember: string
  ledgerRemoveMemberConfirm: string
  ledgerMemberRemoved: string
  ledgerDelete: string
  ledgerDeleteConfirm: string
  ledgerDeleted: string
  ledgerLeave: string
  ledgerLeaveConfirm: string
  ledgerLeft: string
  ledgerBalanceTitle: string
  ledgerBalanceEmpty: string
  ledgerBalanceRemaining: string
  ledgerBalanceIn: string
  ledgerBalanceOut: string
  joinLedgerTitle: string
  joinLedgerLoginHint: string
  joinLedgerInvalid: string
  joinLedgerSuccess: string
  joinLedgerGoToExpenses: string
  addExpenseCategory: string
  editExpenseCategory: string
  deleteExpenseCategoryConfirm: string
  expenseBudget: string
  expenseBudgetPh: string
  expenseBudgetPositive: string
  exportCsv: string
  hideAmounts: string
  showAmounts: string
  hideCustomTitle: string
  expenseStats: string
  statsSpentOfIncome: string
  statsBasisIncome: string
  statsBasisExpense: string
  hideSelectAll: string
  hideClearAll: string
  hideScopeMonth: string
  hideScopeYear: string
  hideScopeDay: string
  hideScopeCategories: string
  csvColumnKind: string
  csvColumnKindLabel: string
  csvFilePrefix: string
  csvColumnStatus: string
  csvColumnSource: string
  csvColumnRawText: string
  expenseRepeat: string
  expenseRepeatNone: string
  /** "{n}" = số tháng của chuỗi định kỳ. */
  expenseRepeatMonths: string
  expenseSeriesNotice: string
  applyToExpenseSeries: string
  deleteExpenseSeries: string
  deleteExpenseSeriesConfirm: string
  /** "{n}" = số kỳ vừa tạo. */
  expenseSeriesCreated: string
  expenseSeriesUpdated: string
  expenseSeriesDeleted: string

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
