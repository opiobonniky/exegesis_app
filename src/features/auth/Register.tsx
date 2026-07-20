import React, { useContext, useRef, useState, useEffect } from 'react';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
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
  ChevronRight,
  Lock,
  Mail,
  PhoneCall,
  User,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  MailOpen,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCircle,
  Calendar,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';

type Step = 'details' | 'verify';

const STEPS: Step[] = ['details', 'verify'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PasswordReq {
  label: string;
  met: boolean;
  test: (p: string) => boolean;
}

export default function Register() {
  const { isDark, setUserInfo }: any = useContext(AppContext);
  const { translations, language } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const navigation = useNavigation<any>();
  const routes = useRoute();
  const {
    emailVerify,
    tab,
    googleSignUp,
    googleId,
    firstName: gFirstName,
    lastName: gLastName,
    photoUrl,
    email: gEmail,
  }: any = routes.params || {};

  const C = getColors(isDark);

  const [currentStep, setCurrentStep] = useState<Step>(
    tab === 'verify' ? 'verify' : 'details',
  );
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(emailVerify || gEmail || '');
  const [firstName, setFirstName] = useState(gFirstName || '');
  const [lastName, setLastName] = useState(gLastName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStrength, setPwdStrength] = useState({
    score: 0,
    text: '',
    color: '',
  });
  const defaultPwdReqs = (translations.register &&
    (translations.register as any).pwdReqs) || [
    'At least 8 characters',
    'One lowercase letter',
    'One uppercase letter',
    'One number',
    'One special character',
  ];

  const [pwdReqs, setPwdReqs] = useState<PasswordReq[]>([
    { label: defaultPwdReqs[0], met: false, test: p => p.length >= 8 },
    { label: defaultPwdReqs[1], met: false, test: p => /[a-z]/.test(p) },
    { label: defaultPwdReqs[2], met: false, test: p => /[A-Z]/.test(p) },
    { label: defaultPwdReqs[3], met: false, test: p => /[0-9]/.test(p) },
    {
      label: defaultPwdReqs[4],
      met: false,
      test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
    },
  ]);

  useEffect(() => {
    const currentDefaultPwdReqs = (translations.register &&
      (translations.register as any).pwdReqs) || [
      'At least 8 characters',
      'One lowercase letter',
      'One uppercase letter',
      'One number',
      'One special character',
    ];
    setPwdReqs(prev =>
      prev.map((r, i) => ({
        ...r,
        label: currentDefaultPwdReqs[i] || r.label,
      })),
    );
  }, [translations]);

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
      setPwdStrength({
        score,
        text: translations.passwords?.strong || 'Strong',
        color: C.success,
      });
    else if (score >= 3)
      setPwdStrength({
        score,
        text: translations.passwords?.medium || 'Medium',
        color: C.warning,
      });
    else
      setPwdStrength({
        score,
        text: translations.passwords?.weak || 'Weak',
        color: C.error,
      });
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
    if (!username.trim())
      e.username =
        translations.validation?.usernameRequired || 'Username is required';
    else if (username.length < 3)
      e.username =
        translations.validation?.usernameMin ||
        'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username))
      e.username =
        translations.validation?.usernameFormat ||
        'Only letters, numbers, underscores';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = translations.validation?.invalidEmail || 'Valid email required';
    if (!firstName.trim())
      e.firstName =
        translations.validation?.firstNameRequired || 'First name required';
    if (!lastName.trim())
      e.lastName =
        translations.validation?.lastNameRequired || 'Last name required';
    if (!phoneNumber || !/^[0-9]{10,15}$/.test(phoneNumber))
      e.phoneNumber =
        translations.validation?.phoneInvalid || 'Phone must be 10-15 digits';
    if (!password) {
      e.password = translations.validation?.passwordRequired || 'Password is required';
    } else {
      const unmet = pwdReqs.filter(r => !r.met);
      if (unmet.length > 0) {
        const missingPrefix =
          translations.validation?.missingPrefix || 'Missing:';
        e.password = `${missingPrefix} ${unmet[0].label}`;
      }
    }
    if (!confirmPassword) {
      e.confirmPassword =
        translations.validation?.confirmPassword || 'Please confirm password';
    } else if (password !== confirmPassword) {
      e.confirmPassword =
        translations.passwords?.notMatch || 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validateDetails()) return;
    if (!(await checkInternetConnection())) {
      showToast('error', translations.errors?.noInternet || 'No internet connection. Please try again.');
      return;
    }

    try {
      setLoading(true);

      let res;
      if (googleSignUp && googleId) {
        res = await sendPostRequest('auth', 'complete-google-registration', {
          googleId: googleId,
          username: username.trim().toLowerCase(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber,
          gender,
        });
      } else {
        res = await sendPostRequest('auth', 'register', {
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
      }

      const { returnCode, returnMessage, returnData } = res;

      if (returnCode === 200) {
        if (googleSignUp && returnData?.token) {
          const info = {
            token: returnData.token,
            tokenType: returnData.tokenType,
            username: returnData.username,
            email: returnData.email,
            firstName: returnData.firstName,
            lastName: returnData.lastName,
            profilePhotoUrl: returnData.profilePhotoUrl,
            userRole: returnData.userRole,
            roleName: returnData.roleName,
          };
          await setUserInfo(info);
          showToast(
            'success',
            returnMessage || translations.register?.successCreated || 'Account created successfully!',
          );
          const dashboardRoute = info.userRole === 1 ? route.adminDashboardLogin : route.homeLogin;
          setTimeout(() => navigation.navigate(dashboardRoute), 800);
        } else {
          showToast(
            'success',
            returnMessage || translations.register?.successVerifyEmail || 'Check your email for verification code.',
          );
          setTimeout(() => goToStep('verify'), 1500);
        }
      } else if (returnCode === 401) {
        showToast('warning', returnMessage);
      } else {
        showToast(
          'error',
          returnMessage || translations.errors?.registrationFailed || 'Registration failed. Please try again.',
        );
      }
    } catch (e: any) {
      const returnCode = e?.returnCode;
      const returnMessage = e?.message || translations.errors?.tryAgainLater || 'Please try again later';
      showToast(returnCode === 401 ? 'warning' : 'error', returnMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      showToast('warning', translations.errors?.enterVerificationCode || 'Please enter the 6-digit code');
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
        try {
          const tokenData: any = (res as any).returnData;
          if (tokenData && tokenData.token) {
            const info = {
              token: tokenData.token,
              tokenType: tokenData.tokenType,
              username: tokenData.username,
              email: tokenData.email,
              firstName: tokenData.firstName,
              lastName: tokenData.lastName,
              profilePhotoUrl: tokenData.profilePhotoUrl,
              userRole: tokenData.userRole,
              roleName: tokenData.roleName,
            };
            await setUserInfo(info);
            showToast('success', returnMessage || translations.register?.successEmailVerified || 'Email verified! Redirecting...');
            const dashboardRoute = info.userRole === 1 ? route.adminDashboardLogin : route.homeLogin;
            setTimeout(() => navigation.navigate(dashboardRoute), 800);
            return;
          }

          const loginRes: any = await sendPostRequest('auth', 'login', {
            username: email.toLowerCase().trim(),
            password,
          });
          if (loginRes.returnCode === 200 && loginRes.returnData) {
            const d = loginRes.returnData;
            const info = {
              token: d.token,
              tokenType: d.tokenType,
              username: d.username,
              email: d.email,
              firstName: d.firstName,
              lastName: d.lastName,
              profilePhotoUrl: d.profilePhotoUrl,
              userRole: d.userRole,
              roleName: d.roleName,
            };
            await setUserInfo(info);
            showToast('success', loginRes.returnMessage || translations.register?.successEmailVerified || 'Email verified! Redirecting...');
            const dashboardRoute = info.userRole === 1 ? route.adminDashboardLogin : route.homeLogin;
            setTimeout(() => navigation.navigate(dashboardRoute), 800);
            return;
          }

          showToast('success', returnMessage || translations.register?.successEmailVerified || 'Email verified! Redirecting to login...');
          setTimeout(() => navigation.navigate(route.login), 1500);
        } catch (e: any) {
          showToast('success', returnMessage || translations.register?.successEmailVerified || 'Email verified! Redirecting to login...');
          setTimeout(() => navigation.navigate(route.login), 1500);
        }
      } else {
        showToast('error', returnMessage || translations.errors?.unexpected || 'Invalid code');
      }
    } catch (e: any) {
      showToast('error', e.message || translations.errors?.unexpected || 'An error occurred. Please try again.');
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
        showToast('success', res.returnMessage || translations.register?.successCodeResent || 'Code resent!');
        startResendTimer();
      } else {
        showToast('error', res.returnMessage || translations.errors?.failedResendCode || 'Failed to resend code');
      }
    } catch (e: any) {
      showToast('error', e.message || translations.errors?.failedResendCode || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const genders = [
    { value: 'Male', label: translations.register?.genderMale || 'Male' },
    { value: 'Female', label: translations.register?.genderFemale || 'Female' },
    { value: 'Not Specified', label: translations.register?.genderNotSpecified || 'Not Specified' },
  ];

  const stepIndicator = () => (
    <View style={[s.stepRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      <View style={[s.stepDot, { backgroundColor: C.primary }]}>
        <Text style={s.stepDotText}>1</Text>
      </View>
      <View style={[s.stepLine, { backgroundColor: currentStep === 'verify' ? C.primary : C.border }]} />
      <View style={[s.stepDot, { backgroundColor: currentStep === 'verify' ? C.primary : C.surface, borderColor: currentStep === 'verify' ? C.primary : C.border, borderWidth: 2 }]}>
        <Text style={[s.stepDotText, { color: currentStep === 'verify' ? '#fff' : C.muted }]}>2</Text>
      </View>
    </View>
  );

  const genderChips = () => (
    <View style={[s.genderRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      {genders.map(g => (
        <TouchableOpacity
          key={g.value}
          style={[
            s.genderChip,
            {
              backgroundColor: gender === g.value ? C.primary : C.surface,
              borderColor: gender === g.value ? C.primary : C.border,
            },
          ]}
          onPress={() => setGender(g.value)}
          activeOpacity={0.7}
        >
          <Text style={[s.genderChipText, { color: gender === g.value ? '#fff' : C.text }]}>
            {g.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const pwdReqList = () => {
    if (!password.length) return null;
    return (
      <View style={s.reqGrid}>
        {pwdReqs.map((r, i) => (
          <View key={i} style={[s.reqItem, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {r.met ? (
              <View style={[s.reqCheck, { backgroundColor: C.success }]}>
                <Check size={10} color="#fff" strokeWidth={3} />
              </View>
            ) : (
              <View style={[s.reqCircle, { borderColor: C.border }]} />
            )}
            <Text style={[s.reqLabel, { color: r.met ? C.success : C.muted }]}>
              {r.label}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: isDark ? C.background : '#F8FAFC' }]}>
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
                {/* Header */}
                <View style={[s.headerSection, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[s.backButton, { backgroundColor: C.surface }]}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                  >
                    {isRtl ? (
                      <ChevronRight size={22} color={C.text} />
                    ) : (
                      <ChevronLeft size={22} color={C.text} />
                    )}
                  </TouchableOpacity>
                  <View style={[s.titleSection, { marginLeft: isRtl ? 0 : SPACING.md, marginRight: isRtl ? SPACING.md : 0 }]}>
                    <Text style={[s.title, { color: C.text }]}>
                      {translations.register?.title || 'Create Account'}
                    </Text>
                    <Text style={[s.subtitle, { color: C.muted }]}>
                      {translations.register?.subtitle || 'Fill in your details to get started'}
                    </Text>
                  </View>
                </View>

                {stepIndicator()}

                {/* Form Card */}
                <View style={[s.formCard, { backgroundColor: C.cardBackground }]}>
                  {/* Section: Personal Info */}
                  <View style={s.sectionHead}>
                    <UserCircle size={16} color={C.primary} />
                    <Text style={[s.sectionTitle, { color: C.text }]}>Personal Information</Text>
                  </View>

                  <View style={[s.nameRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                    <View style={s.halfField}>
                      <InputField
                        placeholder={translations.register?.firstPlaceholder || 'First name'}
                        value={firstName}
                        onChangeText={t => {
                          setFirstName(t);
                          if (errors.firstName) setErrors(p => ({ ...p, firstName: '' }));
                        }}
                        error={errors.firstName}
                        leftIcon={<User size={18} color={C.muted} />}
                        textAlign={isRtl ? 'right' : 'left'}
                        isRtl={isRtl}
                      />
                    </View>
                    <View style={s.halfField}>
                      <InputField
                        placeholder={translations.register?.lastPlaceholder || 'Last name'}
                        value={lastName}
                        onChangeText={t => {
                          setLastName(t);
                          if (errors.lastName) setErrors(p => ({ ...p, lastName: '' }));
                        }}
                        error={errors.lastName}
                        leftIcon={<User size={18} color={C.muted} />}
                        textAlign={isRtl ? 'right' : 'left'}
                        isRtl={isRtl}
                      />
                    </View>
                  </View>

                  <View style={s.fieldGap}>
                    <InputField
                      placeholder={translations.register?.emailPlaceholder || 'you@example.com'}
                      value={email}
                      onChangeText={t => {
                        setEmail(t);
                        if (errors.email) setErrors(p => ({ ...p, email: '' }));
                      }}
                      error={errors.email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      leftIcon={<Mail size={18} color={C.muted} />}
                      textAlign={isRtl ? 'right' : 'left'}
                      isRtl={isRtl}
                    />
                  </View>

                  <View style={s.fieldGap}>
                    <InputField
                      placeholder={translations.register?.usernamePlaceholder || 'Choose a username'}
                      value={username}
                      onChangeText={t => {
                        setUsername(t.replace(/\s/g, ''));
                        if (errors.username) setErrors(p => ({ ...p, username: '' }));
                      }}
                      error={errors.username}
                      autoCapitalize="none"
                      leftIcon={<User size={18} color={C.muted} />}
                      textAlign={isRtl ? 'right' : 'left'}
                      isRtl={isRtl}
                    />
                  </View>

                  <View style={s.fieldGap}>
                    <InputField
                      placeholder={translations.register?.phonePlaceholder || '+1 234 567 8900'}
                      value={phoneNumber}
                      onChangeText={t => {
                        setPhoneNumber(t);
                        if (errors.phoneNumber) setErrors(p => ({ ...p, phoneNumber: '' }));
                      }}
                      error={errors.phoneNumber}
                      keyboardType="phone-pad"
                      leftIcon={<PhoneCall size={18} color={C.muted} />}
                      textAlign={isRtl ? 'right' : 'left'}
                      isRtl={isRtl}
                    />
                  </View>

                  <View style={s.fieldGap}>
                    <Text style={[s.smallLabel, { color: C.muted }]}>Gender</Text>
                    {genderChips()}
                  </View>

                  <View style={s.fieldGap}>
                    <Text style={[s.smallLabel, { color: C.muted }]}>Date of Birth (Optional)</Text>
                    <DatePickerInput
                      label=""
                      placeholder={translations.register?.datePlaceholder || 'Select date'}
                      value={dateOfBirth}
                      onChangeDate={setDateOfBirth}
                      textAlign={isRtl ? 'right' : 'left'}
                    />
                  </View>

                  {/* Divider */}
                  <View style={[s.divider, { backgroundColor: C.border }]} />

                  {/* Section: Security */}
                  <View style={s.sectionHead}>
                    <ShieldCheck size={16} color={C.primary} />
                    <Text style={[s.sectionTitle, { color: C.text }]}>Security</Text>
                  </View>

                  <View style={s.fieldGap}>
                    <InputField
                      placeholder={translations.register?.passwordPlaceholder || 'Create a strong password'}
                      value={password}
                      onChangeText={t => {
                        checkPwdStrength(t);
                        setPassword(t);
                        if (errors.password) setErrors(p => ({ ...p, password: '' }));
                      }}
                      error={errors.password}
                      secure={!showPassword}
                      leftIcon={<Lock size={18} color={C.muted} />}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                          {showPassword ? <EyeOff size={18} color={C.muted} /> : <Eye size={18} color={C.muted} />}
                        </TouchableOpacity>
                      }
                      textAlign={isRtl ? 'right' : 'left'}
                      isRtl={isRtl}
                    />
                    {password.length > 0 && (
                      <>
                        <View style={s.strengthRow}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <View
                              key={n}
                              style={[
                                s.strengthBar,
                                {
                                  backgroundColor: n <= pwdStrength.score ? pwdStrength.color : C.border,
                                },
                              ]}
                            />
                          ))}
                          {pwdStrength.text && (
                            <Text style={[s.strengthLabel, { color: pwdStrength.color }]}>
                              {pwdStrength.text}
                            </Text>
                          )}
                        </View>
                        {pwdReqList()}
                      </>
                    )}
                  </View>

                  <View style={s.fieldGap}>
                    <InputField
                      placeholder={translations.register?.confirmPasswordPlaceholder || 'Confirm your password'}
                      value={confirmPassword}
                      onChangeText={t => {
                        setConfirmPassword(t);
                        if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: '' }));
                      }}
                      error={errors.confirmPassword}
                      secure={!showConfirmPassword}
                      leftIcon={<Lock size={18} color={C.muted} />}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)}>
                          {showConfirmPassword ? <EyeOff size={18} color={C.muted} /> : <Eye size={18} color={C.muted} />}
                        </TouchableOpacity>
                      }
                      textAlign={isRtl ? 'right' : 'left'}
                      isRtl={isRtl}
                    />
                    {confirmPassword.length > 0 && (
                      <View style={[s.matchRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                        {password === confirmPassword ? (
                          <>
                            <Check size={14} color={C.success} />
                            <Text style={[s.matchText, { color: C.success }]}>
                              {translations.passwords?.match || 'Passwords match'}
                            </Text>
                          </>
                        ) : (
                          <>
                            <X size={14} color={C.error} />
                            <Text style={[s.matchText, { color: C.error }]}>
                              {translations.passwords?.notMatch || 'Passwords do not match'}
                            </Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[s.submitButton, { backgroundColor: C.primary }, loading && s.buttonDisabled]}
                    onPress={handleRegister}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={s.submitButtonText}>
                          {translations.register?.button || 'Create Account'}
                        </Text>
                        {isRtl ? <ArrowLeft size={18} color="#FFFFFF" /> : <ArrowRight size={18} color="#FFFFFF" />}
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={[s.footer, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <Text style={[s.footerText, { color: C.muted }]}>
                    {translations.footer?.alreadyHave || 'Already have an account?'}{' '}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate(route.login)}>
                    <Text style={[s.footerLink, { color: C.primary }]}>
                      {translations.footer?.signIn || 'Sign In'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {currentStep === 'verify' && (
              <>
                {/* Verify Step Header with back */}
                <View style={[s.headerSection, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[s.backButton, { backgroundColor: C.surface }]}
                    onPress={() => goToStep('details')}
                    activeOpacity={0.7}
                  >
                    {isRtl ? (
                      <ChevronRight size={22} color={C.text} />
                    ) : (
                      <ChevronLeft size={22} color={C.text} />
                    )}
                  </TouchableOpacity>
                  <View style={[s.titleSection, { marginLeft: isRtl ? 0 : SPACING.md, marginRight: isRtl ? SPACING.md : 0 }]}>
                    <Text style={[s.title, { color: C.text }]}>
                      {translations.verify?.title || 'Verify Email'}
                    </Text>
                    <Text style={[s.subtitle, { color: C.muted }]}>
                      Check your inbox for the code
                    </Text>
                  </View>
                </View>

                {stepIndicator()}

                <View style={[s.formCard, { backgroundColor: C.cardBackground, alignItems: 'center', paddingVertical: 24 }]}>
                  <View style={[s.verifyIconCircle, { backgroundColor: C.primary + '20' }]}>
                    <Mail size={32} color={C.primary} />
                  </View>
                  <Text style={[s.verifySent, { color: C.text }]}>
                    We sent a code to
                  </Text>
                  <Text style={[s.verifyEmail, { color: C.primary }]}>
                    {email}
                  </Text>

                  <View style={s.codeRow}>
                    {verificationCode.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={ref => { codeRefs.current[i] = ref; }}
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

                  <View style={s.resendArea}>
                    {!canResend ? (
                      <Text style={[s.resendTimer, { color: C.primary }]}>
                        {translations.verify?.resendTimerPrefix || 'Resend in'} {formatTime(resendTimer)}
                      </Text>
                    ) : (
                      <TouchableOpacity
                        style={[s.resendRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
                        onPress={handleResendCode}
                        disabled={loading}
                      >
                        <Text style={[s.resendText, { color: C.muted }]}>
                          {translations.verify?.didntReceive || "Didn't receive it?"}{' '}
                        </Text>
                        <Text style={[s.resendAction, { color: C.primary }]}>
                          {translations.verify?.resend || 'Resend'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[s.submitButton, { backgroundColor: C.primary, alignSelf: 'stretch' }, loading && s.buttonDisabled]}
                    onPress={handleVerification}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={s.submitButtonText}>
                          {translations.verify?.button || 'Verify Email'}
                        </Text>
                        {isRtl ? <ArrowLeft size={18} color="#FFFFFF" /> : <ArrowRight size={18} color="#FFFFFF" />}
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.footerLinkOnly}
                    onPress={() => navigation.navigate(route.login)}
                  >
                    <Text style={[s.footerLink, { color: C.primary }]}>
                      {translations.verify?.alreadyVerified || 'Already verified? Sign In'}
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
  root: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 40 },
  scrollContent: { flexGrow: 1, padding: SPACING.lg },
  container: { flex: 1 },

  // Header
  headerSection: { marginBottom: SPACING.md, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  titleSection: { marginBottom: SPACING.xl, flex: 1, marginLeft: SPACING.md },
  title: { fontSize: FONT_SIZES.xxxl + 2, fontWeight: '800', marginBottom: SPACING.xs },
  subtitle: { fontSize: FONT_SIZES.md, lineHeight: 22 },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 40 },
  stepDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  stepLine: { flex: 1, height: 3, borderRadius: 2, marginHorizontal: 8 },

  // Form card
  formCard: { borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg },

  // Sections
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1, marginVertical: 18 },

  // Fields
  nameRow: { flexDirection: 'row', gap: SPACING.sm },
  halfField: { flex: 1 },
  fieldGap: { marginBottom: 12 },
  smallLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: SPACING.xs, textTransform: 'uppercase' },

  // Gender chips
  genderRow: { flexDirection: 'row', gap: 8 },
  genderChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  genderChipText: { fontSize: 13, fontWeight: '700' },

  // Password strength
  strengthRow: { flexDirection: 'row', gap: 4, marginTop: 8, alignItems: 'center' },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', marginLeft: 8 },

  // Password requirements checklist
  reqGrid: { marginTop: 10, gap: 6 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqCheck: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  reqCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  reqLabel: { fontSize: 12, fontWeight: '500' },

  // Password match
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  matchText: { fontSize: FONT_SIZES.sm, fontWeight: '600' },

  // Submit
  submitButton: { height: 54, borderRadius: BORDER_RADIUS.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.sm, marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: FONT_SIZES.md, fontWeight: '700' },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING.lg },
  footerText: { fontSize: FONT_SIZES.sm },
  footerLink: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  footerLinkOnly: { alignSelf: 'center', marginTop: SPACING.lg },

  // Verify step
  verifyIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  verifySent: { fontSize: 14, color: '#888', marginBottom: 4 },
  verifyEmail: { fontSize: 15, fontWeight: '700', marginBottom: 20 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 20, width: '100%' },
  codeBox: { flex: 1, height: 56, borderWidth: 1.5, borderRadius: BORDER_RADIUS.md, fontSize: FONT_SIZES.xxl, fontWeight: '700', textAlign: 'center' },
  resendArea: { marginBottom: 20, minHeight: 24, alignItems: 'center' },
  resendRow: { flexDirection: 'row', alignItems: 'center' },
  resendTimer: { fontSize: FONT_SIZES.sm, fontWeight: '600' },
  resendText: { fontSize: FONT_SIZES.sm },
  resendAction: { fontWeight: '700' },
});
