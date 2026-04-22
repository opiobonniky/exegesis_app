import React, { useContext, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppContext } from '../../common/AppContext';
import { checkInternetConnection } from '../../utilits/checkInternet';
import { sendPostRequest } from '../../services/api';
import InputField from '../../reusable/InputField';
import DatePickerInput from '../../reusable/DatePickerInput';
import KeyboardAwareness from '../../reusable/KeyboardAwareness';
import {
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  getColors,
} from '../../constants/theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { route } from '../../component/navigations/routes';
import {
  ChevronLeft,
  Lock,
  Mail,
  PhoneCall,
  User,
  Check,
  X,
  ArrowRight,
  RefreshCw,
  MailOpen,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';

const { width } = Dimensions.get('window');

type Step = 'details' | 'verify';

const STEPS: Step[] = ['details', 'verify'];

interface PasswordReq {
  label: string;
  met: boolean;
  test: (p: string) => boolean;
}

export default function Register() {
  const { isDark }: any = useContext(AppContext);
  const navigation = useNavigation<any>();
  const routes = useRoute();
  const { emailVerify, tab }: any = routes.params || {};

  const C = getColors(isDark);

  const [currentStep, setCurrentStep] = useState<Step>(
    tab === 'verify' ? 'verify' : 'details',
  );
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(emailVerify || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [genderDropdown, setGenderDropdown] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStrength, setPwdStrength] = useState({
    score: 0,
    text: '',
    color: '',
  });
  const [pwdReqs, setPwdReqs] = useState<PasswordReq[]>([
    { label: 'At least 8 characters', met: false, test: p => p.length >= 8 },
    { label: 'One lowercase letter', met: false, test: p => /[a-z]/.test(p) },
    { label: 'One uppercase letter', met: false, test: p => /[A-Z]/.test(p) },
    { label: 'One number', met: false, test: p => /[0-9]/.test(p) },
    {
      label: 'One special character',
      met: false,
      test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
    },
  ]);

  const [verificationCode, setVerificationCode] = useState([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const codeRefs = useRef<(TextInput | null)[]>([]);

  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [resendCount, setResendCount] = useState(0);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();
    if (currentStep === 'verify' && !canResend && resendTimer === 0) {
      startResendTimer();
    }
  }, [currentStep]);

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const isComplete = (step: Step) =>
    STEPS.indexOf(step) < STEPS.indexOf(currentStep);

  const checkPwdStrength = (pwd: string) => {
    const reqs = pwdReqs.map(r => ({ ...r, met: r.test(pwd) }));
    setPwdReqs(reqs);
    const score = reqs.filter(r => r.met).length;

    if (!pwd.length) {
      setPwdStrength({ score: 0, text: '', color: '' });
      return;
    }

    if (score === 5)
      setPwdStrength({ score, text: 'Strong', color: C.success });
    else if (score >= 3)
      setPwdStrength({ score, text: 'Medium', color: C.warning });
    else setPwdStrength({ score, text: 'Weak', color: C.error });
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const startResendTimer = () => {
    const getDuration = (count: number) => {
      if (count === 0) return 30;
      if (count === 1) return 60;
      return 180;
    };
    const duration = getDuration(resendCount);
    setResendTimer(duration);
    setCanResend(false);
    setResendCount(prev => prev + 1);
  };

  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) text = text[0];
    const next = [...verificationCode];
    next[index] = text;
    setVerificationCode(next);
    if (text && index < 5) codeRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyPress = (e: any, index: number) => {
    if (
      e.nativeEvent.key === 'Backspace' &&
      !verificationCode[index] &&
      index > 0
    )
      codeRefs.current[index - 1]?.focus();
  };

  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = 'Username is required';
    else if (username.length < 3)
      e.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username))
      e.username = 'Only letters, numbers, underscores';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Valid email required';
    if (!firstName.trim()) e.firstName = 'First name required';
    if (!lastName.trim()) e.lastName = 'Last name required';
    if (!phoneNumber || !/^[0-9]{10,15}$/.test(phoneNumber))
      e.phoneNumber = 'Phone must be 10-15 digits';
    if (!password) {
      e.password = 'Password is required';
    } else {
      const unmet = pwdReqs.filter(r => !r.met);
      if (unmet.length > 0) {
        e.password = `Missing: ${unmet[0].label}`;
      }
    }
    if (!confirmPassword) {
      e.confirmPassword = 'Please confirm password';
    } else if (password !== confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validateDetails()) return;
    if (!(await checkInternetConnection())) {
      showToast('error', 'No internet connection. Please try again.');
      return;
    }

    try {
      setLoading(true);
      const res = await sendPostRequest('auth', 'register', {
        username: username.trim().toLowerCase(),
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber,
        dateOfBirth: dateOfBirth || '2000-01-01',
        gender,
        userRole: 2,
      });

      const { returnCode, returnMessage } = res;

      if (returnCode === 200) {
        showToast(
          'success',
          returnMessage || 'Check your email for verification code.',
        );
        setTimeout(() => goToStep('verify'), 1500);
      } else if (returnCode === 401) {
        showToast('warning', returnMessage);
      } else {
        showToast(
          'error',
          returnMessage || 'Registration failed. Please try again.',
        );
      }
    } catch (e: any) {
      const returnCode = e?.returnCode;
      const returnMessage = e?.message || 'Please try again later';
      showToast(returnCode === 401 ? 'warning' : 'error', returnMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      showToast('warning', 'Please enter the 6-digit code');
      return;
    }
    try {
      setLoading(true);
      const res = await sendPostRequest('auth', 'verify-account', {
        email,
        code,
      });
      const { returnCode, returnMessage } = res;

      if (returnCode === 200) {
        showToast(
          'success',
          returnMessage || 'Email verified! Redirecting to login...',
        );
        setTimeout(() => navigation.navigate(route.login), 1500);
      } else {
        showToast('error', returnMessage || 'Invalid code');
      }
    } catch (e: any) {
      showToast('error', e.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    try {
      setLoading(true);
      const res = await sendPostRequest('auth', 'resend-verification', {
        email,
      });
      if (res.returnCode === 200) {
        showToast('success', res.returnMessage || 'Code resent!');
        startResendTimer();
      } else {
        showToast('error', res.returnMessage || 'Failed to resend code');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const genders = ['Male', 'Female', 'Not Specified'];

  return (
    <View
      style={[s.root, { backgroundColor: isDark ? C.background : '#F8FAFC' }]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      <KeyboardAwareness>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              s.container,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {currentStep === 'details' && (
              <>
                <View style={s.headerSection}>
                  <TouchableOpacity
                    style={[s.backButton, { backgroundColor: C.surface }]}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                  >
                    <ChevronLeft size={22} color={C.text} />
                  </TouchableOpacity>
                </View>

                <View style={s.titleSection}>
                  <Text style={[s.title, { color: C.text }]}>
                    Create Account
                  </Text>
                  <Text style={[s.subtitle, { color: C.muted }]}>
                    Fill in your details to get started
                  </Text>
                </View>

                <View
                  style={[s.formCard, { backgroundColor: C.cardBackground }]}
                >
                  <View style={s.form}>
                    <View style={s.nameRow}>
                      <View style={s.halfField}>
                        <Text style={[s.fieldLabel, { color: C.muted }]}>
                          FIRST NAME
                        </Text>
                        <InputField
                          placeholder="First"
                          value={firstName}
                          onChangeText={t => {
                            setFirstName(t);
                            if (errors.firstName)
                              setErrors(p => ({ ...p, firstName: '' }));
                          }}
                          error={errors.firstName}
                          leftIcon={<User size={18} color={C.muted} />}
                        />
                      </View>
                      <View style={s.halfField}>
                        <Text style={[s.fieldLabel, { color: C.muted }]}>
                          LAST NAME
                        </Text>
                        <InputField
                          placeholder="Last"
                          value={lastName}
                          onChangeText={t => {
                            setLastName(t);
                            if (errors.lastName)
                              setErrors(p => ({ ...p, lastName: '' }));
                          }}
                          error={errors.lastName}
                          leftIcon={<User size={18} color={C.muted} />}
                        />
                      </View>
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        EMAIL
                      </Text>
                      <InputField
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={t => {
                          setEmail(t);
                          if (errors.email)
                            setErrors(p => ({ ...p, email: '' }));
                        }}
                        error={errors.email}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        leftIcon={<Mail size={18} color={C.muted} />}
                      />
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        USERNAME
                      </Text>
                      <InputField
                        placeholder="Choose username"
                        value={username}
                        onChangeText={t => {
                          setUsername(t.replace(/\s/g, ''));
                          if (errors.username)
                            setErrors(p => ({ ...p, username: '' }));
                        }}
                        error={errors.username}
                        autoCapitalize="none"
                        leftIcon={<User size={18} color={C.muted} />}
                      />
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        PHONE
                      </Text>
                      <InputField
                        placeholder="+1 234 567 8900"
                        value={phoneNumber}
                        onChangeText={t => {
                          setPhoneNumber(t);
                          if (errors.phoneNumber)
                            setErrors(p => ({ ...p, phoneNumber: '' }));
                        }}
                        error={errors.phoneNumber}
                        keyboardType="phone-pad"
                        leftIcon={<PhoneCall size={18} color={C.muted} />}
                      />
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        GENDER
                      </Text>
                      <TouchableOpacity
                        onPress={() => setGenderDropdown(!genderDropdown)}
                        style={[
                          s.genderSelector,
                          { borderColor: C.border, backgroundColor: C.surface },
                        ]}
                      >
                        <Text style={[s.genderText, { color: C.text }]}>
                          {gender}
                        </Text>
                      </TouchableOpacity>
                      {genderDropdown && (
                        <View
                          style={[
                            s.genderDropdown,
                            {
                              backgroundColor: C.surface,
                              borderColor: C.border,
                            },
                          ]}
                        >
                          {genders.map(g => (
                            <TouchableOpacity
                              key={g}
                              onPress={() => {
                                setGender(g);
                                setGenderDropdown(false);
                              }}
                              style={[
                                s.genderOption,
                                { borderBottomColor: C.border },
                              ]}
                            >
                              <Text
                                style={[s.genderOptionText, { color: C.text }]}
                              >
                                {g}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        DATE OF BIRTH (Optional)
                      </Text>
                      <DatePickerInput
                        label=""
                        placeholder="Select date"
                        value={dateOfBirth}
                        onChangeDate={setDateOfBirth}
                      />
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        PASSWORD
                      </Text>
                      <InputField
                        placeholder="Create password"
                        value={password}
                        onChangeText={t => {
                          checkPwdStrength(t);
                          setPassword(t);
                          if (errors.password)
                            setErrors(p => ({ ...p, password: '' }));
                        }}
                        error={errors.password}
                        secure
                        leftIcon={<Lock size={18} color={C.muted} />}
                      />
                      {password.length > 0 && (
                        <View style={s.strengthRow}>
                          <View style={s.strengthBars}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <View
                                key={n}
                                style={[
                                  s.strengthBar,
                                  {
                                    backgroundColor:
                                      n <= pwdStrength.score
                                        ? pwdStrength.color
                                        : C.border,
                                  },
                                ]}
                              />
                            ))}
                          </View>
                          {pwdStrength.text && (
                            <Text
                              style={[
                                s.strengthLabel,
                                { color: pwdStrength.color },
                              ]}
                            >
                              {pwdStrength.text}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        CONFIRM PASSWORD
                      </Text>
                      <InputField
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChangeText={t => {
                          setConfirmPassword(t);
                          if (errors.confirmPassword)
                            setErrors(p => ({ ...p, confirmPassword: '' }));
                        }}
                        error={errors.confirmPassword}
                        secure
                        leftIcon={<Lock size={18} color={C.muted} />}
                      />
                      {confirmPassword.length > 0 && (
                        <View style={s.matchRow}>
                          {password === confirmPassword ? (
                            <>
                              <Check size={14} color={C.success} />
                              <Text style={[s.matchText, { color: C.success }]}>
                                Passwords match
                              </Text>
                            </>
                          ) : (
                            <>
                              <X size={14} color={C.error} />
                              <Text style={[s.matchText, { color: C.error }]}>
                                Passwords do not match
                              </Text>
                            </>
                          )}
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[
                        s.submitButton,
                        { backgroundColor: C.primary },
                        loading && s.buttonDisabled,
                      ]}
                      onPress={handleRegister}
                      activeOpacity={0.8}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={s.submitButtonText}>Create Account</Text>
                          <ArrowRight size={18} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.footer}>
                  <Text style={[s.footerText, { color: C.muted }]}>
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate(route.login)}
                  >
                    <Text style={[s.footerLink, { color: C.primary }]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {currentStep === 'verify' && (
              <>
                <TouchableOpacity
                  style={[s.backButtonTop, { backgroundColor: C.surface }]}
                  onPress={() => goToStep('details')}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={22} color={C.text} />
                </TouchableOpacity>

                <View style={s.verifyContainer}>
                  <View style={s.verifyHeader}>
                    <View
                      style={[
                        s.verifyIconCircle,
                        { backgroundColor: C.primary },
                      ]}
                    >
                      <Mail size={28} color="#FFFFFF" />
                    </View>
                    <Text style={[s.verifyTitle, { color: C.text }]}>
                      Verify Your Email
                    </Text>
                    <Text style={[s.verifySubtitle, { color: C.muted }]}>
                      We've sent a 6-digit code to{'\n'}
                      <Text style={{ color: C.primary, fontWeight: '600' }}>
                        {email}
                      </Text>
                    </Text>
                  </View>

                  <View style={s.codeRow}>
                    {verificationCode.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={ref => {
                          codeRefs.current[i] = ref;
                        }}
                        style={[
                          s.codeBox,
                          {
                            backgroundColor: digit ? C.selectedItem : C.surface,
                            borderColor: digit ? C.primary : C.border,
                            color: C.text,
                          },
                        ]}
                        value={digit}
                        onChangeText={t => handleCodeChange(t, i)}
                        onKeyPress={e => handleCodeKeyPress(e, i)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  <View style={s.resendContainer}>
                    {!canResend ? (
                      <Text style={[s.resendTimer, { color: C.primary }]}>
                        Resend in {formatTime(resendTimer)}
                      </Text>
                    ) : (
                      <TouchableOpacity
                        style={s.resendButton}
                        onPress={handleResendCode}
                        disabled={loading}
                      >
                        <Text style={[s.resendText, { color: C.muted }]}>
                          Didn't receive it?{' '}
                        </Text>
                        <Text style={{ color: C.primary, fontWeight: '600' }}>
                          Resend
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      s.submitButton,
                      { backgroundColor: C.primary },
                      loading && s.buttonDisabled,
                    ]}
                    onPress={handleVerification}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={s.submitButtonText}>Verify Email</Text>
                        <ArrowRight size={18} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.footerLinkOnly}
                    onPress={() => navigation.navigate(route.login)}
                  >
                    <Text style={[s.footerLink, { color: C.primary }]}>
                      Already verified? Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAwareness>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  container: {
    flex: 1,
  },
  headerSection: {
    marginBottom: SPACING.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  titleSection: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxxl + 2,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  formCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  form: {
    gap: SPACING.md,
  },
  fieldWrap: {
    marginBottom: SPACING.xs,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  nameRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfField: {
    flex: 1,
  },
  genderSelector: {
    height: 52,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  genderText: {
    fontSize: FONT_SIZES.md,
  },
  genderDropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    zIndex: 10,
    marginTop: 4,
  },
  genderOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  genderText: {
    fontSize: FONT_SIZES.md,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xs,
  },
  matchText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  submitButton: {
    height: 54,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  codeBox: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    minHeight: 24,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendTimer: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  resendText: {
    fontSize: FONT_SIZES.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
  },
  footerLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  genderOptionText: {
    fontSize: FONT_SIZES.md,
  },
  backButtonTop: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  verifyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  verifyHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  verifyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  verifyTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  verifySubtitle: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  footerLinkOnly: {
    alignSelf: 'center',
    marginTop: SPACING.lg,
  },
});
