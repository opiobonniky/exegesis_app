import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getColors } from '../../constants/theme';
import { sendPostRequest } from '../../services/api';
import { AppContext, UserInfo } from '../../common/AppContext';
import { route } from '../../component/navigations/routes';
import { showToast } from '../../helpers/Toash.helper';
import {
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  Check,
  User2,
  X,
} from 'lucide-react-native';
import GoogleIcon from '../../assets/icons/google-icon.svg';

// ─── Password requirement definition ─────────────────────────────────────────
// Try to read requirement labels from translations when available; fallback to English
const getRequirements = (translations?: any) => {
  const labels = (translations &&
    translations.register &&
    (translations.register as any).pwdReqs) || [
    'At least 8 characters',
    'Lowercase letter',
    'Uppercase letter',
    'Number',
    'Special character',
  ];
  return [
    { label: labels[0], test: (p: string) => p.length >= 8 },
    { label: labels[1], test: (p: string) => /[a-z]/.test(p) },
    { label: labels[2], test: (p: string) => /[A-Z]/.test(p) },
    { label: labels[3], test: (p: string) => /[0-9]/.test(p) },
    {
      label: labels[4],
      test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
    },
  ];
};

// ─── Requirement row ──────────────────────────────────────────────────────────
const RequirementRow = ({
  label,
  met,
  colors,
}: {
  label: string;
  met: boolean;
  colors: any;
}) => (
  <View style={s.reqRow}>
    <View
      style={[
        s.reqIcon,
        {
          backgroundColor: met ? colors.success : 'transparent',
          borderColor: met ? colors.success : colors.border,
        },
      ]}
    >
      {met ? (
        <Check size={10} color="#fff" strokeWidth={3} />
      ) : (
        <X size={10} color={colors.muted} strokeWidth={3} />
      )}
    </View>
    <Text style={[s.reqLabel, { color: met ? colors.success : colors.muted }]}>
      {label}
    </Text>
  </View>
);

// ─── Main component ───────────────────────────────────────────────────────────
const GoogleRegister: React.FC = () => {
  const navigation = useNavigation<any>();
  const appContext = useContext(AppContext);

  if (!appContext) return null;

  const { isDark, setUserInfo } = appContext;
  const routes = useRoute();
  const { googleId, email, firstName, lastName, photoUrl }: any =
    routes.params || {};

  const { translations } = useLanguage
    ? useLanguage()
    : ({ translations: undefined } as any);
  const C = getColors(isDark);
  // build localized requirement labels (if available)
  const REQUIREMENTS = getRequirements(translations);

  // ── Animations ───────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const strengthAnim = useRef(new Animated.Value(0)).current;

  // ── State ─────────────────────────────────────────────────────────────────
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const username =
    `${firstName?.toLowerCase() || 'user'}${lastName?.toLowerCase() || ''}`.replace(
      /\s/g,
      '',
    ) || 'google_user';

  const reqResults = REQUIREMENTS.map(r => r.test(password));
  const strength = reqResults.filter(Boolean).length;
  const allReqsMet = strength === REQUIREMENTS.length;
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const getStrengthColor = () => {
    if (strength <= 1) return C.error;
    if (strength <= 3) return '#F59E0B';
    return C.success;
  };

  const getStrengthLabel = () => {
    if (strength === 0) return '';
    if (strength <= 1) return 'Very Weak';
    if (strength === 2) return 'Weak';
    if (strength === 3) return 'Fair';
    if (strength === 4) return 'Good';
    return 'Strong';
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(strengthAnim, {
      toValue: strength,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [strength]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!allReqsMet) {
      showToast('error', 'Password does not meet all requirements');
      return;
    }
    if (!passwordsMatch) {
      showToast(
        'error',
        translations?.passwords?.notMatch || 'Passwords do not match',
      );
      return;
    }

    setLoading(true);
    try {
      const res = await sendPostRequest(
        'auth',
        'complete-google-registration',
        {
          googleId,
          username,
          password,
          firstName: firstName || 'Google',
          lastName: lastName || 'User',
          phoneNumber: '',
          gender: 'Not specified',
          email,
          photoUrl: photoUrl || null,
        },
      );

      const { returnCode, returnMessage, returnData } = res;

      if (returnCode === 200 && returnData?.token) {
        const info: UserInfo = {
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
        showToast('success', 'Welcome! Account created successfully!');
        navigation.replace(route.homeLogin);
      } else {
        showToast('error', returnMessage || 'Registration failed');
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const strengthColor = getStrengthColor();
  const canSubmit = allReqsMet && passwordsMatch && !loading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              s.container,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* ── Avatar ──────────────────────────────────────────────── */}
            <View style={s.avatarWrap}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={s.avatar} />
              ) : (
                <View
                  style={[s.avatarPlaceholder, { backgroundColor: C.primary }]}
                >
                  <Text style={s.avatarInitials}>
                    {firstName?.[0] || 'G'}
                    {lastName?.[0] || 'U'}
                  </Text>
                </View>
              )}
              {/* Google badge */}
              <View
                style={[
                  s.googleBadge,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
              >
                <GoogleIcon width={14} height={14} />
              </View>
            </View>

            {/* ── Header ──────────────────────────────────────────────── */}
            <Text style={[s.welcomeText, { color: C.text }]}>
              {translations?.welcome?.title
                ? `${translations.welcome.title}, ${firstName}!`
                : `Welcome, ${firstName}!`}
            </Text>
            <Text style={[s.subText, { color: C.muted }]}>
              {translations?.register?.googleComplete ||
                'Set a password to complete your account'}
            </Text>

            {/* ── Email card ───────────────────────────────────────────── */}
            <View
              style={[
                s.emailCard,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <GoogleIcon width={16} height={16} />
              <Text style={[s.emailText, { color: C.text }]} numberOfLines={1}>
                {email}
              </Text>
            </View>

            {/* ── Username (read-only info) ────────────────────────────── */}
            <View style={s.field}>
              <Text style={[s.label, { color: C.text }]}>
                {translations?.register?.username || 'Username'}
              </Text>
              <View
                style={[
                  s.inputRow,
                  s.readonlyRow,
                  {
                    borderColor: C.border,
                    backgroundColor: isDark ? C.surface : '#F5F5F5',
                  },
                ]}
              >
                <User2 size={17} color={C.muted} />
                <Text style={[s.readonlyText, { color: C.muted }]}>
                  {username}
                </Text>
              </View>
            </View>

            {/* ── Password ─────────────────────────────────────────────── */}
            <View style={s.field}>
              <Text style={[s.label, { color: C.text }]}>
                {translations?.register?.password || 'Create Password'}
              </Text>
              <View
                style={[
                  s.inputRow,
                  {
                    borderColor: passwordFocused ? C.primary : C.border,
                    backgroundColor: isDark ? C.surface : '#F5F5F5',
                  },
                ]}
              >
                <Lock size={17} color={C.muted} />
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder={
                    translations?.register?.passwordPlaceholder ||
                    'Enter password'
                  }
                  placeholderTextColor={C.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <EyeOff size={17} color={C.muted} />
                  ) : (
                    <Eye size={17} color={C.muted} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Strength bar */}
              {password.length > 0 && (
                <View style={s.strengthWrap}>
                  <View
                    style={[
                      s.strengthTrack,
                      { backgroundColor: isDark ? '#333' : '#E5E5E5' },
                    ]}
                  >
                    <Animated.View
                      style={[
                        s.strengthFill,
                        {
                          backgroundColor: strengthColor,
                          width: strengthAnim.interpolate({
                            inputRange: [0, 1, 2, 3, 4, 5],
                            outputRange: [
                              '0%',
                              '20%',
                              '40%',
                              '60%',
                              '80%',
                              '100%',
                            ],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[s.strengthLabel, { color: strengthColor }]}>
                    {getStrengthLabel()}
                  </Text>
                </View>
              )}

              {/* Single next unmet requirement — shown when focused or has input */}
              {(passwordFocused || password.length > 0) && !allReqsMet && (
                <View
                  style={[
                    s.reqContainer,
                    {
                      backgroundColor: isDark ? C.surface : '#FAFAFA',
                      borderColor: C.border,
                    },
                  ]}
                >
                  {(() => {
                    const nextIndex = reqResults.findIndex(met => !met);
                    if (nextIndex === -1) return null;
                    return (
                      <RequirementRow
                        label={REQUIREMENTS[nextIndex].label}
                        met={false}
                        colors={C}
                      />
                    );
                  })()}
                  <Text style={[s.reqProgress, { color: C.muted }]}>
                    {strength} of {REQUIREMENTS.length} requirements met
                  </Text>
                </View>
              )}
            </View>

            {/* ── Confirm Password ─────────────────────────────────────── */}
            <View style={s.field}>
              <Text style={[s.label, { color: C.text }]}>
                {translations?.register?.confirmPassword || 'Confirm Password'}
              </Text>
              <View
                style={[
                  s.inputRow,
                  {
                    borderColor:
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? C.success
                          : C.error
                        : C.border,
                    backgroundColor: isDark ? C.surface : '#F5F5F5',
                  },
                ]}
              >
                <Lock size={17} color={C.muted} />
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder={
                    translations?.register?.confirmPasswordPlaceholder ||
                    'Confirm password'
                  }
                  placeholderTextColor={C.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showConfirm ? (
                    <EyeOff size={17} color={C.muted} />
                  ) : (
                    <Eye size={17} color={C.muted} />
                  )}
                </TouchableOpacity>
              </View>

              {confirmPassword.length > 0 && (
                <Text
                  style={[
                    s.matchText,
                    { color: passwordsMatch ? C.success : C.error },
                  ]}
                >
                  {passwordsMatch
                    ? translations?.passwords?.match || '✓ Passwords match'
                    : translations?.passwords?.notMatch ||
                      'Passwords do not match'}
                </Text>
              )}
            </View>

            {/* ── Submit ───────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                s.submitBtn,
                { backgroundColor: C.primaryDark },
                !canSubmit && s.btnDisabled,
              ]}
              onPress={handleRegister}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={s.submitText}>
                    {translations?.register?.button || 'Create Account'}
                  </Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* ── Back ─────────────────────────────────────────────────── */}
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={[s.backText, { color: C.muted }]}>
                {translations?.register?.useDifferentAccount ||
                  'Use a different account'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default GoogleRegister;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },

  container: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  // Avatar
  avatarWrap: { marginBottom: 20, position: 'relative' },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#FFFFFF', fontSize: 30, fontWeight: '700' },
  googleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  // Email card
  emailCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  emailText: { fontSize: 14, fontWeight: '500', flex: 1 },

  // Fields
  field: { width: '100%', marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15 },

  // Read-only username row
  readonlyRow: { borderStyle: 'dashed' },
  readonlyText: { flex: 1, fontSize: 15 },

  // Strength bar
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  strengthTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthFill: { height: '100%', borderRadius: 3 },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 65,
    textAlign: 'right',
  },

  // Requirements
  reqContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqLabel: { fontSize: 12, fontWeight: '500' },
  reqProgress: { fontSize: 11, marginTop: 6, textAlign: 'right' },

  // Match text
  matchText: { fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 2 },

  // Submit
  submitBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Back
  backBtn: { marginTop: 18, paddingVertical: 10, paddingHorizontal: 16 },
  backText: { fontSize: 14, fontWeight: '500' },
});
