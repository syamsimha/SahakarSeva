import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  const { language, setLanguage, supportedLanguages } = useLanguage();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
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
                <Text style={styles.title}>Select Language / भाषा चुनें</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.list}>
                {supportedLanguages.map((item) => {
                  const isSelected = language === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      activeOpacity={0.7}
                      onPress={() => handleSelect(item.code)}
                      style={[styles.langItem, isSelected && styles.langItemSelected]}
                    >
                      <View style={styles.langTexts}>
                        <Text
                          style={[
                            styles.nativeLabel,
                            isSelected && styles.nativeLabelSelected,
                          ]}
                        >
                          {item.nativeLabel}
                        </Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
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
  closeBtn: {
    padding: 4,
  },
  list: {
    gap: spacing.sm,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  langItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  langTexts: {
    flexDirection: 'column',
  },
  nativeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  nativeLabelSelected: {
    color: colors.primary,
  },
  englishLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
