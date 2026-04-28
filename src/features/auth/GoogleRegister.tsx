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
import { Eye, EyeOff, Lock, ArrowRight, Check } from 'lucide-react-native';
import GoogleIcon from '../../assets/icons/google-icon.svg';

const GoogleRegister: React.FC = () => {
  const navigation = useNavigation<any>();
  const appContext = useContext(AppContext);

  if (!appContext) {
    return null;
  }

  const { isDark, setUserInfo } = appContext;
  const routes = useRoute();
  const { googleId, email, firstName, lastName, photoUrl }: any =
    routes.params || {};

  console.log('Received Google data:', {
    googleId,
    email,
    firstName,
    lastName,
    photoUrl,
  });
  const C = getColors(isDark);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const strengthAnim = useRef(new Animated.Value(0)).current;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const allReqsMet = strength >= 5;
  const passwordsMatch = password === confirmPassword && password.length > 0;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.timing(strengthAnim, {
      toValue: strength,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [strength]);

  const getStrengthColor = () => {
    if (strength <= 1) return C.error;
    if (strength <= 3) return C.warning;
    return C.success;
  };

  const getStrengthLabel = () => {
    if (strength === 0) return 'Very Weak';
    if (strength === 1) return 'Very Weak';
    if (strength === 2) return 'Weak';
    if (strength === 3) return 'Fair';
    if (strength === 4) return 'Good';
    return 'Strong';
  };

  const validate = () => {
    if (!allReqsMet) {
      showToast('error', 'Password is too weak');
      return false;
    }
    if (!passwordsMatch) {
      showToast('error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await sendPostRequest(
        'auth',
        'complete-google-registration',
        {
          googleId,
          username:
            `${firstName?.toLowerCase() || 'user'}${lastName?.toLowerCase() || ''}`.replace(
              /\s/g,
              '',
            ) || 'google_user',
          password,
          firstName: firstName || 'Google',
          lastName: lastName || 'User',
          phoneNumber: '',
          gender: 'Not specified',
          email: email,
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

  const strengthPercent = (strength / 5) * 100;
  const strengthColor = getStrengthColor();

  return (
    <View
      style={[s.root, { backgroundColor: isDark ? C.background : '#FFFFFF' }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.keyboardView}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[s.container, { opacity: fadeAnim }]}>
            <View style={s.logoWrapper}>
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
            </View>

            <Text style={[s.welcomeText, { color: C.text }]}>
              Welcome, {firstName}!
            </Text>
            <Text style={[s.subText, { color: C.muted }]}>
              Complete registration to continue
            </Text>

            <View style={[s.emailCard, { backgroundColor: C.surface }]}>
              <View style={s.emailRow}>
                <GoogleIcon width={18} height={18} />
                <Text style={[s.emailText, { color: C.text }]}>{email}</Text>
              </View>
            </View>

            <View style={s.inputSection}>
              <Text style={[s.inputLabel, { color: C.text }]}>
                Create Password
              </Text>
              <View style={[s.inputContainer, { borderColor: C.border }]}>
                <Lock size={18} color={C.muted} />
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="Enter password"
                  placeholderTextColor={C.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={C.muted} />
                  ) : (
                    <Eye size={18} color={C.muted} />
                  )}
                </TouchableOpacity>
              </View>

              {password.length > 0 && (
                <View style={s.strengthContainer}>
                  <View style={s.strengthBarBg}>
                    <Animated.View
                      style={[
                        s.strengthBarFill,
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
            </View>

            <View style={s.inputSection}>
              <Text style={[s.inputLabel, { color: C.text }]}>
                Confirm Password
              </Text>
              <View style={[s.inputContainer, { borderColor: C.border }]}>
                <Lock size={18} color={C.muted} />
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="Confirm password"
                  placeholderTextColor={C.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text style={[s.errorText, { color: C.error }]}>
                  Passwords do not match
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                s.submitBtn,
                { backgroundColor: C.primaryDark },
                (!allReqsMet || !passwordsMatch || loading) && s.btnDisabled,
              ]}
              onPress={handleRegister}
              disabled={!allReqsMet || !passwordsMatch || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={s.submitBtnText}>Continue</Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.skipBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={[s.skipText, { color: C.muted }]}>
                Use different account
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  container: { padding: 24, alignItems: 'center' },
  logoWrapper: { marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  emailCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emailText: { fontSize: 15, fontWeight: '500', flex: 1, color: '#000' },
  inputSection: { width: '100%', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
    backgroundColor: '#F5F5F5',
  },
  input: { flex: 1, fontSize: 15, color: '#222' },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  strengthBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
  },
  strengthBarFill: { height: '100%', borderRadius: 3 },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  errorText: { fontSize: 12, marginTop: 6 },
  submitBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  skipBtn: { marginTop: 20, padding: 10 },
  skipText: { fontSize: 14, fontWeight: '500' },
});

export default GoogleRegister;
