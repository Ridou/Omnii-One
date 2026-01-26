import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'meeting_reminder' | 'workflow_completion';
  meetingId?: string;
  workflowName?: string;
  success?: boolean;
}

export function setupNotificationHandlers(): () => void {
  // Handle notification received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('[Push] Notification received:', notification.request.identifier);
    }
  );

  // Handle user tapping on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as unknown as NotificationData;

      switch (data.type) {
        case 'meeting_reminder':
          if (data.meetingId) {
            // Navigate to calendar/event detail
            router.push('/(tabs)/timeline' as any);
          }
          break;
        case 'workflow_completion':
          // Navigate to workflow status or home
          router.push('/(tabs)/' as any);
          break;
      }
    }
  );

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

// Schedule a meeting reminder notification
export async function scheduleMeetingReminder(
  meetingId: string,
  title: string,
  startsAt: Date,
  reminderMinutes: number = 10
): Promise<string> {
  const triggerTime = new Date(startsAt.getTime() - reminderMinutes * 60 * 1000);

  // Don't schedule if trigger time is in the past
  if (triggerTime.getTime() < Date.now()) {
    console.warn('[Push] Reminder time already passed');
    return '';
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meeting Reminder',
      body: `${title} starts in ${reminderMinutes} minutes`,
      data: { type: 'meeting_reminder', meetingId } as unknown as Record<string, unknown>,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerTime,
      channelId: 'reminders',
    },
  });

  return notificationId;
}

// Send immediate workflow completion notification
export async function notifyWorkflowComplete(
  workflowName: string,
  success: boolean,
  details?: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: success ? 'Workflow Complete' : 'Workflow Failed',
      body: success
        ? `${workflowName} finished successfully`
        : `${workflowName} failed${details ? `: ${details}` : ''}`,
      data: {
        type: 'workflow_completion',
        workflowName,
        success,
      } as unknown as Record<string, unknown>,
    },
    trigger: null, // Immediate
  });
}

// Cancel a scheduled notification
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
