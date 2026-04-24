import React, { useContext, useState } from 'react';
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
import { sendPostRequest, testConnection } from '../../services/api';
import { AppContext, UserInfo } from '../../common/AppContext';
import KeyboardAwareness from '../../reusable/KeyboardAwareness';
import { showToast } from '../../helpers/Toash.helper';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width } = Dimensions.get('window');

const LOGO_SIZE = Math.min(width * 0.55, 260);

// ─────────────────────────────────────────────────────────────────────────────

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [loading, setLoading] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [modal, setModal] = useState<any>({
    status: false,
    title: '',
    message: '',
    severity: 'info',
  });

  // ⚠️  Update this path to your actual logo asset
  const logo = require('../../assets/logos/exegesis-logo.png');

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
  const C = getColors(isDark);

  React.useEffect(() => {
    if (userInfo) navigation.navigate(route.bible);
    testConnection();

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

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: { email?: string; password?: string } = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email))
      e.email = 'Please enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6)
      e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await sendPostRequest('auth', 'login', {
        username: email.toLowerCase().trim(),
        password,
      });
      const { returnCode, returnMessage, returnData } = response;

      if (returnCode === 200) {
        const info: UserInfo = {
          token: returnData.token,
          tokenType: returnData.tokenType,
          username: returnData.username,
          email: returnData.email,
          firstName: returnData.firstName,
          lastName: returnData.lastName,
          profilePhotoUrl: returnData.profilePhotoUrl,
        };
        await setUserInfo(info);
        navigation.navigate(route.homeLogin);
      } else if (returnCode === 405) {
        showToast('warning', returnMessage);
        setTimeout(() => {
          setModal((m: any) => ({ ...m, status: false }));
          navigation.navigate(route.register, {
            emailVerify: email,
            tab: 'verify',
          });
        }, 4000);
      } else {
        showToast('error', returnMessage || 'Unknown error');
      }
    } catch (error: any) {
      const returnCode = error?.returnCode;
      const returnMessage = error?.message || 'An unexpected error occurred';

      if (returnCode === 405) {
        showToast('warning', returnMessage);
        setTimeout(() => {
          setModal((m: any) => ({ ...m, status: false }));
          navigation.navigate(route.register, {
            emailVerify: email,
            tab: 'verify',
          });
        }, 4000);
      } else if (returnCode === 401) {
        showToast('error', returnMessage);
      } else {
        showToast('error', returnMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <View
      style={[s.root, { backgroundColor: isDark ? C.background : '#FFFFFF' }]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

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
            {/* "Log In" heading */}
            <Text style={[s.loginHeading, { color: C.text }]}>
              Welcome Back!
            </Text>

            <Text style={[s.continueHeading, { color: C.text }]}>
              Sign in to continue your journey.
            </Text>

            {/* ── Email input ─────────────────────────────────────────────── */}
            <View style={s.fieldWrap}>
              <View style={s.inputRow}>
                <View
                  style={[
                    s.inputIconBox,
                    {
                      borderColor: errors.email ? C.error : C.border,
                      backgroundColor: isDark ? C.surface : '#F5F5F5',
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
                      backgroundColor: isDark ? C.surface : '#F5F5F5',
                    },
                  ]}
                >
                  {/* Floating Label */}
                  <Animated.Text
                    style={[
                      s.floatingLabel,
                      {
                        color: emailFocused || email ? C.primaryDark : C.muted,
                        top: emailFocused || email ? 6 : 16,
                        fontSize: emailFocused || email ? 12 : 15,
                      },
                    ]}
                  >
                    Email Address
                  </Animated.Text>

                  <TextInput
                    style={[s.textInput, { color: C.text, paddingTop: 18 }]}
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
                <Text style={[s.errorText, { color: C.error }]}>
                  {errors.email}
                </Text>
              )}
            </View>

            {/* ── Password input ──────────────────────────────────────────── */}
            <View style={s.fieldWrap}>
              <View style={s.inputRow}>
                <View
                  style={[
                    s.inputIconBox,
                    {
                      borderColor: errors.password ? C.error : C.border,
                      backgroundColor: isDark ? C.surface : '#F5F5F5',
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
                      backgroundColor: isDark ? C.surface : '#F5F5F5',
                    },
                  ]}
                >
                  {/* Floating Label */}
                  <Animated.Text
                    style={[
                      s.floatingLabel,
                      {
                        color:
                          passwordFocused || password ? C.primaryDark : C.muted,
                        top: passwordFocused || password ? 6 : 16,
                        fontSize: passwordFocused || password ? 12 : 15,
                      },
                    ]}
                  >
                    Password
                  </Animated.Text>

                  <TextInput
                    style={[
                      s.textInput,
                      {
                        color: C.text,
                        paddingTop: 18,
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
                    style={s.eyeIcon}
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
                <Text style={[s.errorText, { color: C.error }]}>
                  {errors.password}
                </Text>
              )}
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={s.forgotWrap}
              onPress={() => navigation.navigate(route.forgotPassword)}
              activeOpacity={0.7}
            >
              <Text style={[s.forgotText, { color: C.text }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* ── SIGN IN button ──────────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                s.signInBtn,
                { backgroundColor: C.primaryDark },
                loading && s.btnDisabled,
              ]}
              onPress={handleLogin}
              activeOpacity={0.82}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={s.signInText}>SIGN IN</Text>
              )}
            </TouchableOpacity>

            {/* Large Create Account button */}
            <TouchableOpacity
              style={[s.createAccountBtn, { borderColor: C.border }]}
              onPress={() => navigation.navigate(route.register)}
              activeOpacity={0.82}
            >
              <Text style={[s.createAccountText, { color: C.text }]}>
                Create New Account
              </Text>
            </TouchableOpacity>

            {/* ── Divider ──────────────────────────────────────────────────────── */}
            <View style={s.dividerRow}>
              <View style={[s.dividerLine, { backgroundColor: C.border }]} />
              <Text style={[s.dividerText, { color: C.muted }]}>
                or continue with
              </Text>
              <View style={[s.dividerLine, { backgroundColor: C.border }]} />
            </View>

            {/* ── Google Login button ────────────────────────────────────────── */}
            <TouchableOpacity
              style={[s.googleBtn, { borderColor: C.border }]}
              onPress={() => {}}
              activeOpacity={0.82}
            >
              <Icon name="google" size={20} color="#DB4437" />
              <Text style={[s.googleText, { color: C.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Terms and Conditions */}
            <Text style={[s.termsText, { color: C.muted }]}>
              By continuing, you agree to our{' '}
              <Text style={[s.termsLink, { color: C.primaryDark }]}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={[s.termsLink, { color: C.primaryDark }]}>
                Privacy Policy
              </Text>
            </Text>

            {/* Coming soon */}
            <Text style={[s.comingSoon, { color: C.muted }]}>
              Full version arriving with public launch.
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
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1.5,
  },
  continueHeading: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1.5,
  },
  // INPUTS
  fieldWrap: {
    width: '100%',
    marginBottom: 14,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },

  inputIconBox: {
    width: 48,
    height: 56,
    borderRightWidth: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  floatLabel: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 5,
    marginLeft: 2,
    color: '#888',
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
    color: '#888',
  },

  inputBox: {
    borderWidth: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    height: 56,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingRight: 44,
    position: 'relative',

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
    color: '#222',
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
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },

  btnDisabled: {
    opacity: 0.6,
  },

  signInText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // LINKS
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 14,
    marginVertical: 10,
    paddingHorizontal: 4,
  },

  forgotText: {
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 12,
    marginHorizontal: 12,
    fontWeight: '500',
  },

  // GOOGLE BUTTON
  googleBtn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  googleText: {
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: '#FFFFFF',
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
