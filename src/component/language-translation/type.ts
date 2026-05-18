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
  };
  // footer and terms moved into login container because they are screen-specific
  register: {
    title: string;
    username: string;
    email: string;
    password: string;
    button: string;
  };
  welcome: {
    title: string;
    message: string;
  };
  [k: string]: any;
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
  translations: Translations;
}
