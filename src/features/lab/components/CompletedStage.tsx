import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  BookMarked,
  CheckCircle2,
  Download,
  Sparkles,
} from 'lucide-react-native';

interface CompletedStageProps {
  styles: any;
  colors: any;
  onViewLegacyLedger: () => void;
  onDownloadEntry: () => void;
  onStartNewStudy: () => void;
}

export default function CompletedStage({
  styles,
  colors,
  onViewLegacyLedger,
  onDownloadEntry,
  onStartNewStudy,
}: CompletedStageProps) {
  return (
    <View style={[styles.stageContainer, styles.completedContainer]}>
      <View style={[styles.completedIcon, { backgroundColor: `${colors.success}20` }]}>
        <CheckCircle2 size={64} color={colors.success} />
      </View>
      <Text style={[styles.completedTitle, { color: colors.text }]}>
        Study Complete!
      </Text>
      <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
        Your exegesis has been saved to the Legacy Ledger. You can view it in
        your journal.
      </Text>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
        onPress={onViewLegacyLedger}
        activeOpacity={0.8}
      >
        <BookMarked size={18} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Open Legacy Ledger</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { borderColor: colors.primary }]}
        onPress={onDownloadEntry}
        activeOpacity={0.7}
      >
        <Download size={16} color={colors.primary} />
        <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
          Download Entry
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.secondaryBtn,
          { borderColor: colors.primary, marginTop: 12 },
        ]}
        onPress={onStartNewStudy}
        activeOpacity={0.7}
      >
        <Sparkles size={16} color={colors.primary} />
        <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
          Start Another Study
        </Text>
      </TouchableOpacity>
    </View>
  );
}
