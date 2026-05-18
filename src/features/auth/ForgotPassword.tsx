import React, { useState, useRef, useEffect, useContext } from 'react';
import { useLanguage } from '../../component/language-translation/LanguageProvider';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { checkInternetConnection } from '../../utilits/checkInternet';
import InputField from '../../reusable/InputField';
import {
  getColors,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
} from '../../constants/theme';
import ActionModal from '../../reusable/ActionModal';
import { sendPostRequest } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { AppContext } from '../../common/AppContext';
import {
  ChevronLeft,
  Mail,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  RefreshCw,
  Check,
  X,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';

type Step = 'email' | 'verify' | 'reset';

const STEPS: Step[] = ['email', 'verify', 'reset'];

interface PasswordReq {
  label: string;
  met: boolean;
  test: (p: string) => boolean;
}

const STEP_META: Record<Step, { eyebrow: string; title: string; sub: string }> =
  {
    email: {
      eyebrow: 'STEP 1 OF 3',
      title: 'Forgot Password?',
      sub: "Enter your email and we'll send a verification code",
    },
    verify: {
      eyebrow: 'STEP 2 OF 3',
      title: 'Check Your Email',
      sub: 'Enter the 6-digit code we sent to your inbox',
    },
    reset: {
      eyebrow: 'STEP 3 OF 3',
      title: 'New Password',
      sub: 'Create a strong new password for your account',
    },
  };

// ─────────────────────────────────────────────────────────────────────────────

export default function ForgotPassword() {
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [resendCount, setResendCount] = useState(0);

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

  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const { translations } = useLanguage();
  const codeRefs = useRef<(TextInput | any)[]>([]);

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const progressAnim = useRef(new Animated.Value(1 / 3)).current;

  if (!app) return null;
  const { isDark } = app;
  const C = getColors(isDark);

  // Step enter animation
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
  }, [currentStep]);

  const goToStep = (step: Step) => {
    const toValue = step === 'email' ? 1 / 3 : step === 'verify' ? 2 / 3 : 1;
    Animated.timing(progressAnim, {
      toValue,
      duration: 350,
      useNativeDriver: false,
    }).start();
    setCurrentStep(step);
    setError('');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ── Resend Timer ───────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins} min ${secs}sec` : `${mins} min`;
    }
    return `${seconds} sec`;
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
    ) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSendCode = async () => {
    if (currentStep === 'verify' && !canResend) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(translations.validation.invalidEmail);
      return;
    }
    if (!(await checkInternetConnection())) {
      showToast('error', 'No internet connection. Please try again.');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const res = await sendPostRequest('auth', 'resend-verification', {
        email,
      });
      if (res.returnCode === 200) {
        showToast('success', res.returnMessage || 'Verification code sent');
        goToStep('verify');
        startResendTimer();
      } else if (res.returnCode === 201) {
        showToast('info', res.returnMessage);
        setTimeout(() => {
          goToStep('verify');
        }, 2500);
      } else {
        showToast(
          'error',
          res.returnMessage || 'Failed to send verification code',
        );
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      showToast('error', 'Please enter the 6-digit code');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const res = await sendPostRequest('auth', 'verify-code', { email, code });
      if (res.returnCode === 200) {
        showToast('success', res.returnMessage || 'Code verified');
        goToStep('reset');
      } else {
        setError(res.returnMessage || 'Invalid verification code');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const unmet = pwdReqs.filter(r => !r.met).map(r => r.label.toLowerCase());
    if (unmet.length > 0) {
      showToast('error', `Password must include:\n- ${unmet.join('\n- ')}`);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match');
      return;
    }
    if (!(await checkInternetConnection())) {
      showToast('error', 'No internet connection. Please try again.');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const res = await sendPostRequest('auth', 'set-password', {
        email,
        password: newPassword,
      });
      if (res.returnCode === 200) {
        showToast('success', res.returnMessage || 'Password reset successful');
        setTimeout(() => navigation.goBack(), 1800);
      } else {
        throw new Error(res.returnMessage || 'Failed to reset password');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
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

      {/* ── Full-screen gradient ── */}
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
        {/* Back button */}
        <TouchableOpacity
          style={[
            s.backBtn,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
          onPress={() =>
            currentStep === 'email'
              ? navigation.goBack()
              : goToStep(currentStep === 'verify' ? 'email' : 'verify')
          }
          activeOpacity={0.75}
        >
          <ChevronLeft size={20} color={C.text} strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Step icon */}
        <View
          style={[
            s.stepIconWrap,
            { backgroundColor: C.primary, shadowColor: C.primary },
          ]}
        >
          {currentStep === 'email' && (
            <Mail size={26} color={C.white} strokeWidth={1.8} />
          )}
          {currentStep === 'verify' && (
            <ShieldCheck size={26} color={C.white} strokeWidth={1.8} />
          )}
          {currentStep === 'reset' && (
            <KeyRound size={26} color={C.white} strokeWidth={1.8} />
          )}
        </View>

        {/* Eyebrow + title + subtitle */}
        <Text style={[s.headerEyebrow, { color: C.accent }]}>
          {meta.eyebrow}
        </Text>
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
            const done = STEPS.indexOf(step) < STEPS.indexOf(currentStep);
            const active = step === currentStep;
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.kav}
      >
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
            {/* Card top accent bar */}
            <LinearGradient
              colors={[C.primaryDark, C.primary, C.accent]}
              style={s.cardBar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />

            <View style={s.cardBody}>
              {/* ══ STEP 1: Email ══════════════════════════════════════════ */}
              {currentStep === 'email' && (
                <>
                  <Text style={[s.cardEyebrow, { color: C.primary }]}>
                    EMAIL ADDRESS
                  </Text>
                  <Text style={[s.cardTitle, { color: C.text }]}>
                    Enter Your Email
                  </Text>
                  <View
                    style={[s.cardDivider, { backgroundColor: C.accent }]}
                  />

                  <View style={s.fieldWrap}>
                    <Text style={[s.fieldLabel, { color: C.muted }]}>
                      EMAIL
                    </Text>
                    <InputField
                      placeholder="you@example.com"
                      value={email}
                      onChangeText={t => {
                        setEmail(t);
                        setError('');
                      }}
                      error={error || undefined}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      leftIcon={<Mail size={17} color={C.muted} />}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      s.cta,
                      { shadowColor: C.primary },
                      isLoading && s.ctaDisabled,
                    ]}
                    onPress={handleSendCode}
                    activeOpacity={0.84}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={[C.primaryDark, C.primary, C.accent]}
                      style={s.ctaGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={C.white} />
                      ) : (
                        <>
                          <Text style={[s.ctaText, { color: C.white }]}>
                            Send Code
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

              {/* ══ STEP 2: Verify ═════════════════════════════════════════ */}
              {currentStep === 'verify' && (
                <>
                  <Text style={[s.cardEyebrow, { color: C.primary }]}>
                    VERIFICATION
                  </Text>
                  <Text style={[s.cardTitle, { color: C.text }]}>
                    Enter Code
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

                  {/* 6-digit code boxes */}
                  <View style={s.codeRow}>
                    {verificationCode.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={ref => (codeRefs.current[i] = ref)}
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

                  {!!error && (
                    <Text style={[s.errorText, { color: C.error }]}>
                      {error}
                    </Text>
                  )}

                  {/* Resend */}
                  <View style={s.resendContainer}>
                    {!canResend ? (
                      <Text style={[s.resendTimer, { color: C.primary }]}>
                        Resend code in {formatTime(resendTimer)}
                      </Text>
                    ) : (
                      <TouchableOpacity
                        style={s.resendBtn}
                        onPress={handleSendCode}
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
                      isLoading && s.ctaDisabled,
                    ]}
                    onPress={handleVerifyCode}
                    activeOpacity={0.84}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={[C.primaryDark, C.primary, C.accent]}
                      style={s.ctaGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={C.white} />
                      ) : (
                        <>
                          <Text style={[s.ctaText, { color: C.white }]}>
                            Verify Code
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

              {/* ══ STEP 3: Reset ══════════════════════════════════════════ */}
              {currentStep === 'reset' && (
                <>
                  <Text style={[s.cardEyebrow, { color: C.primary }]}>
                    RESET PASSWORD
                  </Text>
                  <Text style={[s.cardTitle, { color: C.text }]}>
                    New Password
                  </Text>
                  <View
                    style={[s.cardDivider, { backgroundColor: C.accent }]}
                  />

                  <View style={s.fieldWrap}>
                    <Text style={[s.fieldLabel, { color: C.muted }]}>
                      NEW PASSWORD
                    </Text>
                    <InputField
                      placeholder="Enter new password"
                      value={newPassword}
                      onChangeText={t => {
                        checkPwdStrength(t);
                        setNewPassword(t);
                        setError('');
                      }}
                      secure
                      leftIcon={<KeyRound size={17} color={C.muted} />}
                    />

                    {/* Strength bars */}
                    {newPassword.length > 0 && (
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
                    {newPassword.length > 0 && (
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
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChangeText={t => {
                        setConfirmPassword(t);
                        setError('');
                      }}
                      secure
                      error={error || undefined}
                      leftIcon={<ShieldCheck size={17} color={C.muted} />}
                    />

                    {/* Match indicator */}
                    {confirmPassword.length > 0 && (
                      <View style={s.matchRow}>
                        {newPassword === confirmPassword ? (
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

                  {/* Tip strip */}
                  <View
                    style={[
                      s.tipStrip,
                      {
                        backgroundColor: C.surface,
                        borderLeftColor: C.primary,
                      },
                    ]}
                  >
                    <KeyRound size={15} color={C.primary} />
                    <Text style={[s.tipText, { color: C.muted }]}>
                      Use letters, numbers & special characters for a stronger
                      password
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      s.cta,
                      { shadowColor: C.primary },
                      isLoading && s.ctaDisabled,
                    ]}
                    onPress={handleResetPassword}
                    activeOpacity={0.84}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={[C.primaryDark, C.primary, C.accent]}
                      style={s.ctaGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={C.white} />
                      ) : (
                        <>
                          <Text style={[s.ctaText, { color: C.white }]}>
                            Reset Password
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
            </View>
          </Animated.View>

          {/* Footer help */}
          <View style={s.footer}>
            <Text style={[s.footerText, { color: C.muted }]}>Need help? </Text>
            <TouchableOpacity>
              <Text style={[s.footerLink, { color: C.primary }]}>
                Contact Support
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — zero hardcoded colors; all C.* tokens applied inline
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  stepIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  headerEyebrow: {
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
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // ── Card ───────────────────────────────────────────────────────────────────
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

  // ── Fields ─────────────────────────────────────────────────────────────────
  fieldWrap: { marginBottom: SPACING.lg },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.2,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },

  // ── Verify code boxes ──────────────────────────────────────────────────────
  verifyHint: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
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
  errorText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontWeight: '500',
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
  resendText: {
    fontSize: FONT_SIZES.sm,
  },

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

  // ── Password tip strip ─────────────────────────────────────────────────────
  tipStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderLeftWidth: 3,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  tipText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },

  // ── CTA button ─────────────────────────────────────────────────────────────
  cta: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
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
  ctaText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.lg,
  },
  footerText: { fontSize: FONT_SIZES.xs },
  footerLink: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
});
