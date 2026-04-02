import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';

const CALENDAR_TITLE = 'Prodvote Plans';

/** Request calendar permissions, returns true if granted */
export async function requestCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Calendar Access',
      'Please enable calendar access in Settings to sync your plans.',
    );
    return false;
  }
  return true;
}

/** Get or create the Prodvote calendar */
async function getOrCreateCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === CALENDAR_TITLE);
  if (existing) return existing.id;

  const defaultCalendarSource =
    Platform.OS === 'ios'
      ? calendars.find((c) => c.source?.name === 'iCloud')?.source ||
        calendars.find((c) => c.source?.isLocalAccount)?.source ||
        calendars[0]?.source
      : { isLocalAccount: true, name: CALENDAR_TITLE, type: Calendar.CalendarType.LOCAL as any };

  if (!defaultCalendarSource) {
    throw new Error('No calendar source available');
  }

  const calendarId = await Calendar.createCalendarAsync({
    title: CALENDAR_TITLE,
    color: '#7c5cfc',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: (defaultCalendarSource as any).id,
    source: defaultCalendarSource as any,
    name: 'prodvotePlans',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
  return calendarId;
}

export interface CalendarEventOptions {
  title: string;
  description: string | null;
  allDay: boolean;
  startDate: Date;
  endDate: Date;
}

/** Add a plan to the device calendar. Returns the event ID. */
export async function addPlanToCalendar(options: CalendarEventOptions): Promise<string | null> {
  try {
    const granted = await requestCalendarPermissions();
    if (!granted) return null;

    const calendarId = await getOrCreateCalendar();

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `📋 ${options.title}`,
      notes: options.description || undefined,
      startDate: options.startDate,
      endDate: options.endDate,
      allDay: options.allDay,
      alarms: [
        { relativeOffset: -1440 }, // 1 day before
        { relativeOffset: -60 },   // 1 hour before
      ],
    });
    return eventId;
  } catch (e: any) {
    console.error('Failed to add calendar event:', e);
    return null;
  }
}

/** Update an existing calendar event */
export async function updateCalendarEvent(
  eventId: string,
  options: CalendarEventOptions,
): Promise<boolean> {
  try {
    const granted = await requestCalendarPermissions();
    if (!granted) return false;

    await Calendar.updateEventAsync(eventId, {
      title: `📋 ${options.title}`,
      notes: options.description || undefined,
      startDate: options.startDate,
      endDate: options.endDate,
      allDay: options.allDay,
    });
    return true;
  } catch (e: any) {
    console.error('Failed to update calendar event:', e);
    return false;
  }
}

/** Remove a calendar event */
export async function removeCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const granted = await requestCalendarPermissions();
    if (!granted) return false;

    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (e: any) {
    console.error('Failed to delete calendar event:', e);
    return false;
  }
}
