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
  translations: Translations & { profile?: ProfileTranslations };
}
