// ==================== EditProfileScreen.tsx ====================
// Basic Profile Information
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  User,
  Mail,
  Phone,
  ChevronRight,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import {
  BORDER_RADIUS,
  getColors,
  FONT_SIZES,
  SPACING,
} from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import ActionHeader from '../../reusable/ActionHeader';
import { sendPostRequest } from '../../services/api';
import InputField from '../../reusable/InputField';
import DatePickerInput from '../../reusable/DatePickerInput';
import { PrimaryButton } from '../../reusable/PrimaryButton';
import { checkInternetConnection } from '../../utilits/checkInternet';
import KeyboardAwareness from '../../reusable/KeyboardAwareness';
import { route } from '../../component/navigations/routes';
import { showToast } from '../../helpers/Toash.helper';

export default function EditProfileScreen() {
  const app = useContext(AppContext);
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  if (!app || !app.userInfo) return null;

  const { userInfo, isDark, setUserInfo } = app;
  const COLORS = getColors(isDark);

  /* ---------------- State ---------------- */
  const [loading, setLoading] = useState(false);

  // Basic fields
  const [firstName, setFirstName] = useState(userInfo.firstName || '');
  const [lastName, setLastName] = useState(userInfo.lastName || '');
  const [email, setEmail] = useState(userInfo.email || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---------------- Effects ---------------- */
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    loadUserData();
  }, []);

  /* ---------------- Load User Data ---------------- */
  const loadUserData = async () => {
    try {
      const response = await sendPostRequest('auth', 'get-current-user', {});

      if (response.returnCode === 200 && response.returnData) {
        const userData = response.returnData;
        if (userData.phoneNumber) setPhoneNumber(userData.phoneNumber);
        if (userData.dateOfBirth) {
          const date = new Date(userData.dateOfBirth);
          setDateOfBirth(date.toISOString().split('T')[0]);
        }
        if (userData.gender) setGender(userData.gender);
        if (userData.maritalStatus) setMaritalStatus(userData.maritalStatus);
      }
    } catch (error) {
      console.log('Could not load extended user data:', error);
    }
  };

  /* ---------------- Validation ---------------- */
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validatePhone = (val: string) =>
    val === '' || /^[0-9]{10,15}$/.test(val);

  const validateForm = () => {
    const e: Record<string, string> = {};

    if (!firstName.trim()) {
      e.firstName = 'First name is required';
    } else if (firstName.length < 2) {
      e.firstName = 'First name must be at least 2 characters';
    }

    if (!lastName.trim()) {
      e.lastName = 'Last name is required';
    } else if (lastName.length < 2) {
      e.lastName = 'Last name must be at least 2 characters';
    }

    if (!email || !validateEmail(email)) {
      e.email = 'Valid email is required';
    }

    if (phoneNumber && !validatePhone(phoneNumber)) {
      e.phoneNumber = 'Phone number must be 10-15 digits';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---------------- Handle Save ---------------- */
  const handleSave = async () => {
    if (!validateForm()) return;

    if (!(await checkInternetConnection())) {
      showToast(
        'error',
        'No Internet: Please check your internet connection and try again.',
      );
      return;
    }

    try {
      setLoading(true);

      const updateData: any = {};

      if (firstName !== userInfo.firstName) {
        updateData.firstName = firstName.trim();
      }
      if (lastName !== userInfo.lastName) {
        updateData.lastName = lastName.trim();
      }
      if (email !== userInfo.email) {
        updateData.email = email.toLowerCase().trim();
      }
      if (phoneNumber) {
        updateData.phoneNumber = phoneNumber.trim();
      }
      if (dateOfBirth) {
        const date = new Date(dateOfBirth);
        updateData.dateOfBirth = date.getTime();
      }
      if (gender) {
        updateData.gender = gender;
      }
      if (maritalStatus) {
        updateData.maritalStatus = maritalStatus;
      }

      if (Object.keys(updateData).length === 0) {
        showToast('info', 'No Changes: No changes detected to save');
        setLoading(false);
        return;
      }

      const response = await sendPostRequest(
        'auth',
        'update-current-user',
        updateData,
      );

      setLoading(false);

      if (response.returnCode === 200) {
        const updatedUser = {
          ...userInfo,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
        };
        await setUserInfo(updatedUser);

        showToast(
          'success',
          'Profile Updated: ' +
            (response.returnMessage ||
              'Your profile has been updated successfully.'),
        );

        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else if (response.returnCode === 400) {
        showToast(
          'error',
          'Validation Error: ' +
            (response.returnMessage ||
              'Please check your input and try again.'),
        );
      } else {
        showToast(
          'error',
          'Update Failed: ' +
            (response.returnMessage || 'Failed to update profile'),
        );
      }
    } catch (error: any) {
      showToast(
        'error',
        'Error: ' + (error.message || 'An error occurred. Please try again.'),
      );
    } finally {
      setLoading(false);
    }
  };

  

  const genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
  ];

  const maritalStatusOptions = [
    { label: 'Single', value: 'Single' },
    { label: 'Married', value: 'Married' },
    { label: 'Divorced', value: 'Divorced' },
    { label: 'Widowed', value: 'Widowed' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      padding: SPACING.lg,
    },
    photoSection: {
      alignItems: 'center',
      padding: SPACING.xxl,
      borderRadius: BORDER_RADIUS.xxl,
      marginBottom: SPACING.xl,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    photoOrb1: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.07)',
      top: -40,
      right: -30,
    },
    photoOrb2: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(255,255,255,0.05)',
      bottom: -20,
      left: -10,
    },
    avatarWrapper: {
      position: 'relative',
      marginBottom: SPACING.md,
    },
    avatarRing: {
      padding: 3,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.5)',
      borderStyle: 'dashed',
    },
    avatarFallback: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.6)',
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.xxxl,
      fontWeight: '800',
      letterSpacing: 1,
    },
    cameraButton: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: COLORS.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    photoName: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.lg,
      fontWeight: '800',
      letterSpacing: 0.3,
      marginBottom: 4,
    },
    photoHint: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: FONT_SIZES.sm,
      fontWeight: '500',
    },
    moreInfoCard: {
      backgroundColor: COLORS.primary + '15',
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.xl,
      borderWidth: 1,
      borderColor: COLORS.primary + '30',
    },
    moreInfoContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    moreInfoLeft: {
      flex: 1,
      marginRight: SPACING.md,
    },
    moreInfoTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    moreInfoDesc: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      lineHeight: 18,
    },
    moreInfoIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    formCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.xxl,
      padding: SPACING.xl,
      marginBottom: SPACING.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: SPACING.xl,
    },
    form: {
      gap: SPACING.lg,
    },
    row: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    halfInput: {
      flex: 1,
    },
    pickerContainer: {
      marginBottom: SPACING.sm,
    },
    label: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    optionButton: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1.5,
    },
    optionText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
    },
    actionButtons: {
      gap: SPACING.md,
      marginBottom: SPACING.lg,
    },
    cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 50,
      borderRadius: BORDER_RADIUS.md,
      gap: SPACING.sm,
    },
    cancelText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
    },
    infoCard: {
      backgroundColor: COLORS.surface,
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
    },
    infoText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  return (
    <View style={styles.container}>
      <ActionHeader
        title="Edit Profile Information"
        onPress={() => navigation.goBack()}
      />

      <KeyboardAwareness style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {/* ── PROFILE PHOTO SECTION ──────────────────────────────────── */}

            {/* ── EXTENDED INFO LINK ─────────────────────────────────────── */}
            <TouchableOpacity
              style={styles.moreInfoCard}
              onPress={() => navigation.navigate(route.extendedProfile)}
              activeOpacity={0.7}
            >
              <View style={styles.moreInfoContent}>
                <View style={styles.moreInfoLeft}>
                  <Text style={styles.moreInfoTitle}>
                    Additional Information
                  </Text>
                  <Text style={styles.moreInfoDesc}>
                    Ministry, emergency contacts, address & more
                  </Text>
                </View>
                <View style={styles.moreInfoIcon}>
                  <ChevronRight size={20} color={COLORS.primary} />
                </View>
              </View>
            </TouchableOpacity>

            {/* ── BASIC INFO FORM ────────────────────────────────────────── */}
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <View style={styles.form}>
                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <InputField
                      label="First Name"
                      placeholder="First name"
                      value={firstName}
                      onChangeText={text => {
                        setFirstName(text);
                        if (errors.firstName)
                          setErrors({ ...errors, firstName: '' });
                      }}
                      error={errors.firstName}
                      leftIcon={<User size={20} color={COLORS.muted} />}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <InputField
                      label="Last Name"
                      placeholder="Last name"
                      value={lastName}
                      onChangeText={text => {
                        setLastName(text);
                        if (errors.lastName)
                          setErrors({ ...errors, lastName: '' });
                      }}
                      error={errors.lastName}
                      leftIcon={<User size={20} color={COLORS.muted} />}
                    />
                  </View>
                </View>

                <InputField
                  label="Email Address"
                  placeholder="Email"
                  value={email}
                  onChangeText={text => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  error={errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Mail size={20} color={COLORS.muted} />}
                />

                <InputField
                  label="Phone Number"
                  placeholder="Phone (optional)"
                  value={phoneNumber}
                  onChangeText={text => {
                    setPhoneNumber(text);
                    if (errors.phoneNumber)
                      setErrors({ ...errors, phoneNumber: '' });
                  }}
                  error={errors.phoneNumber}
                  keyboardType="phone-pad"
                  leftIcon={<Phone size={20} color={COLORS.muted} />}
                />

                <DatePickerInput
                  label="Date of Birth"
                  placeholder="Select date (optional)"
                  value={dateOfBirth}
                  onChangeDate={setDateOfBirth}
                />

                {/* Gender */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.optionsContainer}>
                    {genderOptions.map(option => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor:
                              gender === option.value
                                ? COLORS.primary
                                : COLORS.surface,
                            borderColor:
                              gender === option.value
                                ? COLORS.primary
                                : COLORS.border,
                          },
                        ]}
                        onPress={() => setGender(option.value)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            {
                              color:
                                gender === option.value
                                  ? COLORS.white
                                  : COLORS.text,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Marital Status */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.label}>Marital Status</Text>
                  <View style={styles.optionsContainer}>
                    {maritalStatusOptions.map(option => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor:
                              maritalStatus === option.value
                                ? COLORS.primary
                                : COLORS.surface,
                            borderColor:
                              maritalStatus === option.value
                                ? COLORS.primary
                                : COLORS.border,
                          },
                        ]}
                        onPress={() => setMaritalStatus(option.value)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            {
                              color:
                                maritalStatus === option.value
                                  ? COLORS.white
                                  : COLORS.text,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* ── ACTION BUTTONS ─────────────────────────────────────────── */}
            <View style={styles.actionButtons}>
              <PrimaryButton
                title={loading ? 'Saving...' : 'Save Changes'}
                onPress={handleSave}
                disabled={loading}
                loading={loading}
              />
            </View>

            {/* Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                💡 Changes to your email may require verification
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAwareness>
    </View>
  );
}
