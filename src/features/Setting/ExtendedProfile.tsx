// ==================== ExtendedProfileScreen.tsx ====================
// Ministry, Address, Emergency Contacts & Additional Info
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  MapPin,
  Heart,
  Briefcase,
  Phone,
  User,
  AlertCircle,
  Save,
  X,
  ChevronRight,
  Check,
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
import { PrimaryButton } from '../../reusable/PrimaryButton';
import { checkInternetConnection } from '../../utilits/checkInternet';
import KeyboardAwareness from '../../reusable/KeyboardAwareness';
import { showToast } from '../../helpers/Toash.helper';

export default function ExtendedProfileScreen() {
  const app = useContext(AppContext);
  const navigation = useNavigation<any>();

  if (!app || !app.userInfo) return null;

  const { isDark } = app;
  const COLORS = getColors(isDark);

  /* ---------------- State ---------------- */
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Ministry & Service
  const [ministryGroup, setMinistryGroup] = useState('');
  const [servicePosition, setServicePosition] = useState('');
  const [spiritualGifts, setSpiritualGifts] = useState('');

  // Emergency Contact
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] =
    useState('');

  // Additional Info
  const [middleName, setMiddleName] = useState('');
  const [alternativePhone, setAlternativePhone] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<{
    status: boolean;
    title: string;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    status: false,
    title: '',
    message: '',
    severity: 'info',
  });

  /* ---------------- Effects ---------------- */
  useEffect(() => {
    loadExtendedData();
  }, []);

  useEffect(() => {
    const changed =
      ministryGroup !== '' ||
      servicePosition !== '' ||
      spiritualGifts !== '' ||
      emergencyContactName !== '' ||
      emergencyContactPhone !== '' ||
      emergencyContactRelationship !== '' ||
      middleName !== '' ||
      alternativePhone !== '';

    setHasChanges(changed);
  }, [
    ministryGroup,
    servicePosition,
    spiritualGifts,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelationship,
    middleName,
    alternativePhone,
  ]);

  /* ---------------- Load Extended Data ---------------- */
  const loadExtendedData = async () => {
    try {
      const response = await sendPostRequest('auth', 'get-current-user', {});

      if (response.returnCode === 200 && response.returnData) {
        const userData = response.returnData;
        // Pre-populate fields if data exists
        if (userData.middleName) setMiddleName(userData.middleName);
        if (userData.alternativePhone)
          setAlternativePhone(userData.alternativePhone);
        if (userData.ministryGroup) setMinistryGroup(userData.ministryGroup);
        if (userData.servicePosition)
          setServicePosition(userData.servicePosition);
        if (userData.spiritualGifts) setSpiritualGifts(userData.spiritualGifts);
        if (userData.emergencyContactName)
          setEmergencyContactName(userData.emergencyContactName);
        if (userData.emergencyContactPhone)
          setEmergencyContactPhone(userData.emergencyContactPhone);
        if (userData.emergencyContactRelationship)
          setEmergencyContactRelationship(
            userData.emergencyContactRelationship,
          );
      }
    } catch (error) {
      console.log('Could not load extended data:', error);
      // Non-critical, continue with empty fields
    }
  };

  /* ---------------- Validation ---------------- */
  const validatePhone = (val: string) =>
    val === '' || /^[0-9]{10,15}$/.test(val);

  const validateForm = () => {
    const e: Record<string, string> = {};

    if (alternativePhone && !validatePhone(alternativePhone)) {
      e.alternativePhone = 'Phone number must be 10-15 digits';
    }

    if (emergencyContactPhone && !validatePhone(emergencyContactPhone)) {
      e.emergencyContactPhone = 'Phone number must be 10-15 digits';
    }

    // If emergency contact is provided, require all fields
    if (
      emergencyContactName ||
      emergencyContactPhone ||
      emergencyContactRelationship
    ) {
      if (!emergencyContactName.trim()) {
        e.emergencyContactName = 'Emergency contact name is required';
      }
      if (!emergencyContactPhone) {
        e.emergencyContactPhone = 'Emergency contact phone is required';
      }
      if (!emergencyContactRelationship.trim()) {
        e.emergencyContactRelationship = 'Relationship is required';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---------------- Handle Save ---------------- */
  const handleSave = async () => {
    if (!validateForm()) return;

    if (!(await checkInternetConnection())) {
      setModal({
        status: true,
        title: 'No Internet',
        message: 'Please check your internet connection',
        severity: 'error',
      });
      return;
    }

    try {
      setLoading(true);

      const updateData: any = {};

      if (middleName) updateData.middleName = middleName.trim();
      if (alternativePhone)
        updateData.alternativePhone = alternativePhone.trim();
      if (ministryGroup) updateData.ministryGroup = ministryGroup.trim();
      if (servicePosition) updateData.servicePosition = servicePosition.trim();
      if (spiritualGifts) updateData.spiritualGifts = spiritualGifts.trim();
      if (emergencyContactName)
        updateData.emergencyContactName = emergencyContactName.trim();
      if (emergencyContactPhone)
        updateData.emergencyContactPhone = emergencyContactPhone.trim();
      if (emergencyContactRelationship)
        updateData.emergencyContactRelationship =
          emergencyContactRelationship.trim();

      // Check if there are no changes
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
        showToast(
          'success',
          'Information updated: ' +
            (response.returnMessage || 'Information updated successfully'),
        );

        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else if (response.returnCode === 400) {
        // Handle validation errors from backend
        showToast(
          'warning',
          response.returnMessage || 'Please check your input',
        );
      } else {
        showToast(
          'error',
          response.returnMessage || 'Failed to update information',
        );
      }
    } catch (error: any) {
      setLoading(false);
      showToast(
        'error',
        'An error occurred while updating information,' + error.message,
      );
    }
  };

  const relationshipOptions = [
    'Spouse',
    'Parent',
    'Sibling',
    'Child',
    'Friend',
    'Other',
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      padding: SPACING.lg,
      paddingBottom: SPACING.lg,
    },
    heroCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    heroText: {
      flex: 1,
    },
    heroTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: 4,
    },
    heroSubtitle: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      lineHeight: 20,
    },
    section: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.xl,
      marginBottom: SPACING.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    sectionHeaderGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    sectionIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    sectionTextWrapper: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
    },
    sectionDescription: {
      fontSize: FONT_SIZES.sm,
      marginTop: 2,
    },
    sectionBody: {
      padding: SPACING.lg,
    },
    form: {
      gap: SPACING.lg,
      padding: SPACING.lg,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
      paddingTop: SPACING.md,
    },
    label: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
    },
    chipCheck: {
      marginRight: 6,
    },
    chipText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
    },
    actionButtons: {
      gap: SPACING.md,
      marginTop: SPACING.md,
      marginBottom: SPACING.lg,
      paddingBottom: SPACING.xl,
    },
    infoCard: {
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.md,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: COLORS.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoText: {
      flex: 1,
      fontSize: FONT_SIZES.sm,
      color: isDark ? '#94A3B8' : '#64748B',
      lineHeight: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    sectionIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    relationshipContainer: {
      marginTop: SPACING.sm,
    },
    relationshipOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    relationshipOption: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
    },
    relationshipText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
    },
  });

  const s = styles;

  const SectionHeader = ({
    icon,
    title,
    description,
    color,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
  }) => (
    <LinearGradient
      colors={[color + '15', color + '08']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.sectionHeaderGradient}
    >
      <View
        style={[styles.sectionIconWrapper, { backgroundColor: color + '20' }]}
      >
        {icon}
      </View>
      <View style={styles.sectionTextWrapper}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
    </LinearGradient>
  );

  const ChipOption = ({
    label,
    selected,
    onPress,
    color,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
    color: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected ? color + '15' : 'transparent',
          borderColor: selected ? color : '#E5E7EB',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {selected && <Check size={14} color={color} style={styles.chipCheck} />}
      <Text style={[styles.chipText, { color: selected ? color : '#6B7280' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ActionHeader
        title="Additional Information"
        onPress={() => navigation.goBack()}
      />

      <KeyboardAwareness>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Additional Personal Info */}
          <View style={styles.section}>
            <SectionHeader
              icon={<User size={22} color={COLORS.primary} />}
              title="Personal Details"
              description="Additional personal information"
              color={COLORS.primary}
            />

            <View style={styles.form}>
              <InputField
                label="Middle Name"
                placeholder="Middle name (optional)"
                value={middleName}
                onChangeText={setMiddleName}
                leftIcon={<User size={20} color={COLORS.muted} />}
              />

              <InputField
                label="Alternative Phone"
                placeholder="Alternative phone (optional)"
                value={alternativePhone}
                onChangeText={text => {
                  setAlternativePhone(text);
                  if (errors.alternativePhone)
                    setErrors({ ...errors, alternativePhone: '' });
                }}
                error={errors.alternativePhone}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={COLORS.muted} />}
              />
            </View>
          </View>

          {/* Ministry & Service */}
          <View style={styles.section}>
            <SectionHeader
              icon={<Heart size={22} color="#8B5CF6" />}
              title="Ministry & Service"
              description="Your ministry involvement"
              color="#8B5CF6"
            />

            <View style={styles.form}>
              <InputField
                label="Ministry Group"
                placeholder="E.g., Youth Ministry, Worship Team"
                value={ministryGroup}
                onChangeText={setMinistryGroup}
                leftIcon={<Briefcase size={20} color={COLORS.muted} />}
              />

              <InputField
                label="Service Position"
                placeholder="E.g., Leader, Member, Volunteer"
                value={servicePosition}
                onChangeText={setServicePosition}
                leftIcon={<Briefcase size={20} color={COLORS.muted} />}
              />

              <View>
                <Text style={[styles.label, { marginLeft: 2 }]}>
                  Spiritual Gifts
                </Text>
                <InputField
                  placeholder="E.g., Teaching, Worship, Administration"
                  value={spiritualGifts}
                  onChangeText={setSpiritualGifts}
                  leftIcon={<Heart size={20} color={COLORS.muted} />}
                />
              </View>
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.section}>
            <SectionHeader
              icon={<AlertCircle size={22} color="#EF4444" />}
              title="Emergency Contact"
              description="Person to contact in case of emergency"
              color="#EF4444"
            />

            <View style={styles.form}>
              <InputField
                label="Contact Name"
                placeholder="Full name"
                value={emergencyContactName}
                onChangeText={text => {
                  setEmergencyContactName(text);
                  if (errors.emergencyContactName)
                    setErrors({ ...errors, emergencyContactName: '' });
                }}
                error={errors.emergencyContactName}
                leftIcon={<User size={20} color={COLORS.muted} />}
              />

              <InputField
                label="Contact Phone"
                placeholder="Phone number"
                value={emergencyContactPhone}
                onChangeText={text => {
                  setEmergencyContactPhone(text);
                  if (errors.emergencyContactPhone)
                    setErrors({ ...errors, emergencyContactPhone: '' });
                }}
                error={errors.emergencyContactPhone}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={COLORS.muted} />}
              />

              <View style={styles.relationshipContainer}>
                <Text style={styles.label}>Relationship</Text>
                <View style={styles.chipContainer}>
                  {relationshipOptions.map(option => (
                    <ChipOption
                      key={option}
                      label={option}
                      selected={emergencyContactRelationship === option}
                      onPress={() => {
                        setEmergencyContactRelationship(option);
                        if (errors.emergencyContactRelationship)
                          setErrors({
                            ...errors,
                            emergencyContactRelationship: '',
                          });
                      }}
                      color={COLORS.primary}
                    />
                  ))}
                </View>
                {errors.emergencyContactRelationship && (
                  <Text
                    style={{
                      color: COLORS.error,
                      marginTop: 4,
                      fontSize: 12,
                    }}
                  >
                    {errors.emergencyContactRelationship}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <PrimaryButton
              title={loading ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={loading || !hasChanges}
              loading={loading}
            />
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <AlertCircle size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              All fields are optional. Fill out what's relevant to you.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAwareness>
    </View>
  );
}
