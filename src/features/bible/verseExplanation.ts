import { StyleSheet } from 'react-native';

export const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    date: {
      textAlign: 'center',
      color: COLORS.primary,
      marginTop: 12,
    },

    reference: {
      textAlign: 'center',
      fontSize: 22,
      fontWeight: '700',
      marginVertical: 12,
      color: COLORS.primary,
    },

    verseCard: {
      backgroundColor: COLORS.primary,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },

    verseText: {
      fontSize: 16,
      fontStyle: 'italic',
      lineHeight: 24,
      color: COLORS.text,
    },

    section: {
      marginBottom: 24,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
      color: COLORS.primary,
    },

    subTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginTop: 10,
      color: COLORS.primary,
    },

    body: {
      fontSize: 15,
      lineHeight: 23,
      color: COLORS.text,
      marginBottom: 8,
    },

    list: {
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 6,
      color: COLORS.text,
    },

    bold: {
      fontWeight: '700',
    },
    topHeader: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 10,
      color: COLORS.text,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 10,
    },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      marginTop: 8,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 999,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
  });
