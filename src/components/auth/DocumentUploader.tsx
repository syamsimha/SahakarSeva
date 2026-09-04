import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, borderRadius } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

export interface AttachedDocument {
  name: string;
  size?: number;
  uri: string;
  mimeType?: string;
}

interface DocumentUploaderProps {
  title: string;
  description?: string;
  required?: boolean;
  value: AttachedDocument | null;
  onChange: (doc: AttachedDocument | null) => void;
  error?: string | null;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  title,
  description,
  required = true,
  value,
  onChange,
  error,
}) => {
  const { t } = useLanguage();
  const [isPicking, setIsPicking] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const handlePickDocument = async () => {
    setPickerError(null);
    setIsPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onChange({
          name: asset.name,
          size: asset.size,
          uri: asset.uri,
          mimeType: asset.mimeType,
        });
      }
    } catch (err: any) {
      console.warn('Document picker error:', err);
      setPickerError('Could not open file picker. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setPickerError(null);
  };

  const activeError = error || pickerError;

  return (
    <View style={styles.wrapper}>
      {/* Title & Required indicator */}
      <View style={styles.titleRow}>
        <Text style={styles.label}>
          {title} {required && <Text style={styles.requiredStar}>*</Text>}
        </Text>
      </View>
      {description && <Text style={styles.description}>{description}</Text>}

      {value ? (
        /* Document Attached State */
        <View style={styles.attachedCard}>
          <View style={styles.docIconBox}>
            <Ionicons
              name={value.name.endsWith('.pdf') ? 'document-text' : 'image'}
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.docDetails}>
            <Text style={styles.fileName} numberOfLines={1}>
              {value.name}
            </Text>
            <View style={styles.metaRow}>
              {value.size ? (
                <Text style={styles.fileSize}>{formatFileSize(value.size)} • </Text>
              ) : null}
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={styles.statusAttached}>{t('doc_attached_ready')}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handlePickDocument}
              disabled={isPicking}
              style={styles.actionBtn}
            >
              <Text style={styles.replaceText}>{t('replace_document')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRemove} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Empty / No Document Attached State */
        <View style={[styles.emptyBox, activeError ? styles.emptyBoxError : null]}>
          <View style={styles.emptyLeft}>
            <Ionicons
              name="document-attach-outline"
              size={22}
              color={activeError ? colors.danger : colors.textSecondary}
            />
            <Text style={[styles.noDocText, activeError ? { color: colors.danger } : null]}>
              {t('no_doc_attached')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handlePickDocument}
            disabled={isPicking}
            style={styles.attachBtn}
          >
            {isPicking ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={15} color={colors.primary} />
                <Text style={styles.attachBtnText}>{t('upload_document')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Validation or Picker Error Message */}
      {activeError && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{activeError}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  requiredStar: {
    color: colors.danger,
    fontWeight: '700',
  },
  description: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 15,
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  emptyBoxError: {
    borderColor: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  emptyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  noDocText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.3)',
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  docIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 122, 95, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  docDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  fileSize: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statusAttached: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    padding: 6,
  },
  replaceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '500',
    flex: 1,
  },
});
