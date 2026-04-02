import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId: string) {
  if (Platform.OS === 'web') return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '598ee5c0-a06a-4788-804e-45f8d2c68331',
    });

    await supabase.from('profiles').update({
      push_token: token.data,
    }).eq('id', userId);

    return token.data;
  } catch (e) {
    console.warn('Push token error:', e);
  }
}

export async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

export async function notifyVoteMilestone(featureTitle: string, votes: number) {
  await sendLocalNotification(
    `🔥 ${votes} votes!`,
    `Your feature "${featureTitle}" just hit ${votes} votes!`
  );
}

export async function notifyFeatureShipped(featureTitle: string) {
  await sendLocalNotification(
    '🎉 Feature shipped!',
    `"${featureTitle}" that you voted for has been shipped!`
  );
}

export async function scheduleDailyRewardReminder() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎁 Daily reward ready!',
      body: 'Spin the fortune wheel to claim your free coins.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
    },
  });
}
