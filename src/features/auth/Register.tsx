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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppContext } from '../../common/AppContext';
import { checkInternetConnection } from '../../utilits/checkInternet';
import { sendPostRequest } from '../../services/api';
import InputField from '../../reusable/InputField';
import DatePickerInput from '../../reusable/DatePickerInput';
import ActionModal from '../../reusable/ActionModal';
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
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  UserPlus,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';

// ─────────────────────────────────────────────────────────────────────────────

type Step = 'details' | 'verify' | 'password';

const STEPS: Step[] = ['details', 'verify', 'password'];

const STEP_META: Record<Step, { eyebrow: string; title: string; sub: string }> =
  {
    details: {
      eyebrow: 'STEP 1 OF 3',
      title: 'Create Account',
      sub: 'Fill in your details to get started',
    },
    verify: {
      eyebrow: 'STEP 2 OF 3',
      title: 'Verify Email',
      sub: 'Enter the 6-digit code sent to your inbox',
    },
    password: {
      eyebrow: 'STEP 3 OF 3',
      title: 'Secure Account',
      sub: 'Create a strong password to protect your account',
    },
  };

interface PasswordReq {
  label: string;
  met: boolean;
  test: (p: string) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Register() {
  const { isDark }: any = useContext(AppContext);
  const navigation = useNavigation<any>();
  const routes = useRoute();
  const { emailVerify, tab }: any = routes.params || {};

  const C = getColors(isDark);

  // ── State ───────────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<Step>(
    tab === 'verify' ? 'verify' : 'details',
  );
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(emailVerify || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender] = useState('Not Specified');

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
  const [currentReqIndex, setCurrentReqIndex] = useState(0);

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
  const [modal, setModal] = useState<any>({
    status: false,
    title: '',
    message: '',
    severity: 'error',
  });
  const [loading, setLoading] = useState(false);

  // ── Animations ──────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const progressAnim = useRef(new Animated.Value(1 / 3)).current;

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
    const toValue = step === 'details' ? 1 / 3 : step === 'verify' ? 2 / 3 : 1;
    Animated.timing(progressAnim, {
      toValue,
      duration: 350,
      useNativeDriver: false,
    }).start();
    setCurrentStep(step);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isComplete = (step: Step) =>
    STEPS.indexOf(step) < STEPS.indexOf(currentStep);

  // ── Password strength ───────────────────────────────────────────────────────
  const checkPwdStrength = (pwd: string) => {
    const reqs = pwdReqs.map(r => ({ ...r, met: r.test(pwd) }));
    setPwdReqs(reqs);
    const score = reqs.filter(r => r.met).length;

    if (!pwd.length) {
      setPwdStrength({ score: 0, text: '', color: '' });
      setCurrentReqIndex(0);
      return;
    }

    const firstUnmetIndex = reqs.findIndex(r => !r.met);
    if (firstUnmetIndex !== -1) {
      setCurrentReqIndex(firstUnmetIndex);
    }

    if (score === 5)
      setPwdStrength({ score, text: 'Strong', color: C.success });
    else if (score >= 3)
      setPwdStrength({ score, text: 'Medium', color: C.warning });
    else setPwdStrength({ score, text: 'Weak', color: C.error });
  };

  // ── Resend Timer ───────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}min ${secs}sec` : `${mins}min`;
    }
    return `${seconds}sec`;
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

  // ── Code input ──────────────────────────────────────────────────────────────
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

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = 'Username is required';
    else if (username.length < 3)
      e.username = 'Username must be at least 3 characters';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Valid email required';
    if (!firstName.trim()) e.firstName = 'First name required';
    if (!lastName.trim()) e.lastName = 'Last name required';
    if (!phoneNumber || !/^[0-9]{10,15}$/.test(phoneNumber))
      e.phoneNumber = 'Phone must be 10–15 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!validateDetails()) return;
    if (!(await checkInternetConnection())) {
      showToast('error', 'No internet connection. Please try again.');
      return;
    }
    try {
      setLoading(true);
      const res = await sendPostRequest('auth', 'register', {
        username: username.trim(),
        email: email.toLowerCase().trim(),
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth: dateOfBirth || '2000-01-01',
        gender,
        userRole: 2,
      });
      if (res.returnCode === 200) {
        showToast('success', res.returnMessage || 'Registration successful!');
        setTimeout(() => goToStep('verify'), 1800);
      } else {
        showToast(
          'error',
          res.returnMessage || 'Registration failed. Please try again.',
        );
      }
    } catch (e: any) {
      showToast('error', e.message || 'Please try again later');
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
      if (res.returnCode === 200) {
        showToast('success', res.returnMessage || 'Email verified!');
        setTimeout(() => goToStep('password'), 1500);
      } else {
        showToast('error', res.returnMessage || 'Invalid code');
      }
    } catch (e: any) {
      showToast('error', e.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    const unmet = pwdReqs.filter(r => !r.met).map(r => r.label.toLowerCase());
    if (unmet.length > 0) {
      showToast('error', `Password must include:\n- ${unmet.join('\n- ')}`);
      return;
    }
    if (password !== confirmPassword) {
      showToast('warning', 'Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      const res = await sendPostRequest('auth', 'set-password', {
        email,
        password,
      });
      if (res.returnCode === 200) {
        showToast(
          'success',
          res.returnMessage || 'Account created successfully!',
        );
        setTimeout(() => navigation.navigate(route.login), 2000);
      } else {
        showToast(
          'error',
          res.returnMessage || 'Failed to set password. Please try again.',
        );
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
      } else showToast('error', res.returnMessage || 'Failed to resend code');
    } catch (e: any) {
      showToast('error', e.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const meta = STEP_META[currentStep];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { backgroundColor: C.background }]}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Full-screen gradient */}
      <LinearGradient
        colors={[C.background, C.surface]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* ── Header ── */}
      <View
        style={[s.header, { paddingTop: Platform.OS === 'android' ? 48 : 58 }]}
      >
        {/* Back / close */}
        <TouchableOpacity
          style={[
            s.backBtn,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
          onPress={() => {
            if (currentStep === 'details') navigation.goBack();
            else goToStep(currentStep === 'verify' ? 'details' : 'verify');
          }}
          activeOpacity={0.75}
        >
          <ChevronLeft size={20} color={C.text} strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Step icon */}
        <View
          style={[
            s.stepIcon,
            { backgroundColor: C.primary, shadowColor: C.primary },
          ]}
        >
          {currentStep === 'details' && (
            <UserPlus size={26} color={C.white} strokeWidth={1.8} />
          )}
          {currentStep === 'verify' && (
            <Mail size={26} color={C.white} strokeWidth={1.8} />
          )}
          {currentStep === 'password' && (
            <ShieldCheck size={26} color={C.white} strokeWidth={1.8} />
          )}
        </View>

        {/* Eyebrow / title / subtitle */}
        <Text style={[s.eyebrow, { color: C.accent }]}>{meta.eyebrow}</Text>
        <Text style={[s.headerTitle, { color: C.text }]}>{meta.title}</Text>
        <Text style={[s.headerSub, { color: C.textSecondary }]}>
          {meta.sub}
        </Text>

        {/* Progress bar */}
        <View style={[s.progressTrack, { backgroundColor: C.border }]}>
          <Animated.View
            style={[
              s.progressFill,
              { width: progressWidth, backgroundColor: C.accent },
            ]}
          />
        </View>

        {/* Step dots */}
        <View style={s.stepDots}>
          {STEPS.map(step => {
            const active = step === currentStep;
            const done = isComplete(step);
            return (
              <View
                key={step}
                style={[
                  s.stepDot,
                  {
                    backgroundColor: active || done ? C.accent : C.border,
                    width: active ? 20 : 8,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* ── Content ── */}
      <KeyboardAwareness>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              s.card,
              {
                backgroundColor: C.cardBackground,
                borderColor: C.border,
                shadowColor: C.shadowColor,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Top accent bar */}
            <LinearGradient
              colors={[C.primaryDark, C.primary, C.accent]}
              style={s.cardBar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />

            <View style={s.cardBody}>
              {/* ══ STEP 1: Details ══════════════════════════════════════ */}
              {currentStep === 'details' && (
                <>
                  <Text style={[s.cardEyebrow, { color: C.primary }]}>
                    ACCOUNT DETAILS
                  </Text>
                  <Text style={[s.cardTitle, { color: C.text }]}>
                    Personal Info
                  </Text>
                  <View
                    style={[s.cardDivider, { backgroundColor: C.accent }]}
                  />

                  <View style={s.form}>
                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        USERNAME
                      </Text>
                      <InputField
                        placeholder="Choose a username"
                        value={username}
                        onChangeText={t => {
                          setUsername(t);
                          if (errors.username)
                            setErrors({ ...errors, username: '' });
                        }}
                        error={errors.username}
                        autoCapitalize="none"
                        leftIcon={<User size={17} color={C.muted} />}
                      />
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
                          if (errors.email) setErrors({ ...errors, email: '' });
                        }}
                        error={errors.email}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        leftIcon={<Mail size={17} color={C.muted} />}
                      />
                    </View>

                    <View style={s.row}>
                      <View style={s.half}>
                        <Text style={[s.fieldLabel, { color: C.muted }]}>
                          FIRST NAME
                        </Text>
                        <InputField
                          placeholder="First"
                          value={firstName}
                          onChangeText={t => {
                            setFirstName(t);
                            if (errors.firstName)
                              setErrors({ ...errors, firstName: '' });
                          }}
                          error={errors.firstName}
                          leftIcon={<User size={17} color={C.muted} />}
                        />
                      </View>
                      <View style={s.half}>
                        <Text style={[s.fieldLabel, { color: C.muted }]}>
                          LAST NAME
                        </Text>
                        <InputField
                          placeholder="Last"
                          value={lastName}
                          onChangeText={t => {
                            setLastName(t);
                            if (errors.lastName)
                              setErrors({ ...errors, lastName: '' });
                          }}
                          error={errors.lastName}
                          leftIcon={<User size={17} color={C.muted} />}
                        />
                      </View>
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        PHONE NUMBER
                      </Text>
                      <InputField
                        placeholder="+1 234 567 8900"
                        value={phoneNumber}
                        onChangeText={t => {
                          setPhoneNumber(t);
                          if (errors.phoneNumber)
                            setErrors({ ...errors, phoneNumber: '' });
                        }}
                        error={errors.phoneNumber}
                        keyboardType="phone-pad"
                        leftIcon={<PhoneCall size={17} color={C.muted} />}
                      />
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        DATE OF BIRTH
                      </Text>
                      <DatePickerInput
                        label=""
                        placeholder="Select date (optional)"
                        value={dateOfBirth}
                        onChangeDate={setDateOfBirth}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        s.cta,
                        { shadowColor: C.primary },
                        loading && s.ctaDisabled,
                      ]}
                      onPress={handleRegister}
                      activeOpacity={0.84}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={[C.primaryDark, C.primary, C.accent]}
                        style={s.ctaGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color={C.white} />
                        ) : (
                          <>
                            <Text style={[s.ctaText, { color: C.white }]}>
                              Continue
                            </Text>
                            <ArrowRight
                              size={17}
                              color={C.white}
                              strokeWidth={2.8}
                            />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* ══ STEP 2: Verify ═══════════════════════════════════════ */}
              {currentStep === 'verify' && (
                <>
                  <Text style={[s.cardEyebrow, { color: C.primary }]}>
                    EMAIL VERIFICATION
                  </Text>
                  <Text style={[s.cardTitle, { color: C.text }]}>
                    Check Inbox
                  </Text>
                  <View
                    style={[s.cardDivider, { backgroundColor: C.accent }]}
                  />

                  <Text style={[s.verifyHint, { color: C.muted }]}>
                    Code sent to{' '}
                    <Text style={{ color: C.primary, fontWeight: '700' }}>
                      {email}
                    </Text>
                  </Text>

                  {/* Code boxes */}
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

                  {/* Resend */}
                  <View style={s.resendContainer}>
                    {!canResend ? (
                      <Text style={[s.resendTimer, { color: C.primary }]}>
                        Resend code in {formatTime(resendTimer)}
                      </Text>
                    ) : (
                      <TouchableOpacity
                        style={s.resendBtn}
                        onPress={handleResendCode}
                        disabled={loading}
                      >
                        <RefreshCw size={13} color={C.muted} />
                        <Text style={[s.resendText, { color: C.muted }]}>
                          Didn't receive it?{' '}
                          <Text style={{ color: C.primary, fontWeight: '700' }}>
                            Resend
                          </Text>
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      s.cta,
                      { shadowColor: C.primary },
                      loading && s.ctaDisabled,
                    ]}
                    onPress={handleVerification}
                    activeOpacity={0.84}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={[C.primaryDark, C.primary, C.accent]}
                      style={s.ctaGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color={C.white} />
                      ) : (
                        <>
                          <Text style={[s.ctaText, { color: C.white }]}>
                            Verify & Continue
                          </Text>
                          <ArrowRight
                            size={17}
                            color={C.white}
                            strokeWidth={2.8}
                          />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {/* ══ STEP 3: Password ═════════════════════════════════════ */}
              {currentStep === 'password' && (
                <>
                  <Text style={[s.cardEyebrow, { color: C.primary }]}>
                    SET PASSWORD
                  </Text>
                  <Text style={[s.cardTitle, { color: C.text }]}>
                    Secure Account
                  </Text>
                  <View
                    style={[s.cardDivider, { backgroundColor: C.accent }]}
                  />

                  <View style={s.form}>
                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        PASSWORD
                      </Text>
                      <InputField
                        placeholder="Create a password"
                        value={password}
                        onChangeText={t => {
                          checkPwdStrength(t);
                          setPassword(t);
                        }}
                        secure
                        leftIcon={<Lock size={17} color={C.muted} />}
                      />

                      {/* Strength bars */}
                      {password.length > 0 && (
                        <View style={s.strengthWrap}>
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
                          {!!pwdStrength.text && (
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

                      {/* Requirements checklist */}
                      {password.length > 0 && (
                        <View
                          style={[
                            s.reqList,
                            {
                              backgroundColor: C.surface,
                              borderColor: C.border,
                            },
                          ]}
                        >
                          {(() => {
                            const currentReq = pwdReqs[currentReqIndex];
                            if (!currentReq) return null;
                            return (
                              <View style={s.reqRow}>
                                {currentReq.met ? (
                                  <Check size={14} color={C.success} />
                                ) : (
                                  <X size={14} color={C.muted} />
                                )}
                                <Text
                                  style={[
                                    s.reqText,
                                    {
                                      color: currentReq.met
                                        ? C.success
                                        : C.primary,
                                    },
                                  ]}
                                >
                                  {currentReq.label}
                                </Text>
                              </View>
                            );
                          })()}
                        </View>
                      )}
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={[s.fieldLabel, { color: C.muted }]}>
                        CONFIRM PASSWORD
                      </Text>
                      <InputField
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secure
                        leftIcon={<Lock size={17} color={C.muted} />}
                      />

                      {/* Match indicator */}
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
                        s.cta,
                        { shadowColor: C.primary },
                        loading && s.ctaDisabled,
                      ]}
                      onPress={handleSetPassword}
                      activeOpacity={0.84}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={[C.primaryDark, C.primary, C.accent]}
                        style={s.ctaGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color={C.white} />
                        ) : (
                          <>
                            <Text style={[s.ctaText, { color: C.white }]}>
                              Create Account
                            </Text>
                            <ArrowRight
                              size={17}
                              color={C.white}
                              strokeWidth={2.8}
                            />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={[s.footerText, { color: C.muted }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate(route.login)}>
              <Text style={[s.footerLink, { color: C.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAwareness>

      <ActionModal
        visible={modal.status}
        title={modal.title}
        message={modal.message}
        severity={modal.severity}
        onConfirm={() => setModal({ ...modal, status: false })}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — zero hardcoded colors; all C.* tokens applied inline
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // marginBottom: SPACING.lg,
  },
  stepIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -SPACING.xxxl + -10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  headerSub: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  stepDots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: { height: 8, borderRadius: 4 },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    // paddingBottom: SPACING.xxxl,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 16,
    marginBottom: SPACING.lg,
  },
  cardBar: { height: 2 },
  cardBody: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 34,
    marginBottom: SPACING.md,
  },
  cardDivider: {
    height: 1,
    width: 40,
    borderRadius: 1,
    marginBottom: SPACING.xl,
  },

  // ── Form ────────────────────────────────────────────────────────────────────
  form: { gap: SPACING.xs },
  fieldWrap: { marginBottom: SPACING.sm },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.2,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', gap: SPACING.sm },
  half: { flex: 1 },

  // Verify
  verifyHint: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
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
    marginBottom: SPACING.xl,
    minHeight: 24,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resendTimer: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  resendText: { fontSize: FONT_SIZES.sm },

  // Password strength
  strengthWrap: { marginTop: SPACING.sm, marginBottom: SPACING.sm },
  strengthBars: { flexDirection: 'row', gap: SPACING.xs, marginBottom: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textAlign: 'right',
  },
  reqList: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  reqText: { fontSize: FONT_SIZES.sm, flex: 1 },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xs,
  },
  matchText: { fontSize: FONT_SIZES.sm, fontWeight: '600' },

  // CTA
  cta: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.md,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  ctaDisabled: { opacity: 0.65 },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
  },
  ctaText: { fontSize: FONT_SIZES.md, fontWeight: '800', letterSpacing: 0.4 },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.lg,
  },
  footerText: { fontSize: FONT_SIZES.xs },
  footerLink: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
});
