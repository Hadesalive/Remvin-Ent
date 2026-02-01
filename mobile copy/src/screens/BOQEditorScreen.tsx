import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getThemeColors, spacing, fontSize } from '../lib/theme';

export default function BOQEditorScreen() {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.foreground }]}>
          BOQ Editor (Coming Soon)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  text: {
    fontSize: fontSize.xl,
  },
});
