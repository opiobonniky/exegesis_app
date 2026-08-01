import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getUsersByAdmin,
  toggleUserStatusByAdmin,
  toggleUserVerificationByAdmin,
  deleteUserByAdmin,
  updateUserByAdmin,
  SystemUser,
} from '../../services/adminApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTab from '../../component/navigations/BottomTab';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { ChevronLeft, ChevronRight, Edit, User, Mail, Phone, Shield, ToggleLeft, UserPlus } from 'lucide-react-native';
import ActionModal from '../../reusable/ActionModal';
import { showToast } from '../../helpers/Toash.helper';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';

// ─── Dynamic Theme ───────────────────────────────────────────────────────────
const getUsersPageTheme = (isDark: boolean) => {
  const colors = getColors(isDark);
  return {
    bg: colors.background,
    surface: colors.surface,
    cardBackground: colors.cardBackground,
    border: colors.border,
    text: colors.text,
    textSecondary: colors.textSecondary,
    muted: colors.muted,
    primary: colors.primary,
    success: colors.success,
    successLight: `${colors.success}33`,
    error: colors.error,
    inactiveBg: colors.surface,
    inactiveText: colors.muted,
    shadowColor: colors.shadowColor,
  };
};

const AdminUsersPage: React.FC = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const theme = getUsersPageTheme(isDark);
  const styles = getStyles(theme);
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const ac = translations?.admin;

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('adminUsers');
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    severity: 'success' | 'error' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);
  const [togglingUsers, setTogglingUsers] = useState<Set<string>>(new Set());
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUser, setEditUser] = useState<SystemUser | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    maritalStatus: '',
    roleName: '',
    status: true,
  });
  const [saving, setSaving] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const currentUsername = app?.userInfo?.username ?? '';

  const fetchUsers = useCallback(
    async (pg: number = 1, searchTerm: string = '') => {
      try {
        const response = await getUsersByAdmin(searchTerm, pg, 20);
        const processedUsers = response.users.map((u: any) => ({
          ...u,
          roleName: u.userRole === 1 || u.userRole === '1' ? 'admin' : 'Member',
          status: u.status ?? true,
          emailVerified: u.emailVerified ?? false,
        }));
        setUsers(processedUsers);
        setTotalCount(response.totalCount);
        setPage(response.page);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        showToast('error', ac?.failedUpdateStatus || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    },
    [ac],
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers(page, search);
    setRefreshing(false);
  }, [fetchUsers, page, search]);

  const handleSearch = (text: string) => {
    setSearch(text);
    setLoading(true);
    fetchUsers(1, text);
  };

  const handleToggleStatus = async (user: SystemUser) => {
    const username = user.username;
    setTogglingUsers(prev => new Set(prev).add(username));

    try {
      await toggleUserStatusByAdmin(username, !user.status);
      setUsers(prev =>
        prev.map(u =>
          u.username === username ? { ...u, status: !u.status } : u,
        ),
      );
      showToast(
        'success',
        user.status
          ? (ac?.userDeactivated || 'User deactivated successfully')
          : (ac?.userActivated || 'User activated successfully'),
      );
    } catch (error: any) {
      showToast('error', error.message || (ac?.failedUpdateStatus || 'Failed to update user status'));
    } finally {
      setTogglingUsers(prev => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }
  };

  const handleToggleVerify = async (user: SystemUser) => {
    const username = user.username;
    setTogglingUsers(prev => new Set(prev).add(username));

    try {
      await toggleUserVerificationByAdmin(username, !user.emailVerified);
      setUsers(prev =>
        prev.map(u =>
          u.username === username
            ? { ...u, emailVerified: !u.emailVerified }
            : u,
        ),
      );
      showToast(
        'success',
        !user.emailVerified
          ? (ac?.verificationGranted || 'User verification granted successfully')
          : (ac?.verificationRevoked || 'User verification revoked successfully'),
      );
    } catch (error: any) {
      showToast('error', error.message || (ac?.failedUpdateVerification || 'Failed to update verification'));
    } finally {
      setTogglingUsers(prev => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }
  };

  const handleDeleteUser = (user: SystemUser) => {
    if (user.username === currentUsername) {
      showToast('error', ac?.cannotDeleteSelf || "You can't delete your own account.");
      return;
    }

    setConfirmModalData({
      title: ac?.deleteUserTitle || 'Delete User',
      message: (ac?.deleteUserMessage || 'Are you sure you want to delete {name}? This action cannot be undone.').replace('{name}', `${user.firstName} ${user.lastName}`),
      confirmLabel: ac?.deleteLabel || 'Delete',
      cancelLabel: ac?.cancelBtn || 'Cancel',
      severity: 'error',
      onConfirm: async () => {
        setConfirmModalData(null);
        try {
          await deleteUserByAdmin(user.username);
          setUsers(prev => prev.filter(u => u.username !== user.username));
          showToast('success', ac?.userDeleted || 'User deleted successfully');
        } catch (error: any) {
          showToast('error', error.message || (ac?.failedDeleteUser || 'Failed to delete user'));
        }
      },
    });
  };

  const handleEditUser = (user: SystemUser) => {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName || '',
      email: user.email,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      maritalStatus: user.maritalStatus || '',
      roleName: user.roleName,
      status: user.status,
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;

    setSaving(true);
    try {
      await updateUserByAdmin(editUser.username, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        middleName: editForm.middleName,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber,
        gender: editForm.gender,
        maritalStatus: editForm.maritalStatus,
        roleName: editForm.roleName,
        status: editForm.status,
      });

      await fetchUsers();

      setEditModalVisible(false);
      setEditUser(null);
      showToast('success', ac?.userUpdated || 'User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('error', ac?.failedUpdateUser || 'Failed to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const roleColor = (role: string) => {
    if (role === 'admin') return '#7c3aed';
    return theme.primary;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const renderUser = ({ item }: { item: SystemUser }) => (
    <View style={styles.userCard}>
      <View style={[styles.userHeader, isRtl && { flexDirection: 'row-reverse' }]}>
        <View
          style={[styles.avatar, { backgroundColor: roleColor(item.roleName) }]}
        >
          <Text style={styles.avatarText}>
            {getInitials(item.firstName, item.lastName)}
          </Text>
        </View>
        <View style={[styles.userInfo, isRtl && { marginLeft: 0, marginRight: 12 }]}>
          <Text style={[styles.userName, isRtl && { textAlign: 'right' }]}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={[styles.userEmail, isRtl && { textAlign: 'right' }]}>{item.email}</Text>
          <Text style={[styles.userUsername, isRtl && { textAlign: 'right' }]}>@{item.username}</Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: roleColor(item.roleName) + '20' },
          ]}
        >
          <Text
            style={[styles.roleBadgeText, { color: roleColor(item.roleName) }]}
          >
            {item.roleName === 'admin'
              ? (ac?.roleAdmin || 'Admin')
              : (ac?.roleMember || 'Member')}
          </Text>
        </View>
      </View>

      <View style={[styles.userStats, isRtl && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            item.emailVerified ? styles.statusActive : styles.statusInactive,
          ]}
          onPress={() => handleToggleVerify(item)}
          disabled={togglingUsers.has(item.username)}
        >
          {togglingUsers.has(item.username) ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <Text
              style={[
                styles.statusText,
                item.emailVerified
                  ? styles.statusTextActive
                  : styles.statusTextInactive,
              ]}
            >
              {item.emailVerified
                ? `✓ ${ac?.userVerified || 'Verified'}`
                : `○ ${ac?.unverified || 'Unverified'}`}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statusBadge,
            item.status ? styles.statusActive : styles.statusInactive,
          ]}
          onPress={() => handleToggleStatus(item)}
          disabled={togglingUsers.has(item.username)}
        >
          <Text
            style={[
              styles.statusText,
              item.status ? styles.statusTextActive : styles.statusTextInactive,
            ]}
          >
            {item.status
              ? `● ${ac?.active || 'Active'}`
              : `○ ${ac?.userInactive || 'Inactive'}`}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.userActions, isRtl && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditUser(item)}
        >
          <Edit size={16} color={theme.primary} />
          <Text style={[styles.editText, { color: theme.primary }, isRtl && { marginLeft: 0, marginRight: 4 }]}>
            {ac?.editLabel || 'Edit'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteUser(item)}
          disabled={item.username === currentUsername}
        >
          <Text
            style={[
              styles.deleteText,
              item.username === currentUsername && { opacity: 0.5 },
            ]}
          >
            {ac?.deleteLabel || 'Delete'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={[styles.emptyText, isRtl && { textAlign: 'right' }]}>
        {ac?.noUsersFound || 'No users found'}
      </Text>
    </View>
  );

  const userCountText = `${totalCount} ${totalCount !== 1 ? (ac?.totalCountSuffixPlural || 'users') : (ac?.totalCountSuffix || 'user')}`;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      {/* Sticky header group */}
      <View style={[
        styles.stickyHeader,
        isScrolled && styles.stickyHeaderScrolled,
      ]}>
        <View style={styles.header}>
          <View style={[styles.headerTop, isRtl && { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              {isRtl ? (
                <ChevronRight size={20} color={theme.primary} />
              ) : (
                <ChevronLeft size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
            <Text style={[styles.title, isRtl && { textAlign: 'right' }]}>
              {ac?.userManagement || 'User Management'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <Text style={[styles.subtitle, isRtl && { textAlign: 'right' }]}>
            {userCountText}
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, isRtl && { textAlign: 'right' }]}
            placeholder={ac?.searchUsersPlaceholder || 'Search users...'}
            value={search}
            onChangeText={handleSearch}
            placeholderTextColor={theme.muted}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={item => item.id}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
            onScroll={(e) => {
              const offsetY = e.nativeEvent.contentOffset.y;
              setIsScrolled(offsetY > 2);
            }}
            scrollIndicatorInsets={{ top: 0 }}
            scrollEventThrottle={16}
          />
          <View style={styles.bottomPadding} />
          <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />
        </>
      )}

      {/* Edit Modal */}
      <EditUserModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        user={editUser}
        form={editForm}
        setForm={setEditForm}
        onSave={handleSaveEdit}
        saving={saving}
        theme={theme}
        ac={ac}
        isRtl={isRtl}
        disableRoleChange={editUser?.username === currentUsername}
      />
      <ActionModal
        visible={Boolean(confirmModalData)}
        title={confirmModalData?.title ?? ''}
        message={confirmModalData?.message ?? ''}
        confirmLabel={confirmModalData?.confirmLabel}
        cancelLabel={confirmModalData?.cancelLabel}
        severity={confirmModalData?.severity ?? 'error'}
        onConfirm={confirmModalData?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmModalData(null)}
        showCancel={true}
      />
    </SafeAreaView>
  );
};

// ─── Edit Modal ────────────────────────────────────────────────────────────
const EditUserModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  user: SystemUser | null;
  form: typeof editForm;
  setForm: React.Dispatch<React.SetStateAction<typeof editForm>>;
  onSave: () => void;
  saving: boolean;
  theme: ReturnType<typeof getUsersPageTheme>;
  ac: any;
  isRtl: boolean;
  disableRoleChange: boolean;
}> = ({
  visible,
  onClose,
  user,
  form,
  setForm,
  onSave,
  saving,
  theme,
  ac,
  isRtl,
  disableRoleChange = false,
}) => {
  if (!user) return null;
  const roleChangeDisabled = disableRoleChange;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const GENDER_OPTIONS = [
    { value: 'Male', label: ac?.genderMale || 'Male' },
    { value: 'Female', label: ac?.genderFemale || 'Female' },
    { value: 'Other', label: ac?.genderOther || 'Other' },
  ];

  const MARITAL_OPTIONS = [
    { value: 'Single', label: ac?.maritalSingle || 'Single' },
    { value: 'Married', label: ac?.maritalMarried || 'Married' },
    { value: 'Divorced', label: ac?.maritalDivorced || 'Divorced' },
    { value: 'Widowed', label: ac?.maritalWidowed || 'Widowed' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.container, { backgroundColor: theme.surface }]}>
          {/* Header with Avatar */}
          <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
            <View style={[modalStyles.headerContent, isRtl && { flexDirection: 'row-reverse' }]}>
              <View style={[modalStyles.modalAvatar, { backgroundColor: theme.primary }]}>
                <Text style={modalStyles.modalAvatarText}>
                  {getInitials(user.firstName, user.lastName)}
                </Text>
              </View>
              <View style={[modalStyles.headerInfo, isRtl && { marginLeft: 0, marginRight: 14 }]}>
                <Text style={[modalStyles.title, { color: theme.text }, isRtl && { textAlign: 'right' }]}>
                  {ac?.editUserTitle || 'Edit User'}
                </Text>
                <Text style={[modalStyles.subtitle, { color: theme.textSecondary }, isRtl && { textAlign: 'right' }]}>
                  @{user.username}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                <Text style={[modalStyles.closeText, { color: theme.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={modalStyles.scroll} showsVerticalScrollIndicator={false}>
            <View style={modalStyles.form}>
              {/* Personal Information Section */}
              <View style={modalStyles.section}>
                <Text style={[modalStyles.sectionTitle, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                  {ac?.personalInfoSection || 'Personal Information'}
                </Text>

                <View style={modalStyles.inputGroup}>
                  <Text style={[modalStyles.label, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                    {ac?.firstNameField || 'First Name *'}
                  </Text>
                  <View style={[modalStyles.inputContainer, isRtl && { flexDirection: 'row-reverse' }, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <User size={18} color={theme.muted} />
                    <TextInput
                      style={[modalStyles.input, { color: theme.text }, isRtl && { textAlign: 'right' }]}
                      value={form.firstName}
                      onChangeText={text =>
                        setForm(prev => ({ ...prev, firstName: text }))
                      }
                      placeholder={ac?.firstNamePlaceholder || 'Enter first name'}
                      placeholderTextColor={theme.muted}
                    />
                  </View>
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={[modalStyles.label, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                    {ac?.lastNameField || 'Last Name *'}
                  </Text>
                  <View style={[modalStyles.inputContainer, isRtl && { flexDirection: 'row-reverse' }, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <User size={18} color={theme.muted} />
                    <TextInput
                      style={[modalStyles.input, { color: theme.text }, isRtl && { textAlign: 'right' }]}
                      value={form.lastName}
                      onChangeText={text =>
                        setForm(prev => ({ ...prev, lastName: text }))
                      }
                      placeholder={ac?.lastNamePlaceholder || 'Enter last name'}
                      placeholderTextColor={theme.muted}
                    />
                  </View>
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={[modalStyles.label, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                    {ac?.middleNameField || 'Middle Name'}
                  </Text>
                  <View style={[modalStyles.inputContainer, isRtl && { flexDirection: 'row-reverse' }, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <User size={18} color={theme.muted} />
                    <TextInput
                      style={[modalStyles.input, { color: theme.text }, isRtl && { textAlign: 'right' }]}
                      value={form.middleName}
                      onChangeText={text =>
                        setForm(prev => ({ ...prev, middleName: text }))
                      }
                      placeholder={ac?.optionalPlaceholder || 'Optional'}
                      placeholderTextColor={theme.muted}
                    />
                  </View>
                </View>
              </View>

              {/* Contact Information Section */}
              <View style={modalStyles.section}>
                <Text style={[modalStyles.sectionTitle, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                  {ac?.contactInfoSection || 'Contact Information'}
                </Text>

                <View style={modalStyles.inputGroup}>
                  <Text style={[modalStyles.label, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                    {ac?.emailField || 'Email'}
                  </Text>
                  <View style={[modalStyles.readOnlyContainer, isRtl && { flexDirection: 'row-reverse' }, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <Mail size={18} color={theme.muted} />
                    <TextInput
                      style={[modalStyles.readOnlyInput, { color: theme.muted }, isRtl && { textAlign: 'right' }]}
                      value={user.email}
                      editable={false}
                    />
                  </View>
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={[modalStyles.label, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                    {ac?.phoneField || 'Phone Number'}
                  </Text>
                  <View style={[modalStyles.inputContainer, isRtl && { flexDirection: 'row-reverse' }, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <Phone size={18} color={theme.muted} />
                    <TextInput
                      style={[modalStyles.input, { color: theme.text }, isRtl && { textAlign: 'right' }]}
                      value={form.phoneNumber}
                      onChangeText={text =>
                        setForm(prev => ({ ...prev, phoneNumber: text }))
                      }
                      placeholder={ac?.phonePlaceholder || 'Enter phone number'}
                      placeholderTextColor={theme.muted}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>

              {/* Additional Information Section */}
              <View style={modalStyles.section}>
                <Text style={[modalStyles.sectionTitle, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                  {ac?.additionalInfoSection || 'Additional Information'}
                </Text>

                <View style={modalStyles.inputGroup}>
                  <Text style={[modalStyles.label, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                    {ac?.genderField || 'Gender'}
                  </Text>
                  <View style={[modalStyles.genderOptions, isRtl && { flexDirection: 'row-reverse' }]}>
                    {GENDER_OPTIONS.map(({ value, label }) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          modalStyles.genderBtn,
                          { borderColor: theme.border },
                          form.gender === value && {
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                          },
                        ]}
                        onPress={() => setForm(prev => ({ ...prev, gender: value }))}
                      >
                        <Text
                          style={[
                            modalStyles.genderText,
                            { color: theme.text },
                            form.gender === value && { color: '#fff' },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={[modalStyles.label, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                    {ac?.maritalField || 'Marital Status'}
                  </Text>
                  <View style={[modalStyles.genderOptions, isRtl && { flexDirection: 'row-reverse' }]}>
                    {MARITAL_OPTIONS.map(({ value, label }) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          modalStyles.genderBtn,
                          { borderColor: theme.border },
                          form.maritalStatus === value && {
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                          },
                        ]}
                        onPress={() => setForm(prev => ({ ...prev, maritalStatus: value }))}
                      >
                        <Text
                          style={[
                            modalStyles.genderText,
                            { color: theme.text },
                            form.maritalStatus === value && { color: '#fff' },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Role & Status Section */}
              <View style={modalStyles.section}>
                <Text style={[modalStyles.sectionTitle, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                  {ac?.roleStatusSection || 'Role & Status'}
                </Text>

                <View style={modalStyles.inputGroup}>
                  <Text style={[modalStyles.label, { color: theme.textSecondary }, isRtl && { textAlign: 'right', marginLeft: 0, marginRight: 2 }]}>
                    {ac?.roleField || 'Role'} {roleChangeDisabled ? ` ${ac?.cannotChangeOwnRole || '(Cannot change your own role)'}` : ''}
                  </Text>
                  <View style={[modalStyles.roleButtons, isRtl && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity
                      style={[
                        modalStyles.roleBtn,
                        { borderColor: theme.border },
                        roleChangeDisabled && modalStyles.disabledRoleBtn,
                        form.roleName === 'admin' && {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() =>
                        !roleChangeDisabled &&
                        setForm(prev => ({ ...prev, roleName: 'admin' }))
                      }
                      disabled={roleChangeDisabled}
                    >
                      <Shield size={16} color={form.roleName === 'admin' ? '#fff' : theme.text} />
                      <Text
                        style={[
                          modalStyles.roleText,
                          { color: theme.text },
                          form.roleName === 'admin' && { color: '#fff' },
                        ]}
                      >
                        {ac?.roleAdmin || 'Admin'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        modalStyles.roleBtn,
                        { borderColor: theme.border },
                        roleChangeDisabled && modalStyles.disabledRoleBtn,
                        form.roleName === 'Member' && {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() =>
                        !roleChangeDisabled &&
                        setForm(prev => ({ ...prev, roleName: 'Member' }))
                      }
                      disabled={roleChangeDisabled}
                    >
                      <UserPlus size={16} color={form.roleName === 'Member' ? '#fff' : theme.text} />
                      <Text
                        style={[
                          modalStyles.roleText,
                          { color: theme.text },
                          form.roleName === 'Member' && { color: '#fff' },
                        ]}
                      >
                        {ac?.roleMember || 'Member'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[modalStyles.statusRow, isRtl && { flexDirection: 'row-reverse' }, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                  <View style={[modalStyles.statusInfo, isRtl && { flexDirection: 'row-reverse' }]}>
                    <ToggleLeft size={20} color={form.status ? theme.success : theme.muted} />
                    <View>
                      <Text style={[modalStyles.statusLabel, { color: theme.text }, isRtl && { textAlign: 'right' }]}>
                        {ac?.accountStatus || 'Account Status'}
                      </Text>
                      <Text style={[modalStyles.statusSubLabel, { color: form.status ? theme.success : theme.error }, isRtl && { textAlign: 'right' }]}>
                        {form.status
                          ? (ac?.active || 'Active')
                          : (ac?.userInactive || 'Inactive')}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={form.status}
                    onValueChange={value =>
                      setForm(prev => ({ ...prev, status: value }))
                    }
                    trackColor={{
                      false: theme.inactiveBg,
                      true: theme.successLight,
                    }}
                    thumbColor={form.status ? theme.success : theme.inactiveText}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={[modalStyles.footer, isRtl && { flexDirection: 'row-reverse' }, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[
                modalStyles.btn,
                modalStyles.cancelBtn,
                { borderColor: theme.border },
              ]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[modalStyles.btnText, { color: theme.text }]}>
                {ac?.cancelBtn || 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalStyles.btn,
                modalStyles.saveBtn,
                { backgroundColor: theme.primary },
                (saving || !form.firstName.trim() || !form.lastName.trim()) && modalStyles.disabledBtn,
              ]}
              onPress={onSave}
              disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[modalStyles.btnText, { color: '#fff' }]}>
                  {ac?.saveChanges || 'Save Changes'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  scroll: {
    maxHeight: 480,
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    opacity: 0.7,
  },
  readOnlyInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  genderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusSubLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  saveBtn: {},
  disabledBtn: {
    opacity: 0.5,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  disabledRoleBtn: {
    opacity: 0.5,
  },
});

const getStyles = (theme: ReturnType<typeof getUsersPageTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    stickyHeader: {
      backgroundColor: theme.surface,
      borderBottomWidth: 0,
      borderBottomColor: theme.border,
      zIndex: 10,
    },
    stickyHeaderScrolled: {
      borderBottomWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    header: {
      paddingVertical: 12,
      paddingHorizontal: 0,
      backgroundColor: theme.surface,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    backButton: {
      padding: 8,
      borderRadius: 8,
    },
    headerSpacer: {
      width: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      flex: 1,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    searchContainer: {
      paddingVertical: 12,
    },
    searchInput: {
      backgroundColor: theme.surface,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
      marginHorizontal: 16,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    list: {
      paddingHorizontal: 0,
      paddingVertical: 4,
    },
    userCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    userHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    userInfo: {
      flex: 1,
      marginLeft: 12,
    },
    userName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    userEmail: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    userUsername: {
      fontSize: 12,
      color: theme.muted,
    },
    roleBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    userStats: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusActive: {
      backgroundColor: theme.successLight,
    },
    statusInactive: {
      backgroundColor: theme.inactiveBg,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '500',
    },
    statusTextActive: {
      color: theme.success,
    },
    statusTextInactive: {
      color: theme.inactiveText,
    },
    userActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    editText: {
      fontSize: 13,
      fontWeight: '500',
      marginLeft: 4,
    },
    deleteText: {
      color: theme.error,
      fontSize: 13,
      fontWeight: '500',
    },
    empty: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    bottomPadding: {
      height: 80,
    },
  });

export default AdminUsersPage;
