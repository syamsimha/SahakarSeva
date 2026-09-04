import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from '../ui';
import { ServiceCategory, SubService } from '../../types';
import { subServices } from '../../data';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

interface CategoryDetailsModalProps {
  visible: boolean;
  category: ServiceCategory | null;
  onClose: () => void;
  onFindWorkers: (categoryId: string) => void;
  onBookTask?: (categoryId: string, subServiceId: string) => void;
}

export const CategoryDetailsModal: React.FC<CategoryDetailsModalProps> = ({
  visible,
  category,
  onClose,
  onFindWorkers,
  onBookTask,
}) => {
  const { language } = useLanguage();

  if (!category) return null;

  const getLocalizedTitle = () => {
    if (language === 'hi' && category.hindiTitle) return category.hindiTitle;
    if (language === 'te' && category.teluguTitle) return category.teluguTitle;
    return category.title;
  };

  const activeSubServices: SubService[] = subServices.filter(
    (s) => s.categoryId === category.id
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* Drag bar indicator */}
              <View style={styles.dragBar} />

              {/* Modal Header */}
              <View style={styles.headerRow}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name={(category.iconName as any) || 'construct-outline'}
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.title}>{getLocalizedTitle()}</Text>
                  <Text style={styles.subtitle}>{category.description}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close-circle" size={26} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollBody}
              >
                {/* Cooperative Fair Wage Guarantee Strip */}
                <View style={styles.guaranteeBanner}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                  <View style={styles.guaranteeTexts}>
                    <Text style={styles.guaranteeTitle}>Cooperative Fair-Wage Standard</Text>
                    <Text style={styles.guaranteeDesc}>
                      Standardized transparent rates. Includes 5% welfare cess for health & accidental coverage.
                    </Text>
                  </View>
                </View>

                {/* Tariff Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Base Fare Starts At</Text>
                    <Text style={styles.statVal}>₹{category.basePrice}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Active Guild Members</Text>
                    <Text style={styles.statVal}>{category.workersCount} Workers</Text>
                  </View>
                </View>

                {/* Standard Tasks & Rates List */}
                <Text style={styles.sectionHeader}>Standard Tasks & Cooperative Tariffs</Text>
                {activeSubServices.length === 0 ? (
                  <Text style={styles.noTasksText}>Custom task scope evaluated on inspection.</Text>
                ) : (
                  activeSubServices.map((sub) => (
                    <View key={sub.id} style={styles.taskCard}>
                      <View style={styles.taskTopRow}>
                        <Text style={styles.taskTitle}>{sub.title}</Text>
                        <Text style={styles.taskPrice}>₹{sub.standardPrice}</Text>
                      </View>
                      <Text style={styles.taskDesc}>{sub.description}</Text>
                      <View style={styles.taskBottomRow}>
                        <View style={styles.taskMeta}>
                          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                          <Text style={styles.taskMetaText}>Est. {sub.estimatedMinutes} mins</Text>
                        </View>
                        {sub.warrantyDays > 0 && (
                          <View style={styles.taskMeta}>
                            <Ionicons name="ribbon-outline" size={12} color={colors.primary} />
                            <Text style={[styles.taskMetaText, { color: colors.primary, fontWeight: '600' }]}>
                              {sub.warrantyDays} Days Service Warranty
                            </Text>
                          </View>
                        )}
                        {onBookTask && (
                          <TouchableOpacity
                            style={styles.bookTaskBtn}
                            onPress={() => {
                              onClose();
                              onBookTask(category.id, sub.id);
                            }}
                          >
                            <Text style={styles.bookTaskBtnText}>Select Task</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Action Bottom Button */}
              <View style={styles.footerRow}>
                <Button
                  title={`Find ${category.title} Workers`}
                  icon="search"
                  onPress={() => {
                    onClose();
                    onFindWorkers(category.id);
                  }}
                  variant="primary"
                  size="lg"
                  fullWidth
                />
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    paddingBottom: spacing.lg,
  },
  guaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.25)',
  },
  guaranteeTexts: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  guaranteeDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 3,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  noTasksText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginVertical: spacing.md,
  },
  taskCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  taskPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  taskDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  taskBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    flexWrap: 'wrap',
    gap: 6,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskMetaText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  bookTaskBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  bookTaskBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  footerRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
