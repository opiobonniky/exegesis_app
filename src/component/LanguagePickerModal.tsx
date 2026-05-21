import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useLanguage } from './language-translation/LanguageProvider';
import { AppContext } from '../common/AppContext';
import { getColors } from '../constants/theme';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
};

const LanguagePickerModal = ({ visible, onRequestClose }: Props) => {
  const { language, setLanguage, t } = useLanguage();
  const app = React.useContext(AppContext);
  const isDark = !!(app && (app as any).isDark);
  const C = getColors(isDark);
  const isRtl = language === 'ar';

  const langs = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' },
  ] as const;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <View style={[styles.container, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>{t('profile.menuItems.language') || 'Select language'}</Text>

          {langs.map(l => (
            <TouchableOpacity
              key={l.code}
              style={[
                styles.option,
                language === l.code && { backgroundColor: C.primary + '11' },
                isRtl && { flexDirection: 'row-reverse' },
              ]}
              onPress={() => {
                setLanguage(l.code as any);
                onRequestClose();
              }}
            >
              <Text style={{ color: C.text, fontSize: 16 }}>{l.label}</Text>
              <Text style={{ color: C.muted, marginLeft: 8 }}>{l.code.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.close} onPress={onRequestClose}>
            <X color={C.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: Platform.OS === 'android' ? '86%' : '80%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  close: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
});

export default LanguagePickerModal;
