import * as Notifications from 'expo-notifications';

export async function setupNotificationChannels(): Promise<void> {
  // Meeting reminders - high importance
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Meeting Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4F46E5', // Indigo
    sound: 'default',
    description: 'Notifications for upcoming meetings',
  });

  // Workflow updates - default importance
  await Notifications.setNotificationChannelAsync('workflows', {
    name: 'Workflow Updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#10B981', // Emerald
    sound: 'default',
    description: 'Notifications for workflow completions',
  });

  console.log('[Push] Android notification channels configured');
}
