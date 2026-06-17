import React, { useContext, useEffect, useState } from 'react';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import useLogin from './hooks/uselogin';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import ActionModal from '../../reusable/ActionModal';
import { getColors } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { route } from '../../component/navigations/routes';
import { AppContext } from '../../common/AppContext';
import KeyboardAwareness from '../../reusable/KeyboardAwareness';
import LanguagePickerModal, { FLAGS, NATIVE_NAMES } from '../../component/LanguagePickerModal';
// helpers
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import GoogleIcon from '../../assets/icons/google-icon.svg'; // ← NEW
const { width } = Dimensions.get('window');

const LOGO_SIZE = Math.min(width * 0.55, 260);

// ─────────────────────────────────────────────────────────────────────────────

const Login = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    setErrors,
    loading,
    googleLoading,
    passwordVisible,
    setPasswordVisible,
    handleLogin,
    handleGoogleSignIn,
  } = useLogin();

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [modal, setModal] = useState<any>({
    status: false,
    title: '',
    message: '',
    severity: 'info',
  });

  // ⚠️  Update this path to your actual logo asset
  const logo = require('../../assets/logos/exegesis_bg_rm.png');
  const book = require('../../assets/logos/lordsbook.png');

  const appContext = useContext(AppContext);
  const navigation = useNavigation<any>();

  // ── Entrance animations ────────────────────────────────────────────────────
  const logoFade = React.useRef(new Animated.Value(0)).current;
  const logoSlide = React.useRef(new Animated.Value(-20)).current;
  const formFade = React.useRef(new Animated.Value(0)).current;
  const formSlide = React.useRef(new Animated.Value(24)).current;

  if (!appContext) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { isDark, setUserInfo, userInfo } = appContext;

  // useLogin provides Google sign-in and normal login handlers

  const { translations, language } = useLanguage();
  const [showLangModal, setShowLangModal] = useState(false);
  const C = getColors(isDark);
  const isRtl = isRtlLanguage(language);

  React.useEffect(() => {
    if (userInfo) navigation.navigate(route.bible);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoSlide, {
          toValue: 0,
          friction: 9,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formFade, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(formSlide, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // validation and login logic handled by useLogin hook

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { backgroundColor: C.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      <TouchableOpacity
        style={[
          s.langFloatingBtn,
          { borderColor: C.border, backgroundColor: C.surface },
          isRtl && { right: undefined, left: 18 },
        ]}
        onPress={() => setShowLangModal(true)}
      >
        <Text style={{ fontSize: 18, marginRight: isRtl ? 0 : 6, marginLeft: isRtl ? 6 : 0 }}>{FLAGS[language]}</Text>
        <Text style={{ color: C.text, fontWeight: '600' }}>
          {NATIVE_NAMES[language]}
        </Text>
      </TouchableOpacity>

      <KeyboardAwareness>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false} // iOS fix
          overScrollMode="never" // Android fix
        >
          {/* ══════════════════════════════════════
              LOGO + BRAND
          ══════════════════════════════════════ */}
          <Animated.View
            style={[
              s.logoSection,
              { opacity: logoFade, transform: [{ translateY: logoSlide }] },
            ]}
          >
            <Image source={logo} style={s.logoImg} resizeMode="contain" />
          </Animated.View>

          {/* ══════════════════════════════════════
              FORM
          ══════════════════════════════════════ */}
          <Animated.View
            style={[
              s.formSection,
              { opacity: formFade, transform: [{ translateY: formSlide }] },
            ]}
          >
            {/* "Log In" heading (language selector is floating) */}
            <View style={[s.headingRow, { justifyContent: 'center' }]}>
              <Text
                style={[s.loginHeading, { color: C.text, textAlign: 'center' }]}
              >
                {translations.login.title}
              </Text>
            </View>

            {/* language button moved above the logo */}

            {/* Language picker bottom sheet — shows all 22 languages */}
            <LanguagePickerModal
              visible={showLangModal}
              onRequestClose={() => setShowLangModal(false)}
            />

            <Text
              style={[
                s.continueHeading,
                { color: C.text, textAlign: isRtl ? 'right' : 'center' },
              ]}
            >
              {translations.login.subtitle}
            </Text>

            {/* ── Email input ─────────────────────────────────────────────── */}
            <View style={s.fieldWrap}>
              <View
                style={[s.inputRow, isRtl && { flexDirection: 'row-reverse' }]}
              >
                <View
                  style={[
                    s.inputIconBox,
                    {
                      borderColor: errors.email ? C.error : C.border,
                      backgroundColor: C.cardBackground,
                      shadowColor: C.shadowColor,
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    },
                    isRtl && {
                      borderLeftWidth: 0,
                      borderRightWidth: 1,
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      borderTopRightRadius: 12,
                      borderBottomRightRadius: 12,
                    },
                  ]}
                >
                  <Mail size={18} color={C.muted} />
                </View>
                <View
                  style={[
                    s.inputBox,
                    {
                      borderColor: errors.email ? C.error : C.border,
                      backgroundColor: C.cardBackground,
                      shadowColor: C.shadowColor,
                      shadowOpacity: 0.06,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    },
                    isRtl && {
                      borderTopLeftRadius: 12,
                      borderBottomLeftRadius: 12,
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      paddingRight: 14,
                      paddingLeft: 44,
                    },
                  ]}
                >
                  <Animated.Text
                    style={[
                      s.floatingLabel,
                      {
                        color: emailFocused || email ? C.primary : C.muted,
                        top: emailFocused || email ? 6 : 16,
                        fontSize: emailFocused || email ? 12 : 15,
                        left: isRtl ? undefined : 14,
                        right: isRtl ? 14 : undefined,
                      },
                    ]}
                  >
                    {translations.login.email}
                  </Animated.Text>

                  <TextInput
                    style={[
                      s.textInput,
                      {
                        color: C.text,
                        paddingTop: 18,
                        textAlign: isRtl ? 'right' : 'left',
                        writingDirection: isRtl ? 'rtl' : 'ltr',
                      },
                    ]}
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      if (errors.email)
                        setErrors(p => ({ ...p, email: undefined }));
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>

              {errors.email && (
                <Text style={[s.errorText, { color: C.error, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }]}>
                  {errors.email}
                </Text>
              )}
            </View>

            {/* ── Password input ──────────────────────────────────────────── */}
            <View style={s.fieldWrap}>
              <View
                style={[s.inputRow, isRtl && { flexDirection: 'row-reverse' }]}
              >
                <View
                  style={[
                    s.inputIconBox,
                    {
                      borderColor: errors.password ? C.error : C.border,
                      backgroundColor: C.cardBackground,
                      shadowColor: C.shadowColor,
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    },
                    isRtl && {
                      borderLeftWidth: 0,
                      borderRightWidth: 1,
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      borderTopRightRadius: 12,
                      borderBottomRightRadius: 12,
                    },
                  ]}
                >
                  <Lock size={18} color={C.muted} />
                </View>
                <View
                  style={[
                    s.inputBox,
                    {
                      borderColor: errors.password ? C.error : C.border,
                      backgroundColor: C.cardBackground,
                      shadowColor: C.shadowColor,
                      shadowOpacity: 0.06,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    },
                    isRtl && {
                      borderTopLeftRadius: 12,
                      borderBottomLeftRadius: 12,
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      paddingRight: 14,
                      paddingLeft: 44,
                    },
                  ]}
                >
                  <Animated.Text
                    style={[
                      s.floatingLabel,
                      {
                        color:
                          passwordFocused || password ? C.primary : C.muted,
                        top: passwordFocused || password ? 6 : 16,
                        fontSize: passwordFocused || password ? 12 : 15,
                        left: isRtl ? undefined : 14,
                        right: isRtl ? 14 : undefined,
                      },
                    ]}
                  >
                    {translations.login.password}
                  </Animated.Text>

                  <TextInput
                    style={[
                      s.textInput,
                      {
                        color: C.text,
                        paddingTop: 18,
                        textAlign: isRtl ? 'right' : 'left',
                        writingDirection: isRtl ? 'rtl' : 'ltr',
                      },
                    ]}
                    value={password}
                    onChangeText={text => {
                      setPassword(text);
                      if (errors.password)
                        setErrors(p => ({ ...p, password: undefined }));
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!passwordVisible}
                    editable={!loading}
                  />

                  {/* Eye Icon */}
                  <TouchableOpacity
                    style={[s.eyeIcon, isRtl && { right: undefined, left: 10 }]}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                    activeOpacity={0.7}
                  >
                    {passwordVisible ? (
                      <EyeOff size={20} color={C.muted} />
                    ) : (
                      <Eye size={20} color={C.muted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {errors.password && (
                <Text style={[s.errorText, { color: C.error, marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }]}>
                  {errors.password}
                </Text>
              )}
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={[s.forgotWrap, { alignSelf: isRtl ? 'flex-start' : 'flex-end' }]}
              onPress={() => navigation.navigate(route.forgotPassword)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  s.forgotText,
                  { color: C.primary, textDecorationLine: 'underline' },
                ]}
              >
                {translations.forgotPassword?.title || 'Forgot password?'}
              </Text>
            </TouchableOpacity>

            {/* ── SIGN IN button ──────────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                s.signInBtn,
                {
                  backgroundColor: C.primary,
                  shadowColor: C.shadowColor,
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                },
                loading && s.btnDisabled,
              ]}
              onPress={handleLogin}
              activeOpacity={0.82}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Text style={[s.signInText, { color: C.white }]}>
                  {translations.login.button}
                </Text>
              )}
            </TouchableOpacity>

            {/* Large Create Account button */}
            <TouchableOpacity
              style={[
                s.createAccountBtn,
                { borderColor: C.primary, backgroundColor: C.accent + '10' },
              ]}
              onPress={() => navigation.navigate(route.register)}
              activeOpacity={0.82}
            >
              <Text style={[s.createAccountText, { color: C.primary }]}>
                {translations.createAccount.text}
              </Text>
            </TouchableOpacity>

            {/* ── Divider ──────────────────────────────────────────────────────── */}
            <View style={[s.dividerRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <View style={[s.dividerLine, { backgroundColor: C.border }]} />
              <Text
                style={[s.dividerText, { color: C.muted, textAlign: 'center' }]}
              >
                {translations.login.continuewith}
              </Text>
              <View style={[s.dividerLine, { backgroundColor: C.border }]} />
            </View>

            {/* ── Social / Alt Login row ─────────────────────────────────── */}
            <View style={[s.socialRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[
                  s.socialBtn,
                  { borderColor: C.border, backgroundColor: C.surface },
                  googleLoading && { opacity: 0.7 },
                ]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.82}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <>
                    <View style={s.socialIconWrap}>
                      <GoogleIcon width={22} height={22} />
                    </View>
                    <Text style={[s.socialBtnText, { color: C.text }]} numberOfLines={1}>
                      {translations.login.google}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.socialBtn,
                  { borderColor: C.border, backgroundColor: C.surface },
                ]}
                onPress={() => navigation.navigate(route.bible)}
                activeOpacity={0.82}
              >
                <View style={s.socialIconWrap}>
                  <Image source={book} style={s.socialIconImg} resizeMode="contain" />
                </View>
                <Text style={[s.socialBtnText, { color: C.text }]} numberOfLines={1}>
                  {translations.login.lordsbook}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Terms and Conditions (moved into login container) */}
            <Text
              style={[
                s.termsText,
                { color: C.muted, textAlign: isRtl ? 'right' : 'center' },
              ]}
            >
              {translations.login.terms.byContinuing}{' '}
              <Text style={[s.termsLink, { color: C.primaryDark }]}>
                {translations.login.terms.termsOfService}
              </Text>{' '}
              {translations.login.terms.and}{' '}
              <Text style={[s.termsLink, { color: C.primaryDark }]}>
                {translations.login.terms.privacyPolicy}
              </Text>
            </Text>

            {/* Coming soon (moved into login container) */}
            <Text
              style={[
                s.comingSoon,
                { color: C.muted, textAlign: isRtl ? 'right' : 'center' },
              ]}
            >
              {translations.login.footer.fullVersion}
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAwareness>

      <ActionModal
        visible={modal.status}
        title={modal.title}
        message={modal.message}
        severity={modal.severity}
        onConfirm={() => setModal((m: any) => ({ ...m, status: false }))}
      />
    </View>
  );
};

export default Login;

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? 60 : 35,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  // LOGO SECTION
  logoSection: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },

  logoImg: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },

  // FORM SECTION
  formSection: {
    width: '92%',
    maxWidth: 420,
    marginTop: -5,
  },

  loginHeading: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  continueHeading: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  langWrap: {
    position: 'relative',
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 8,
  },
  langList: {
    position: 'absolute',
    right: 0,
    top: 40,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 30,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  langFloatingBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 34 : 56,
    right: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 100,
  },

  // INPUTS
  fieldWrap: {
    width: '100%',
    marginBottom: 16,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },

  inputIconBox: {
    width: 48,
    height: 56,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  floatLabel: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 5,
    marginLeft: 2,
  },

  floatingLabel: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
  },

  dotRow: {
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 5,
    marginLeft: 2,
  },

  inputBox: {
    borderWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    height: 56,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingRight: 44,
    position: 'relative',
  },

  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 20,
    zIndex: 10,
    padding: 4,
  },

  inputIcon: {
    position: 'absolute',
    left: 14,
    top: 20,
    zIndex: 5,
  },

  textInput: {
    fontSize: 15,
    height: '100%',
    paddingVertical: 0,
    zIndex: 2,
  },

  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },

  // BUTTON
  signInBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },

  btnDisabled: {
    opacity: 0.6,
  },

  signInText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // LINKS
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 14,
    marginVertical: 10,
    paddingHorizontal: 4,
  },

  forgotText: {
    fontSize: 14,
    fontWeight: '500',
  },

  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },

  signUpPrompt: {
    fontSize: 13,
  },

  signUpLink: {
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  comingSoon: {
    fontSize: 11,
    textAlign: 'center',
  },

  // DIVIDER
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    marginHorizontal: 14,
    fontWeight: '500',
  },

  // SOCIAL / ALT LOGIN BUTTONS (side by side)
  socialRow: {
    gap: 10,
    marginBottom: 16,
  },
  socialBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  socialIconWrap: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  socialIconImg: {
    width: 18,
    height: 18,
  },
  socialBtnText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },

  // TERMS
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
  },
  termsLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // CREATE ACCOUNT BUTTON
  createAccountBtn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  createAccountText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
