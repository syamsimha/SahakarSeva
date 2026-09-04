import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { colors, borderRadius, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { Language } from '../../i18n';
import { Ionicons } from '@expo/vector-icons';

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ visible, onClose }) => {
  const { language, setLanguage, supportedLanguages, t } = useLanguage();

  const handleSelect = async (lang: Language, isAvailable: boolean) => {
    if (!isAvailable) return;
    await setLanguage(lang);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Language / भाषा / భాష</Text>
                  <Text style={styles.subtitle}>{t('select_language')}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                <View style={styles.list}>
                  {supportedLanguages.map((item) => {
                    const isSelected = language === item.code;
                    return (
                      <TouchableOpacity
                        key={item.code}
                        activeOpacity={item.isAvailable ? 0.7 : 1}
                        onPress={() => handleSelect(item.code, item.isAvailable)}
                        style={[
                          styles.langItem,
                          isSelected && styles.langItemSelected,
                          !item.isAvailable && styles.langItemDisabled,
                        ]}
                      >
                        <View style={styles.langTexts}>
                          <View style={styles.labelRow}>
                            <Text
                              style={[
                                styles.nativeLabel,
                                isSelected && styles.nativeLabelSelected,
                                !item.isAvailable && styles.nativeLabelDisabled,
                              ]}
                            >
                              {item.nativeLabel}
                            </Text>
                            {!item.isAvailable && (
                              <View style={styles.comingSoonBadge}>
                                <Text style={styles.comingSoonText}>{t('coming_soon')}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.englishLabel}>{item.label}</Text>
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollList: {
    maxHeight: 380,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  langItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  langItemDisabled: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  langTexts: {
    flexDirection: 'column',
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nativeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  nativeLabelSelected: {
    color: colors.primary,
  },
  nativeLabelDisabled: {
    color: colors.textSecondary,
  },
  comingSoonBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  englishLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
