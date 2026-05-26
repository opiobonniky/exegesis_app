export type Language =
  | 'en'
  | 'es'
  | 'fr'
  | 'ar'
  | 'de'
  | 'pt'
  | 'hi'
  | 'bn'
  | 'ta'
  | 'te'
  | 'mr'
  | 'gu'
  | 'kn'
  | 'ml'
  | 'pa'
  | 'ur'
  | 'sw'
  | 'it'
  | 'el'
  | 'ru'
  | 'ne'
  | 'fil';

// Onboarding / Welcome screen translations
export type OnboardingTranslations = {
  skip?: string;
  getStarted?: string;
  continueLabel?: string;
  slide1Highlight?: string;
  slide1Text?: string;
  slide1Feature1?: string;
  slide1Feature2?: string;
  slide1Feature3?: string;
  slide2Highlight?: string;
  slide2Text?: string;
  slide2Feature1?: string;
  slide2Feature2?: string;
  slide2Feature3?: string;
  slide3Highlight?: string;
  slide3Text?: string;
  slide3Feature1?: string;
  slide3Feature2?: string;
  slide3Feature3?: string;
};

// Explicit translations shape so editors can autocomplete (strong typing)
export type Translations = {
  login: {
    title: string;
    email: string;
    password: string;
    subtitle: string;
    button: string;
    google: string;
    lordsbook?: string;
    continuewith: string;
    terms: {
      byContinuing: string;
      and: string;
      termsOfService: string;
      privacyPolicy: string;
    };
    footer: {
      fullVersion: string;
    };
  };
  forgotPassword: {
    title: string;
    submit: string;
    text: string;
    resetTitle?: string;
    resetSubtitle?: string;
    passwordPlaceholder?: string;
    confirmPasswordPlaceholder?: string;
    confirmLabel?: string;
    tip?: string;
    resetAction?: string;
    helpPrefix?: string;
    contact?: string;
    emailPlaceholder?: string;
  };
  createAccount: {
    text: string;
  };
  // screen-specific continue text moved into login.continuewith
  validation: {
    emailRequired: string;
    invalidEmail: string;
    passwordRequired: string;
    passwordMin: string;
    usernameRequired?: string;
    usernameMin?: string;
    usernameFormat?: string;
    firstNameRequired?: string;
    lastNameRequired?: string;
    phoneInvalid?: string;
    passwordRequirementsPrefix?: string;
    missingPrefix?: string;
    confirmPassword?: string;
  };
  errors?: {
    googleFailed?: string;
    noIdToken?: string;
    unknown?: string;
    unexpected?: string;
    warning?: string;
    noInternet?: string;
    enterVerificationCode?: string;
    registrationFailed?: string;
    tryAgainLater?: string;
    failedResendCode?: string;
  };
  register?: {
    title?: string;
    username?: string;
    email?: string;
    password?: string;
    button?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    confirmPassword?: string;
    subtitle?: string;
    googleComplete?: string;
    firstPlaceholder?: string;
    lastPlaceholder?: string;
    emailPlaceholder?: string;
    usernamePlaceholder?: string;
    phonePlaceholder?: string;
    datePlaceholder?: string;
    passwordPlaceholder?: string;
    confirmPasswordPlaceholder?: string;
    pwdReqs?: string[];
    useDifferentAccount?: string;
    genderMale?: string;
    genderFemale?: string;
    genderNotSpecified?: string;
    successCreated?: string;
    successVerifyEmail?: string;
    successEmailVerified?: string;
    successCodeResent?: string;
  };
  timePicker?: {
    selectTime?: string;
    hour?: string;
    minute?: string;
    cancel?: string;
    confirm?: string;
  };
  passwords?: {
    strong?: string;
    medium?: string;
    weak?: string;
    match?: string;
    notMatch?: string;
  };
  verify?: {
    title?: string;
    subtitle?: string;
    button?: string;
    didntReceive?: string;
    resend?: string;
    action?: string;
    resendTimerPrefix?: string;
    alreadyVerified?: string;
  };
  welcome: {
    title: string;
    message: string;
  };
  appTagline?: string;
  [k: string]: any;
};

// Bible screen translations
export type BibleTranslations = {
  noContent?: string;
  noHighlights?: string;
  search?: string;
  translate?: string;
  book?: string;
  chapter?: string;
  verses?: string;
  dailyVerse?: string;
  readingPlan?: string;
  bookmarks?: string;
  highlights?: string;
  audioBible?: string;
  notes?: string;
  settings?: string;
  
  // Verse card actions
  bookmark?: string;
  read?: string;
  copy?: string;
  share?: string;
  highlight?: string;
  removeHighlight?: string;
  
  // Chapter navigation
  previousChapter?: string;
  nextChapter?: string;
  
  // Selection action bar
  itemsSelected?: string;
  copySelected?: string;
  
  // Search modal
  searchPlaceholder?: string;
  noResults?: string;
  searchBible?: string;
  searchResults?: string;
  
  // Book selector
  selectBook?: string;
  oldTestament?: string;
  newTestament?: string;
  
  // Chapter selector
  selectChapter?: string;
  
  // Translation picker
  selectTranslation?: string;
  loadingTranslations?: string;
  
  // Highlight picker
  highlightColor?: string;
  
  // Explanation modal
  explanation?: string;
  close?: string;
  
  // Verse resource sheet
  resources?: string;
  commentaries?: string;
  crossReferences?: string;
  strongsConcordance?: string;
  
  // Loading
  loadingMessage?: string;
  
  // Drawer menu
  dailyReading?: string;
  bookmarksAndHighlights?: string;
  nightMode?: string;
  
  // Verse list
  selectVerses?: string;
  
  // Audio
  playAudio?: string;
  
  // Other
  cancel?: string;
  done?: string;
  
  // Search modal
  searchBibleTitle?: string;
  searchingIn?: string;
  searchHint?: string;
  typeMinChars?: string;
  searchingFor?: string;
  foundResults?: string;
  enterKeywords?: string;
  trySearchingFor?: string;
  noResultsFound?: string;
  tryDifferentKeywords?: string;
  clearAndTryAgain?: string;
  
  // Book selector
  selectBookTitle?: string;
  booksCount?: string;
  searchBooksPlaceholder?: string;
  oldTestamentTab?: string;
  newTestamentTab?: string;
  noBooksFound?: string;
  chaptersAbbr?: string;
  
  // Chapter selector
  selectChapterTitle?: string;
  chaptersAvailable?: string;
  
  // Translation picker
  loadingEllipsis?: string;
  translationsAvailable?: string;
  searchTranslationsPlaceholder?: string;
  loadingTranslationsText?: string;
  noTranslationsFound?: string;
  noTranslationsAvailable?: string;
  
  // Plan Bible Screen
  planBiblePauseReflect?: string;
  planBibleQuestionsForReading?: string;
  planBibleSingleQuestionForReading?: string;

  // Daily Reading Screen
  dailyReadingCurrentProgress?: string;
  dailyReadingInProgress?: string;
  dailyReadingCompleted?: string;
  dailyReadingScripturePassages?: string;
  dailyReadingPersonalReflection?: string;
  dailyReadingReflectionSubtitle?: string;
  dailyReadingKnowledgeCheck?: string;
  dailyReadingRead?: string;
  dailyReadingChapterLabel?: string;
  dailyReadingPonder?: string;
  dailyReadingQuestionOf?: string;
  dailyReadingSubmitAnswer?: string;
  dailyReadingUpdateAnswer?: string;
  dailyReadingNextQuestion?: string;
  dailyReadingSeeResults?: string;
  dailyReadingSkip?: string;
  dailyReadingYourResults?: string;
  dailyReadingCorrect?: string;
  dailyReadingWrong?: string;
  dailyReadingQuestionSummary?: string;
  dailyReadingReviewRetry?: string;
  dailyReadingMarkDone?: string;
  dailyReadingMarkDayComplete?: string;
  dailyReadingPrevious?: string;
  dailyReadingNext?: string;
  dailyReadingComingSoon?: string;
  dailyReadingNotAddedYet?: string;
  dailyReadingLoading?: string;
  dailyReadingDayOf?: string;
  dailyReadingChaptersCount?: string;
  dailyReadingQuizCount?: string;
  dailyReadingDoneLabel?: string;
  dailyReadingTryLabel?: string;
  dailyReadingCancel?: string;
  dailyReadingCorrectLabel?: string;
  dailyReadingIncorrectLabel?: string;
  dailyReadingNotAnswered?: string;
  dailyReadingCompleteDayTitle?: string;
  dailyReadingCompleteDayMessage?: string;
  dailyReadingConfirmNext?: string;
  dailyReadingConfirmFinish?: string;
  dailyReadingScorePerfect?: string;
  dailyReadingScoreWellDone?: string;
  dailyReadingScoreAlmostThere?: string;
  dailyReadingScoreGoodEffort?: string;
  dailyReadingScoreKeepGoing?: string;
  dailyReadingScoreDescriptionZero?: string;
  dailyReadingScoreDescriptionLow?: string;
  dailyReadingScoreDescriptionMedium?: string;
  dailyReadingScoreDescriptionHigh?: string;
  dailyReadingScoreDescriptionPerfect?: string;
  dailyReadingReviewMode?: string;
  dailyReadingAutoAdvance?: string;
  dailyReadingCorrectAnswer?: string;
  dailyReadingChapterBibleBtn?: string;
  dailyReadingDayCompleteText?: string;
  dailyReadingDayLabel?: string;

  // Plan Detail Screen
  planDetailDays?: string;
  planDetailCalendar?: string;
  planDetailStats?: string;
  planDetailDaysDone?: string;
  planDetailStreak?: string;
  planDetailQuiz?: string;
  planDetailLevel?: string;
  planDetailCompleted?: string;
  planDetailToday?: string;
  planDetailUpcoming?: string;
  planDetailReadingSchedule?: string;
  planDetailSessionsComplete?: string;
  planDetailStarted?: string;
  planDetailDaysElapsed?: string;
  planDetailLastSession?: string;
  planDetailDaysInactive?: string;
  planDetailAvgPace?: string;
  planDetailEstToFinish?: string;
  planDetailAlmostDone?: string;
  planDetailQuizPerformance?: string;
  planDetailByDay?: string;
  planDetailMilestones?: string;
  planDetailActivity?: string;
  planDetailChapters?: string;
  planDetailQuizResults?: string;
  planDetailReflection?: string;
  planDetailStartReading?: string;
  planDetailDone?: string;
  planDetailInProgress?: string;
  planDetailDayLabel?: string;
  planDetailDaysLabel?: string;
  planDetailDaysLeft?: string;
  planDetailRemaining?: string;
  planDetailOfLabel?: string;
  planDetailCorrect?: string;
  planDetailToGo?: string;
  planDetailEstLeft?: string;

  // Bible Reading Plan (list/browse)
  bpTitle?: string;
  bpSubtitle?: string;
  bpTabProgress?: string;
  bpTabBrowse?: string;
  bpNoActivePlan?: string;
  bpNoActivePlanSub?: string;
  bpBrowsePlans?: string;
  bpBrowseHint?: string;
  bpLoading?: string;
  bpDaysDone?: string;
  bpLastRead?: string;
  bpSummary?: string;
  bpRevisit?: string;
  bpContinue?: string;
  bpBeginDay?: string;
  bpCompletedPlans?: string;
  bpDifficultyEasy?: string;
  bpDifficultyMedium?: string;
  bpDifficultyHard?: string;
  bpQALabel?: string;
  bpDaysLabel?: string;
  bpProgressLabel?: string;
  bpStartPlanTitle?: string;
  bpStartPlanMessage?: string;
  bpRemovePlanTitle?: string;
  bpRemovePlanMessage?: string;
  bpStartPlanConfirm?: string;
  bpRemoveConfirm?: string;
  bpKeepIt?: string;
  bpActive?: string;
  bpDone?: string;
  bpComplete?: string;
  bpOfLabel?: string;

  // Favorites
  noFavorites?: string;
  savedVerses?: string;
  removeFavorite?: string;
  removing?: string;
  keep?: string;
  
  // Notes
  myNotes?: string;
  noNotes?: string;
  noNotesSubtitle?: string;
  editNote?: string;
  writeNotePlaceholder?: string;
  save?: string;

  // Read history
  today?: string;
  yesterday?: string;
  noHistory?: string;
  noHistorySubtitle?: string;
  deleteHistoryItem?: string;
  deleteAllConfirm?: string;
  deleteSingleConfirm?: string;
  clearHistoryButton?: string;
  delete?: string;
  historyItemsDeleted?: string;

  // Highlight picker
  highlightTitle?: string;
  chooseColor?: string;
  warm?: string;
  cool?: string;
  nature?: string;
  removeHighlightLabel?: string;
  
  // Drawer
  bibleReader?: string;
  sectionAccount?: string;
  sectionReading?: string;
  sectionLibrary?: string;
  sectionAppearance?: string;
  favorites?: string;
  readingHistory?: string;
  journal?: string;
  guestName?: string;
  guestSubtitle?: string;
  signInBtn?: string;
  readingSettingsLabel?: string;
  darkModeLabel?: string;
  switchAppearance?: string;
  change?: string;
  hideVersion?: string;
  
  // Explanation modal
  verseExplanation?: string;
  selectedVersesLabel?: string;
  meaningAndContext?: string;
  aiPoweredInsight?: string;
  fullDeepDive?: string;
  
  // Verse range slider
  verseRangeLabel?: string;
  versesCount?: string;
  
  // Daily Devotional
  verseOfTheDay?: string;
  loadingDevotional?: string;
  noDevotionalToday?: string;
  todaysDevotion?: string;
  meditationDevotionText?: string;
  meditationVerseText?: string;
  dailyDevotionalTitle?: string;
  
  // Daily Verse Screen
  loadingVerseOfDay?: string;
  noVerseToday?: string;
  dailyVerseTitle?: string;
  verseCopiedTitle?: string;
  verseCopiedMessage?: string;
  
  // Full Verse Explanation
  loadingExplanation?: string;
  somethingWentWrong?: string;
  tryAgain?: string;
  noContentAvailable?: string;
  missingVerseReference?: string;
  noExplanationFound?: string;
  failedToLoadExplanation?: string;
  networkError?: string;
  verseExplanationTitle?: string;
  updatedLabel?: string;
  addedLabel?: string;
  
  // Show less/more
  showLess?: string;
  showMore?: string;
  continueReading?: string;

  // Daily greeting
  dailyGreetingMorning?: string;
  dailyGreetingAfternoon?: string;
  dailyGreetingEvening?: string;

  // Action labels
  explain?: string;
  reflection?: string;
  learnMore?: string;
  verseLabel?: string;

  // Books of the Bible
  genesis?: string;
  exodus?: string;
  leviticus?: string;
  numbers?: string;
  deuteronomy?: string;
  joshua?: string;
  judges?: string;
  ruth?: string;
  samuel1?: string;
  samuel2?: string;
  kings1?: string;
  kings2?: string;
  chronicles1?: string;
  chronicles2?: string;
  ezra?: string;
  nehemiah?: string;
  esther?: string;
  job?: string;
  psalms?: string;
  proverbs?: string;
  ecclesiastes?: string;
  songOfSolomon?: string;
  isaiah?: string;
  jeremiah?: string;
  lamentations?: string;
  ezekiel?: string;
  daniel?: string;
  hosea?: string;
  joel?: string;
  amos?: string;
  obadiah?: string;
  jonah?: string;
  micah?: string;
  nahum?: string;
  habakkuk?: string;
  zephaniah?: string;
  haggai?: string;
  zechariah?: string;
  malachi?: string;
  matthew?: string;
  mark?: string;
  luke?: string;
  john?: string;
  acts?: string;
  romans?: string;
  corinthians1?: string;
  corinthians2?: string;
  galatians?: string;
  ephesians?: string;
  philippians?: string;
  colossians?: string;
  thessalonians1?: string;
  thessalonians2?: string;
  timothy1?: string;
  timothy2?: string;
  titus?: string;
  philemon?: string;
  hebrews?: string;
  james?: string;
  peter1?: string;
  peter2?: string;
  john1?: string;
  john2?: string;
  john3?: string;
  jude?: string;
  revelation?: string;
};

// Reading Plan screens (list, daily reading, plan detail)
export type ReadingPlanTranslations = {
  // Bible Reading Plan (list/browse)
  bpTitle?: string;
  bpSubtitle?: string;
  bpTabProgress?: string;
  bpTabBrowse?: string;
  bpNoActivePlan?: string;
  bpNoActivePlanSub?: string;
  bpBrowsePlans?: string;
  bpBrowseHint?: string;
  bpLoading?: string;
  bpDaysDone?: string;
  bpLastRead?: string;
  bpSummary?: string;
  bpRevisit?: string;
  bpContinue?: string;
  bpBeginDay?: string;
  bpCompletedPlans?: string;
  bpStreak?: string;
  bpDifficultyEasy?: string;
  bpDifficultyMedium?: string;
  bpDifficultyHard?: string;
  bpQALabel?: string;
  bpDaysLabel?: string;
  bpProgressLabel?: string;
  bpStartPlanTitle?: string;
  bpStartPlanMessage?: string;
  bpRemovePlanTitle?: string;
  bpRemovePlanMessage?: string;
  bpStartPlanConfirm?: string;
  bpRemoveConfirm?: string;
  bpKeepIt?: string;
  bpActive?: string;
  bpDone?: string;
  bpComplete?: string;
  bpOfLabel?: string;

  // Daily Reading Screen
  dailyReadingCurrentProgress?: string;
  dailyReadingInProgress?: string;
  dailyReadingCompleted?: string;
  dailyReadingScripturePassages?: string;
  dailyReadingPersonalReflection?: string;
  dailyReadingReflectionSubtitle?: string;
  dailyReadingKnowledgeCheck?: string;
  dailyReadingRead?: string;
  dailyReadingChapterLabel?: string;
  dailyReadingPonder?: string;
  dailyReadingQuestionOf?: string;
  dailyReadingSubmitAnswer?: string;
  dailyReadingUpdateAnswer?: string;
  dailyReadingNextQuestion?: string;
  dailyReadingSeeResults?: string;
  dailyReadingSkip?: string;
  dailyReadingYourResults?: string;
  dailyReadingCorrect?: string;
  dailyReadingWrong?: string;
  dailyReadingQuestionSummary?: string;
  dailyReadingReviewRetry?: string;
  dailyReadingMarkDone?: string;
  dailyReadingMarkDayComplete?: string;
  dailyReadingPrevious?: string;
  dailyReadingNext?: string;
  dailyReadingComingSoon?: string;
  dailyReadingNotAddedYet?: string;
  dailyReadingLoading?: string;
  dailyReadingDayOf?: string;
  dailyReadingChaptersCount?: string;
  dailyReadingQuizCount?: string;
  dailyReadingDoneLabel?: string;
  dailyReadingTryLabel?: string;
  dailyReadingCancel?: string;
  dailyReadingCorrectLabel?: string;
  dailyReadingIncorrectLabel?: string;
  dailyReadingNotAnswered?: string;
  dailyReadingCompleteDayTitle?: string;
  dailyReadingCompleteDayMessage?: string;
  dailyReadingConfirmNext?: string;
  dailyReadingConfirmFinish?: string;
  dailyReadingScorePerfect?: string;
  dailyReadingScoreWellDone?: string;
  dailyReadingScoreAlmostThere?: string;
  dailyReadingScoreGoodEffort?: string;
  dailyReadingScoreKeepGoing?: string;
  dailyReadingScoreDescriptionZero?: string;
  dailyReadingScoreDescriptionLow?: string;
  dailyReadingScoreDescriptionMedium?: string;
  dailyReadingScoreDescriptionHigh?: string;
  dailyReadingScoreDescriptionPerfect?: string;
  dailyReadingReviewMode?: string;
  dailyReadingAutoAdvance?: string;
  dailyReadingCorrectAnswer?: string;
  dailyReadingChapterBibleBtn?: string;
  dailyReadingDayCompleteText?: string;
  dailyReadingDayLabel?: string;

  // Plan Detail Screen
  planDetailDays?: string;
  planDetailCalendar?: string;
  planDetailStats?: string;
  planDetailDaysDone?: string;
  planDetailStreak?: string;
  planDetailQuiz?: string;
  planDetailLevel?: string;
  planDetailCompleted?: string;
  planDetailToday?: string;
  planDetailUpcoming?: string;
  planDetailReadingSchedule?: string;
  planDetailSessionsComplete?: string;
  planDetailStarted?: string;
  planDetailDaysElapsed?: string;
  planDetailLastSession?: string;
  planDetailDaysInactive?: string;
  planDetailAvgPace?: string;
  planDetailEstToFinish?: string;
  planDetailAlmostDone?: string;
  planDetailQuizPerformance?: string;
  planDetailByDay?: string;
  planDetailMilestones?: string;
  planDetailActivity?: string;
  planDetailChapters?: string;
  planDetailQuizResults?: string;
  planDetailReflection?: string;
  planDetailStartReading?: string;
  planDetailDone?: string;
  planDetailInProgress?: string;
  planDetailDayLabel?: string;
  planDetailDaysLabel?: string;
  planDetailDaysLeft?: string;
  planDetailRemaining?: string;
  planDetailOfLabel?: string;
  planDetailCorrect?: string;
  planDetailToGo?: string;
  planDetailEstLeft?: string;
  planDetailIncorrect?: string;
  planDetailTotalQuestions?: string;
  planDetailQuizLabel?: string;
  planDetailPlanNotFound?: string;
  planDetailNotAnswered?: string;
};

// Bottom Tab translations
export type BottomTabTranslations = {
  home?: string;
  bible?: string;
  plan?: string;
  profile?: string;
  dashboard?: string;
  users?: string;
  verse?: string;
  devotion?: string;
};

// Edit Profile translations
export type EditProfileTranslations = {
  title?: string;
  section?: { personal?: string };
  fields?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dob?: string;
    gender?: string;
    marital?: string;
  };
  placeholders?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dob?: string;
  };
  gender?: {
    male?: string;
    female?: string;
  };
  marital?: {
    single?: string;
    married?: string;
    divorced?: string;
    widowed?: string;
  };
  additionalInfo?: {
    title?: string;
    desc?: string;
  };
  saving?: string;
  save?: string;
  info?: {
    emailChange?: string;
  };
};

// Extended Profile translations
export type ExtendedProfileTranslations = {
  title?: string;
  personalDetails?: {
    title?: string;
    description?: string;
    fields?: {
      middleName?: string;
      middleNamePlaceholder?: string;
      alternativePhone?: string;
      alternativePhonePlaceholder?: string;
    };
  };
  ministryService?: {
    title?: string;
    description?: string;
    fields?: {
      ministryGroup?: string;
      ministryGroupPlaceholder?: string;
      servicePosition?: string;
      servicePositionPlaceholder?: string;
      spiritualGifts?: string;
      spiritualGiftsPlaceholder?: string;
    };
  };
  emergencyContact?: {
    title?: string;
    description?: string;
    fields?: {
      contactName?: string;
      contactNamePlaceholder?: string;
      contactPhone?: string;
      contactPhonePlaceholder?: string;
      relationship?: string;
    };
  };
  relationshipOptions?: {
    spouse?: string;
    parent?: string;
    sibling?: string;
    child?: string;
    friend?: string;
    other?: string;
  };
  save?: string;
  saving?: string;
  info?: string;
  validation?: {
    phoneInvalid?: string;
    emergencyNameRequired?: string;
    emergencyPhoneRequired?: string;
    relationshipRequired?: string;
  };
};

// Profile / Settings translations
export type ProfileTranslations = {
  title?: string;
  stats?: {
    books?: string;
    chapters?: string;
    highlights?: string;
    notes?: string;
  };
  menuSections?: {
    bibleStudy?: string;
    settings?: string;
  };
  menuItems?: {
    continueReading?: string;
    myHighlights?: string;
    favorites?: string;
    myNotes?: string;
    readingHistory?: string;
    language?: string;
    lightMode?: string;
    darkMode?: string;
    notifications?: string;
    editProfile?: string;
    readingSettings?: string;
  };
  fields?: {
    email?: string;
    phone?: string;
    memberSince?: string;
  };
  logout?: {
    logout?: string;
    loggingOut?: string;
    confirmTitle?: string;
    confirmMessage?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  };
};
// Admin Dashboard translations
export type AdminTranslations = {
  analytics?: string;
  dashboard?: string;
  users?: string;
  dailyVerseLabel?: string;
  dailyDevotionLabel?: string;
  readingPlansLabel?: string;
  journalPromptsLabel?: string;
  journalTemplatesLabel?: string;
  activity?: string;
  navigationSection?: string;
  accountSection?: string;
  notifications?: string;
  signOut?: string;
  adminConsole?: string;
  totalUsers?: string;
  activeKpi?: string;
  plansKpi?: string;
  enrolledKpi?: string;
  userOverview?: string;
  activeUsers?: string;
  verified?: string;
  inactive?: string;
  roleDistribution?: string;
  admins?: string;
  members?: string;
  totalLabel?: string;
  platformHealth?: string;
  activeRate?: string;
  verificationRate?: string;
  completionRate?: string;
  quickActions?: string;
  manageUsers?: string;
  viewEditUsers?: string;
  viewActivity?: string;
  loginSessions?: string;
  manageDailyVerses?: string;
  managePlans?: string;
  managePrompts?: string;
  manageTemplates?: string;
  manageDevotions?: string;
  welcomeBack?: string;
  heyPrefix?: string;
  adminBadge?: string;
  superAdminBadge?: string;

  // User management
  userManagement?: string;
  searchUsersPlaceholder?: string;
  noUsersFound?: string;
  userVerified?: string;
  unverified?: string;
  active?: string;
  userInactive?: string;
  editLabel?: string;
  deleteLabel?: string;
  totalCountSuffix?: string;
  totalCountSuffixPlural?: string;
  userActivated?: string;
  userDeactivated?: string;
  verificationGranted?: string;
  verificationRevoked?: string;
  userDeleted?: string;
  userUpdated?: string;
  failedUpdateUser?: string;
  failedDeleteUser?: string;
  failedUpdateStatus?: string;
  failedUpdateVerification?: string;
  cannotDeleteSelf?: string;
  deleteUserTitle?: string;
  deleteUserMessage?: string;

  // Edit modal
  editUserTitle?: string;
  personalInfoSection?: string;
  firstNameField?: string;
  lastNameField?: string;
  middleNameField?: string;
  firstNamePlaceholder?: string;
  lastNamePlaceholder?: string;
  optionalPlaceholder?: string;
  contactInfoSection?: string;
  emailField?: string;
  phoneField?: string;
  phonePlaceholder?: string;
  additionalInfoSection?: string;
  genderField?: string;
  maritalField?: string;
  genderMale?: string;
  genderFemale?: string;
  genderOther?: string;
  maritalSingle?: string;
  maritalMarried?: string;
  maritalDivorced?: string;
  maritalWidowed?: string;
  roleStatusSection?: string;
  roleField?: string;
  cannotChangeOwnRole?: string;
  roleAdmin?: string;
  roleMember?: string;
  accountStatus?: string;
  saveChanges?: string;
  savingLabel?: string;
  cancelBtn?: string;

  // Daily Verse (Add/Edit screen)
  dailyVerseDetails?: string;
  dailyVerseTestament?: string;
  dailyVerseSelectBook?: string;
  dailyVerseSelectChapter?: string;
  dailyVerseSelectVerse?: string;
  dailyVerseSelectVersion?: string;
  dailyVerseSearchBooks?: string;
  dailyVerseChapter?: string;
  dailyVerseVerse?: string;
  dailyVerseVerseText?: string;
  dailyVerseReadOnly?: string;
  dailyVerseExplanation?: string;
  dailyVerseLearnMore?: string;
  dailyVerseOptional?: string;
  dailyVersePublished?: string;
  dailyVerseShowToAll?: string;
  dailyVerseAddTitle?: string;
  dailyVerseEditTitle?: string;
  dailyVerseSave?: string;
  dailyVerseUpdate?: string;
  dailyVerseFillRequired?: string;
  dailyVerseUpdated?: string;
  dailyVerseAdded?: string;
  dailyVerseFailedUpdate?: string;
  dailyVerseFailedAdd?: string;
  dailyVerseExplanationPlaceholder?: string;
  dailyVerseLearnMorePlaceholder?: string;
  dailyVerseModalSelectBook?: string;
  dailyVerseModalSelectChapter?: string;
  dailyVerseModalSelectVerse?: string;    dailyVerseModalSelectVersion?: string;

  // Daily Verse Manager (list/management screen)
  dvManagerTitle?: string;
  dvManagerAdd?: string;
  dvManagerSearchFilter?: string;
  dvManagerHideFilters?: string;
  dvManagerBookLabel?: string;
  dvManagerChapterLabel?: string;
  dvManagerVerseLabel?: string;
  dvManagerFromLabel?: string;
  dvManagerToLabel?: string;
  dvManagerAllBooks?: string;
  dvManagerAny?: string;
  dvManagerStartDate?: string;
  dvManagerEndDate?: string;
  dvManagerReset?: string;
  dvManagerSearchBooks?: string;
  dvManagerSelectBook?: string;
  dvManagerSelectChapter?: string;
  dvManagerSelectVerse?: string;
  dvManagerPublished?: string;
  dvManagerDraft?: string;
  dvManagerExplanation?: string;
  dvManagerNoVerses?: string;
  dvManagerAddFirst?: string;
  dvManagerVerseDeleted?: string;
  dvManagerDeleteTitle?: string;
  dvManagerDeleteMessage?: string;
  dvManagerDelete?: string;
  dvManagerFailedDelete?: string;

  // Reading Plans
  readingPlanTitle?: string;
  readingPlanSubtitle?: string;
  readingPlanSubtitlePlural?: string;
  readingPlanTotalPlans?: string;
  readingPlanActive?: string;
  readingPlanWithQuiz?: string;
  readingPlanDays?: string;
  readingPlanQuiz?: string;
  readingPlanActiveStatus?: string;
  readingPlanInactiveStatus?: string;
  readingPlanStatsLabel?: string;
  readingPlanEditLabel?: string;
  readingPlanDeleteLabel?: string;
  readingPlanNoPlans?: string;
  readingPlanCreateFirst?: string;
  readingPlanDeleteTitle?: string;
  readingPlanDeleteMessage?: string;
  readingPlanCancelBtn?: string;
  readingPlanDeleteBtn?: string;
  readingPlanDeletedToast?: string;
  readingPlanFailedDelete?: string;

  // Plan form — shared between Create & Edit
  planFormTitleLabel?: string;
  planFormDescriptionLabel?: string;
  planFormTotalDaysLabel?: string;
  planFormCategoryLabel?: string;
  planFormDifficultyLabel?: string;
  planFormQuizLabel?: string;
  planFormQuizSubLabel?: string;
  planFormDayTitleLabel?: string;
  planFormChaptersLabel?: string;
  planFormReflectionLabel?: string;
  planFormQuizQuestionsLabel?: string;
  planFormExplanationLabel?: string;
  planFormExplanationPlaceholder?: string;
  planFormAddChapter?: string;
  planFormAddReflection?: string;
  planFormAddQuestion?: string;
  planFormSelectBook?: string;
  planFormSearchBooks?: string;
  planFormModalSelectBook?: string;
  planFormDayTitlePlaceholder?: string;
  planFormReflectionPlaceholder?: string;
  planFormQuizPlaceholder?: string;
  planFormOptionPlaceholder?: string;
  planFormBack?: string;
  planFormChaptersCount?: string;

  // Create Plan — screen-specific
  createPlanTitle?: string;
  createPlanSubtitle?: string;
  createPlanStepPlanInfo?: string;
  createPlanStepDailyContent?: string;
  createPlanStepReviewSave?: string;
  createPlanCardDetails?: string;
  createPlanCardDetailsSub?: string;
  createPlanCardDailyContent?: string;
  createPlanCardDailyContentSub?: string;
  createPlanCardReview?: string;
  createPlanTitlePlaceholder?: string;
  createPlanDescPlaceholder?: string;
  createPlanNextBtn?: string;
  createPlanReviewBtn?: string;
  createPlanSaveBtn?: string;
  createPlanSaving?: string;
  createPlanSuccess?: string;
  createPlanValidateTitle?: string;
  createPlanValidateDays?: string;
  createPlanValidateMaxDays?: string;
  createPlanValidateIncomplete?: string;
  createPlanValidateNoComplete?: string;
  createPlanDayAssignments?: string;
  createPlanNotConfigured?: string;
  createPlanReady?: string;
  createPlanPartial?: string;
  createPlanReadyCount?: string;
  createPlanDayTitleEmpty?: string;
  createPlanDayFailed?: string;
  createPlanQuizFailed?: string;
  createPlanNetworkError?: string;

  // Edit Plan — screen-specific
  editPlanTitle?: string;
  editPlanCardPlanInfo?: string;
  editPlanCardPlanInfoSub?: string;
  editPlanCardDailyAssignments?: string;
  editPlanActiveLabel?: string;
  editPlanSaveInfo?: string;
  editPlanSavingInfo?: string;
  editPlanSavedInfo?: string;
  editPlanSaveDay?: string;
  editPlanSavingDay?: string;
  editPlanDaySaved?: string;
  editPlanLoading?: string;
  editPlanNotFound?: string;
  editPlanGoBack?: string;
  editPlanValidateTitle?: string;
  editPlanValidateDayTitle?: string;
  editPlanValidateDayChapters?: string;
  editPlanTapToConfigure?: string;
  editPlanSaved?: string;
  editPlanNewBadge?: string;
  editPlanQuestionDeleted?: string;
  editPlanQuestionDeleteFailed?: string;
  editPlanReflectionPlaceholder?: string;
  editPlanLoadError?: string;
  editPlanSaveFailed?: string;
  editPlanDays?: string;

  // Plan Detail (stats screen)
  planDetailTitle?: string;
  planDetailTotalEnrolled?: string;
  planDetailQuizCW?: string;
  planDetailGlobalAccuracy?: string;
  planDetailInProgress?: string;
  planDetailUserProgress?: string;
  planDetailSearchUsers?: string;
  planDetailProgress?: string;
  planDetailQuizCWLabel?: string;
  planDetailStreak?: string;
  planDetailLastActivity?: string;
  planDetailNever?: string;
  planDetailStatusDone?: string;
  planDetailStatusInProgress?: string;
  planDetailStatusStarted?: string;
  planDetailNoUsersMatch?: string;
  planDetailNoUsersEnrolled?: string;
  planDetailEnrollmentTrend?: string;
  planDetailQuizPerformance?: string;
  planDetailTotalAnswers?: string;
  planDetailGlobalAccuracyLabel?: string;
  planDetailDifficultQuestions?: string;
  planDetailDayLabel?: string;
  planDetailPercentCorrect?: string;
  planDetailAnswersCount?: string;
  planDetailPlanStructure?: string;
  planDetailUntitled?: string;
  planDetailAccuracyShort?: string;

  // Activity Logs
  activityLogsTitle?: string;
  activityLogsSessions?: string;
  activitySuccessful?: string;
  activityFailed?: string;
  activityOnlineLabel?: string;
  activityAllFilter?: string;
  activitySuccessFilter?: string;
  activityFailedFilter?: string;
  activityJustNow?: string;
  activityMinutesAgo?: string;
  activityHoursAgo?: string;
  activityDaysAgo?: string;
  activityUnknown?: string;
  activityNoActivity?: string;
  activityLoggedOut?: string;
  activityOnlineStatus?: string;
  activityLastActivity?: string;

  // Devotion Manager
  devotionManagerTitle?: string;
  devotionManagerAdd?: string;
  devotionManagerNoDevotions?: string;
  devotionManagerNoDevotionsSub?: string;
  devotionManagerPublished?: string;
  devotionManagerDeleteTitle?: string;
  devotionManagerDeleteMessage?: string;
  devotionManagerDeleteBtn?: string;
  devotionManagerCancelBtn?: string;
  devotionManagerDeletedToast?: string;
  devotionManagerDeleteFailed?: string;
  devotionManagerNA?: string;

  // Add Devotion (form screen)
  addDevotionTitle?: string;
  addDevotionEditTitle?: string;
  addDevotionTitleLabel?: string;
  addDevotionTitlePlaceholder?: string;
  addDevotionContentLabel?: string;
  addDevotionContentPlaceholder?: string;
  addDevotionOptionalBibleRef?: string;
  addDevotionSelectBook?: string;
  addDevotionChapterLabel?: string;
  addDevotionVerseLabel?: string;
  addDevotionSelectVersion?: string;
  addDevotionVersePreview?: string;
  addDevotionSearchBooks?: string;
  addDevotionSave?: string;
  addDevotionUpdate?: string;
  addDevotionModalSelectBook?: string;
  addDevotionModalSelectVersion?: string;
  addDevotionFillRequired?: string;
  addDevotionAdded?: string;
  addDevotionUpdated?: string;
  addDevotionFailedAdd?: string;
  addDevotionFailedUpdate?: string;
};

// Journal screen translations
export type JournalTranslations = {
  // List screen
  myJournal?: string;
  totalEntries?: string;
  favoritesCount?: string;
  entriesThisWeek?: string;
  entryLabel?: string;
  entriesLabel?: string;
  thisWeekLabel?: string;
  noEntries?: string;
  noEntriesSubtitle?: string;
  searchEntriesPlaceholder?: string;
  createFirstEntry?: string;
  deleteEntry?: string;
  deleteConfirmTitle?: string;
  deleteConfirmMessage?: string;
  deleteConfirmMessageWithTitle?: string;
  deleteAction?: string;
  justNow?: string;
  minutesAgo?: string;
  hoursAgo?: string;
  daysAgo?: string;
  yesterdayLabel?: string;

  // Entry form
  newEntry?: string;
  editEntry?: string;
  titleOptional?: string;
  titlePlaceholder?: string;
  contentRequired?: string;
  contentPlaceholder?: string;
  categoryLabel?: string;
  moodLabel?: string;
  scriptureRefLabel?: string;
  bookPlaceholder?: string;
  chapterPlaceholder?: string;
  versePlaceholder?: string;
  gratitudeLabel?: string;
  gratitudePlaceholder?: string;
  learningsLabel?: string;
  learningsPlaceholder?: string;
  applicationLabel?: string;
  applicationPlaceholder?: string;
  prayerRequestsLabel?: string;
  prayerRequestsPlaceholder?: string;
  entrySaved?: string;
  entryUpdated?: string;
  contentEmptyError?: string;
  failedToSave?: string;
  failedToLoadEntry?: string;
  failedToUpdateFavorite?: string;
  failedToDeleteEntry?: string;
  entryDeleted?: string;

  // Detail screen
  loadingLabel?: string;
  feelingLabel?: string;
  journalEntrySection?: string;

  // Category labels
  categoryAll?: string;
  categoryGeneral?: string;
  categoryStudy?: string;
  categoryPrayer?: string;
  categoryGratitude?: string;
  categoryReflection?: string;
  categoryApplication?: string;
  categoryExplanation?: string;

  // Admin Templates
  journalTemplates?: string;
  searchTemplatesPlaceholder?: string;
  noTemplatesFound?: string;
  noTemplatesSubtitle?: string;
  addTemplate?: string;
  templateNamePlaceholder?: string;
  templateDescriptionPlaceholder?: string;
  templateCategoryLabel?: string;
  defaultTemplateLabel?: string;
  promptsLabel?: string;
  addPrompt?: string;
  createTemplate?: string;
  savingLabel?: string;
  templateCreated?: string;
  templateDeleted?: string;
  nameAndPromptRequired?: string;
  defaultBadge?: string;
  promptsCount?: string;
  morePrompts?: string;

  // Admin Prompts
  journalPrompts?: string;
  searchPromptsPlaceholder?: string;
  noPromptsFound?: string;
  editPrompt?: string;
  newPrompt?: string;
  enterPromptPlaceholder?: string;
  promptDescriptionPlaceholder?: string;
  orderLabel?: string;
  activeLabel?: string;
  selectBookPlaceholder?: string;
  chapterFieldLabel?: string;
  verseOptionalLabel?: string;
  savePrompt?: string;
  promptUpdated?: string;
  promptCreated?: string;
  promptDeleted?: string;
  promptRequired?: string;
  backLabel?: string;
};

export type ScreenProps = {
  login: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    button: string;
    google: string;
  };
  createAccount: {
    text: string;
  };
};

// Translator is callable and also has the nested translation properties
export type Translator = ((key: string) => string) & Translations;

export interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  // callable translator that also exposes nested keys (e.g. t.login.title)
  t: Translator;
  // full translation object for dot‑notation property access
  translations: Translations & { profile?: ProfileTranslations; editProfile?: EditProfileTranslations; extendedProfile?: ExtendedProfileTranslations; bottomTab?: BottomTabTranslations; bible?: BibleTranslations; journal?: JournalTranslations; admin?: AdminTranslations; readingPlan?: ReadingPlanTranslations; onboarding?: OnboardingTranslations };
}
