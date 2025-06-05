import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppColors } from '~/constants/Colors';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  if (isConnected) return null; // Don't show when connected
  
  return (
    <View style={styles.container}>
      <View style={styles.indicator} />
      <Text style={styles.text}>Connecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: AppColors.warningBackground,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.warning,
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    color: AppColors.warning,
    fontWeight: '500',
  },
});