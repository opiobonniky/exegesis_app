export type Language = 'en' | 'es' | 'fr' | 'ar';

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
  translations: Translations & { profile?: ProfileTranslations; editProfile?: EditProfileTranslations; extendedProfile?: ExtendedProfileTranslations; bottomTab?: BottomTabTranslations };
}
