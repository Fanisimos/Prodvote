import { Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../lib/AuthContext';
import { blockUser } from '../lib/blockUser';

const REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'inappropriate', label: 'Inappropriate Content' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'misinformation', label: 'Misinformation' },
  { key: 'other', label: 'Other' },
];

function notify(title: string, msg: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}

function pickReason(): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      const choice = typeof window !== 'undefined' && window.prompt(
        `Why are you reporting this?\n${REASONS.map((r, i) => `${i + 1}. ${r.label}`).join('\n')}\n\nEnter a number (1-${REASONS.length}):`
      );
      if (!choice) { resolve(null); return; }
      const idx = parseInt(choice, 10) - 1;
      resolve(REASONS[idx]?.key || null);
      return;
    }
    Alert.alert('Report Content', 'Why are you reporting this?', [
      ...REASONS.map(r => ({ text: r.label, onPress: () => resolve(r.key) })),
      { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
    ]);
  });
}

interface ReportOptions {
  contentType: 'feature' | 'comment' | 'user' | 'message';
  contentId: string;
  authorId?: string;  // user who created the content — offered for blocking after report
  authorUsername?: string;
}

export function useReport() {
  const { session } = useAuthContext();

  async function report({ contentType, contentId, authorId, authorUsername }: ReportOptions) {
    if (!session) {
      notify('Sign In Required', 'You need to be signed in to report content.');
      return;
    }

    const reason = await pickReason();
    if (!reason) return;

    const { error } = await supabase.from('content_reports').insert({
      reporter_id: session.user.id,
      content_type: contentType,
      content_id: contentId,
      reason,
    });

    if (error) {
      if (error.code === '23505') {
        notify('Already Reported', 'You have already reported this content. Our team will review it.');
      } else {
        notify('Error', 'Could not submit report. Please try again.');
      }
      return;
    }

    notify('Report Submitted', 'Thank you. Our team will review this content shortly.');

    // Offer to block the user
    if (authorId && authorId !== session.user.id) {
      await blockUser(authorId, authorUsername);
    }
  }

  return { report };
}
