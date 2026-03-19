import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // Will be auto-filled by EAS
    });
    const token = tokenData.data;

    // Save token to user's profile in Supabase
    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    return token;
  } catch (e) {
    console.log('Error getting push token:', e);
    return null;
  }
}

// Schedule a local notification (e.g., daily reward reminder)
export async function scheduleDailyReminder() {
  if (Platform.OS === 'web') return;

  // Cancel existing reminders first
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule daily reminder at 10am
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Reward Ready! 🎁',
      body: 'Your daily coins are waiting. Keep your streak going!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
    },
  });
}

// Send a local notification immediately (for in-app events)
export async function sendLocalNotification(title: string, body: string) {
  if (Platform.OS === 'web') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // null = send immediately
  });
}
