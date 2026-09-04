import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button, Badge } from '../ui';
import { Customer } from '../../types';
import { Ionicons } from '@expo/vector-icons';

type AddressItem = NonNullable<Customer['savedAddresses']>[number];

interface AddressManageModalProps {
  visible: boolean;
  customer: Customer | null;
  onClose: () => void;
  onUpdateAddresses: (addresses: AddressItem[]) => Promise<void>;
}

export const AddressManageModal: React.FC<AddressManageModalProps> = ({
  visible,
  customer,
  onClose,
  onUpdateAddresses,
}) => {
  const addresses: AddressItem[] = customer?.savedAddresses || [];
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('Home');
  const [newAddress, setNewAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddAddress = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Validation Error', 'Please select or enter an address title.');
      return;
    }
    if (!newAddress.trim() || newAddress.trim().length < 10) {
      Alert.alert('Validation Error', 'Please provide a complete street address (min 10 characters).');
      return;
    }

    setSaving(true);
    try {
      const newId = `addr-${Date.now()}`;
      let updatedList = [...addresses];

      if (isDefault || updatedList.length === 0) {
        updatedList = updatedList.map((a) => ({ ...a, isDefault: false }));
      }

      const createdItem: AddressItem = {
        id: newId,
        title: newTitle.trim(),
        address: newAddress.trim(),
        isDefault: isDefault || updatedList.length === 0,
      };

      updatedList.push(createdItem);
      await onUpdateAddresses(updatedList);
      setShowAddForm(false);
      setNewAddress('');
      setNewTitle('Home');
      setIsDefault(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    await onUpdateAddresses(updated);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Address', `Are you sure you want to remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = addresses.filter((a) => a.id !== id);
          if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
            updated[0].isDefault = true;
          }
          await onUpdateAddresses(updated);
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.dragBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Manage Saved Addresses</Text>
              <Text style={styles.subtitle}>Addresses used for fast booking & technician dispatch</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={26} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Address List */}
            {addresses.map((item) => (
              <View key={item.id} style={styles.addressCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Ionicons
                      name={item.title.toLowerCase().includes('home') ? 'home' : 'business'}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.title)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.addressText}>{item.address}</Text>

                {!item.isDefault && (
                  <TouchableOpacity
                    onPress={() => handleSetDefault(item.id)}
                    style={styles.setDefaultBtn}
                  >
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                    <Text style={styles.setDefaultText}>Set as Default Address</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Inline Add Form */}
            {showAddForm ? (
              <View style={styles.addFormCard}>
                <Text style={styles.formTitle}>Add New Address</Text>

                {/* Preset Title Chips */}
                <Text style={styles.label}>Address Label</Text>
                <View style={styles.presetChips}>
                  {['Home', 'Office', 'Clinic', 'Parents', 'Shop'].map((tag) => {
                    const isSelected = newTitle === tag;
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => setNewTitle(tag)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.customTitleInput}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Or custom title (e.g. Vacation Home)"
                />

                <Text style={[styles.label, { marginTop: spacing.sm }]}>Full Street Address</Text>
                <TextInput
                  style={styles.textArea}
                  value={newAddress}
                  onChangeText={setNewAddress}
                  placeholder="Door/Flat number, Building name, Street, Landmark, PIN"
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setIsDefault(!isDefault)}
                >
                  <Ionicons
                    name={isDefault ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.checkboxLabel}>Set as default service address</Text>
                </TouchableOpacity>

                <View style={styles.formActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    size="sm"
                    onPress={() => setShowAddForm(false)}
                    style={{ flex: 1, marginRight: 6 }}
                  />
                  <Button
                    title="Save Address"
                    variant="primary"
                    size="sm"
                    loading={saving}
                    onPress={handleAddAddress}
                    style={{ flex: 1, marginLeft: 6 }}
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addNewCardBtn}
                onPress={() => setShowAddForm(true)}
              >
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <Text style={styles.addNewCardText}>+ Add New Saved Address</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button title="Done" variant="primary" size="md" fullWidth onPress={onClose} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
    padding: 2,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  addressCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  defaultBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  deleteBtn: {
    padding: 4,
  },
  addressText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 17,
  },
  setDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  setDefaultText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
  addNewCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    marginTop: spacing.sm,
  },
  addNewCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },
  addFormCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginTop: spacing.sm,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  presetChips: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
  },
  customTitleInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 38,
    fontSize: 12,
    color: colors.text,
  },
  textArea: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 65,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  checkboxLabel: {
    fontSize: 12,
    color: colors.text,
    marginLeft: 6,
  },
  formActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  footer: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
