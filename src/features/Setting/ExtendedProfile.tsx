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
import { useLanguage } from '../../component/language-translation/LanguageProvider';
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
  const { language, translations } = useLanguage();
  const isRtl = language === 'ar';

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
      e.alternativePhone = translations?.extendedProfile?.validation?.phoneInvalid || 'Phone number must be 10-15 digits';
    }

    if (emergencyContactPhone && !validatePhone(emergencyContactPhone)) {
      e.emergencyContactPhone = translations?.extendedProfile?.validation?.phoneInvalid || 'Phone number must be 10-15 digits';
    }

    // If emergency contact is provided, require all fields
    if (
      emergencyContactName ||
      emergencyContactPhone ||
      emergencyContactRelationship
    ) {
      if (!emergencyContactName.trim()) {
        e.emergencyContactName = translations?.extendedProfile?.validation?.emergencyNameRequired || 'Emergency contact name is required';
      }
      if (!emergencyContactPhone) {
        e.emergencyContactPhone = translations?.extendedProfile?.validation?.emergencyPhoneRequired || 'Emergency contact phone is required';
      }
      if (!emergencyContactRelationship.trim()) {
        e.emergencyContactRelationship = translations?.extendedProfile?.validation?.relationshipRequired || 'Relationship is required';
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
    { label: translations?.extendedProfile?.relationshipOptions?.spouse || 'Spouse', value: 'Spouse' },
    { label: translations?.extendedProfile?.relationshipOptions?.parent || 'Parent', value: 'Parent' },
    { label: translations?.extendedProfile?.relationshipOptions?.sibling || 'Sibling', value: 'Sibling' },
    { label: translations?.extendedProfile?.relationshipOptions?.child || 'Child', value: 'Child' },
    { label: translations?.extendedProfile?.relationshipOptions?.friend || 'Friend', value: 'Friend' },
    { label: translations?.extendedProfile?.relationshipOptions?.other || 'Other', value: 'Other' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      padding: SPACING.lg,
      paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
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
    heroCardRtl: {
      flexDirection: 'row-reverse',
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
    heroIconRtl: {
      marginRight: 0,
      marginLeft: SPACING.md,
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
    sectionHeaderGradientRtl: {
      flexDirection: 'row-reverse',
    },
    sectionIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    sectionIconWrapperRtl: {
      marginRight: 0,
      marginLeft: SPACING.md,
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
    chipContainerRtl: {
      flexDirection: 'row-reverse',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
    },
    chipRtl: {
      flexDirection: 'row-reverse',
    },
    chipCheck: {
      marginRight: 6,
    },
    chipCheckRtl: {
      marginRight: 0,
      marginLeft: 6,
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
    infoCardRtl: {
      flexDirection: 'row-reverse',
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
    sectionHeaderRtl: {
      flexDirection: 'row-reverse',
    },
    sectionIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    sectionIconContainerRtl: {
      marginRight: 0,
      marginLeft: SPACING.md,
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
      style={[styles.sectionHeaderGradient, isRtl && styles.sectionHeaderGradientRtl]}
    >
      <View
        style={[styles.sectionIconWrapper, isRtl && styles.sectionIconWrapperRtl, { backgroundColor: color + '20' }]}
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
        isRtl && styles.chipRtl,
        {
          backgroundColor: selected ? color + '15' : 'transparent',
          borderColor: selected ? color : '#E5E7EB',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {selected && <Check size={14} color={color} style={[styles.chipCheck, isRtl && styles.chipCheckRtl]} />}
      <Text style={[styles.chipText, { color: selected ? color : '#6B7280' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ActionHeader
        title={translations?.extendedProfile?.title || 'Additional Information'}
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
              title={translations?.extendedProfile?.personalDetails?.title || 'Personal Details'}
              description={translations?.extendedProfile?.personalDetails?.description || 'Additional personal information'}
              color={COLORS.primary}
            />

            <View style={styles.form}>                <InputField
                  label={translations?.extendedProfile?.personalDetails?.fields?.middleName || 'Middle Name'}
                  placeholder={translations?.extendedProfile?.personalDetails?.fields?.middleNamePlaceholder || 'Middle name (optional)'}
                  value={middleName}
                  onChangeText={setMiddleName}
                  leftIcon={<User size={20} color={COLORS.muted} />}
                  isRtl={isRtl}
                />

              <InputField
                label={translations?.extendedProfile?.personalDetails?.fields?.alternativePhone || 'Alternative Phone'}
                placeholder={translations?.extendedProfile?.personalDetails?.fields?.alternativePhonePlaceholder || 'Alternative phone (optional)'}
                value={alternativePhone}
                onChangeText={text => {
                  setAlternativePhone(text);
                  if (errors.alternativePhone)
                    setErrors({ ...errors, alternativePhone: '' });
                }}
                error={errors.alternativePhone}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={COLORS.muted} />}
                isRtl={isRtl}
              />
            </View>
          </View>

          {/* Ministry & Service */}
          <View style={styles.section}>
            <SectionHeader
              icon={<Heart size={22} color="#8B5CF6" />}
              title={translations?.extendedProfile?.ministryService?.title || 'Ministry & Service'}
              description={translations?.extendedProfile?.ministryService?.description || 'Your ministry involvement'}
              color="#8B5CF6"
            />

            <View style={styles.form}>
              <InputField
                label={translations?.extendedProfile?.ministryService?.fields?.ministryGroup || 'Ministry Group'}
                placeholder={translations?.extendedProfile?.ministryService?.fields?.ministryGroupPlaceholder || 'E.g., Youth Ministry, Worship Team'}
                value={ministryGroup}
                onChangeText={setMinistryGroup}
                leftIcon={<Briefcase size={20} color={COLORS.muted} />}
                isRtl={isRtl}
              />

              <InputField
                label={translations?.extendedProfile?.ministryService?.fields?.servicePosition || 'Service Position'}
                placeholder={translations?.extendedProfile?.ministryService?.fields?.servicePositionPlaceholder || 'E.g., Leader, Member, Volunteer'}
                value={servicePosition}
                onChangeText={setServicePosition}
                leftIcon={<Briefcase size={20} color={COLORS.muted} />}
                isRtl={isRtl}
              />

              <View>
                <Text style={[styles.label, { marginLeft: isRtl ? 0 : 2, marginRight: isRtl ? 2 : 0 }]}>
                  {translations?.extendedProfile?.ministryService?.fields?.spiritualGifts || 'Spiritual Gifts'}
                </Text>
                <InputField
                  placeholder={translations?.extendedProfile?.ministryService?.fields?.spiritualGiftsPlaceholder || 'E.g., Teaching, Worship, Administration'}
                  value={spiritualGifts}
                  onChangeText={setSpiritualGifts}
                  leftIcon={<Heart size={20} color={COLORS.muted} />}
                  isRtl={isRtl}
                />
              </View>
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.section}>
            <SectionHeader
              icon={<AlertCircle size={22} color="#EF4444" />}
              title={translations?.extendedProfile?.emergencyContact?.title || 'Emergency Contact'}
              description={translations?.extendedProfile?.emergencyContact?.description || 'Person to contact in case of emergency'}
              color="#EF4444"
            />

            <View style={styles.form}>
              <InputField
                label={translations?.extendedProfile?.emergencyContact?.fields?.contactName || 'Contact Name'}
                placeholder={translations?.extendedProfile?.emergencyContact?.fields?.contactNamePlaceholder || 'Full name'}
                value={emergencyContactName}
                onChangeText={text => {
                  setEmergencyContactName(text);
                  if (errors.emergencyContactName)
                    setErrors({ ...errors, emergencyContactName: '' });
                }}
                error={errors.emergencyContactName}
                leftIcon={<User size={20} color={COLORS.muted} />}
                isRtl={isRtl}
              />

              <InputField
                label={translations?.extendedProfile?.emergencyContact?.fields?.contactPhone || 'Contact Phone'}
                placeholder={translations?.extendedProfile?.emergencyContact?.fields?.contactPhonePlaceholder || 'Phone number'}
                value={emergencyContactPhone}
                onChangeText={text => {
                  setEmergencyContactPhone(text);
                  if (errors.emergencyContactPhone)
                    setErrors({ ...errors, emergencyContactPhone: '' });
                }}
                error={errors.emergencyContactPhone}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={COLORS.muted} />}
                isRtl={isRtl}
              />

              <View style={styles.relationshipContainer}>
                <Text style={styles.label}>{translations?.extendedProfile?.emergencyContact?.fields?.relationship || 'Relationship'}</Text>
                <View style={[styles.chipContainer, isRtl && styles.chipContainerRtl]}>
                  {relationshipOptions.map(option => (
                    <ChipOption
                      key={option.value}
                      label={option.label}
                      selected={emergencyContactRelationship === option.value}
                      onPress={() => {
                        setEmergencyContactRelationship(option.value);
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
              title={loading ? (translations?.extendedProfile?.saving || 'Saving...') : (translations?.extendedProfile?.save || 'Save Changes')}
              onPress={handleSave}
              disabled={loading || !hasChanges}
              loading={loading}
            />
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, isRtl && styles.infoCardRtl]}>
            <AlertCircle size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {translations?.extendedProfile?.info || "All fields are optional. Fill out what's relevant to you."}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAwareness>
    </View>
  );
}
