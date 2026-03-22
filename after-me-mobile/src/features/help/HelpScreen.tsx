/**
 * Help & FAQ screen — answers common user questions about vault security,
 * data handling, recovery procedures, and app functionality.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_SECTIONS: { title: string; items: FaqItem[] }[] = [
  {
    title: 'Security & Privacy',
    items: [
      {
        question: 'How is my data encrypted?',
        answer:
          'All documents are encrypted with AES-256-GCM, the same standard used by governments and financial institutions. Your encryption key never leaves your device and is protected by the Secure Enclave (iOS) or Android Keystore.',
      },
      {
        question: 'Can After Me see my documents?',
        answer:
          'No. After Me uses zero-knowledge architecture. Your documents are encrypted on your device with a key only you control. We have no ability to access, view, or decrypt your data.',
      },
      {
        question: 'What happens to my data if I delete the app?',
        answer:
          'Deleting the app removes all local data permanently. If you have an iCloud backup or a Personal Recovery Kit, you can restore your vault on a new installation. Without a backup, your data is unrecoverable.',
      },
      {
        question: 'Is my data backed up to any cloud?',
        answer: Platform.OS === 'android'
          ? 'No automatic cloud backup exists on Android. Your vault lives on your device. To protect against device loss, create a Personal Recovery Kit (encrypted .afterme file + printed QR card) or a Family Kit. Both work on any device — no cloud account required.'
          : 'Only if you explicitly enable iCloud backup in Settings. When enabled, an encrypted copy of your vault is stored in your personal iCloud Documents container. The encryption key is stored in iCloud Keychain, separate from the data.',
      },
    ],
  },
  {
    title: 'Recovery & Backup',
    items: [
      {
        question: 'What if I lose my phone?',
        answer: Platform.OS === 'android'
          ? 'Use your Personal Recovery Kit or Family Kit to restore your vault on a new device. Your encrypted .afterme file and QR Recovery Card are all you need — no cloud account required. This is why keeping a printed kit somewhere safe matters.'
          : 'If you enabled iCloud backup, install After Me on your new device and your vault will be restored automatically via iCloud Keychain + iCloud Documents. Alternatively, use your Personal Recovery Kit or Family Kit to restore.',
      },
      {
        question: 'What is a Personal Recovery Kit?',
        answer:
          'A Personal Recovery Kit is an encrypted .afterme file paired with a QR Recovery Card. You store the file on a USB drive and print the QR card. Both are needed to restore — neither works alone. Create one from Settings > Personal Recovery.',
      },
      {
        question: 'What is a Family Kit?',
        answer:
          'A Family Kit is designed for your loved ones. It contains an encrypted copy of your vault and a QR Key Card you print and give to a trusted person. To generate a kit, you must have at least one document in your vault — the kit is an encrypted snapshot of what you have stored. Go to the Family Kit tab once your vault has documents to create one.',
      },
      {
        question: 'How often should I update my recovery kits?',
        answer:
          'Whenever you add or remove documents from your vault. The app will show a warning when your kits become stale (out of sync with your current vault contents).',
      },
    ],
  },
  {
    title: 'Documents & Vault',
    items: [
      {
        question: 'What types of documents can I store?',
        answer:
          'After Me supports JPEG, PNG, and PDF files. You can scan physical documents using your camera, import from your photo library, or select files from your device.',
      },
      {
        question: 'Is there a storage limit?',
        answer:
          'The free tier allows up to 5 documents. Premium users can store up to 500 MB of encrypted data. Storage usage is shown in Settings > Vault Information.',
      },
      {
        question: 'Can I organise my documents?',
        answer:
          'Yes. Documents are organised into 8 categories: Identity, Financial, Property, Insurance, Medical, Legal, Digital, and Personal. Each category has suggested document templates to help you build a complete vault.',
      },
      {
        question: 'What happens to documents when I switch vaults?',
        answer:
          'Each vault is independent with its own encryption key and storage. Switching vaults does not affect documents in other vaults. You can have up to 5 vaults.',
      },
    ],
  },
  {
    title: 'Account & Subscription',
    items: [
      {
        question: 'What do I get with Premium?',
        answer:
          'Premium removes the 5-document free tier limit (unlimited storage up to 500 MB), unlocks Family Kit creation, enables multiple vaults, and provides priority support. Choose between an annual plan (£34.99/year) or a lifetime purchase (£79.99, pay once, never again). Lifetime users have no renewal risk — their family is never left managing a subscription.',
      },
      {
        question: 'What is the difference between annual and lifetime?',
        answer:
          'Annual (£34.99/year) is the entry point — all premium features, cancel any time. Lifetime (£79.99 once) gives you permanent access with no future payments. The annual plan pays for itself in under 2.5 years. Lifetime subscribers also avoid any renewal complications for their family after they are gone. You can upgrade from annual to lifetime at any time in Settings > Subscription.',
      },
      {
        question: 'How do I restore my purchase?',
        answer:
          'Go to Settings > Subscription and tap "Restore Purchases". This will check your Apple ID or Google Play account for any existing purchases.',
      },
      {
        question: 'Can I cancel my subscription?',
        answer:
          'Yes. Manage your subscription through your device\'s App Store or Google Play settings. You\'ll retain premium access until the end of your billing period.',
      },
    ],
  },
  {
    title: 'The .afterme Format',
    items: [
      {
        question: 'What is the .afterme format?',
        answer:
          'It\'s an open standard — a ZIP file containing an encrypted vault (AES-256-GCM), a key file, a manifest, and a README with recovery instructions. You can always recover your data without the After Me app using freely available tools.',
      },
      {
        question: 'Can someone access my .afterme file without the QR code?',
        answer:
          'No. The .afterme file is encrypted with a key derived from the access key (encoded in the QR code) using PBKDF2-HMAC-SHA256 with 600,000 iterations. Without the access key, the file is cryptographically unreadable.',
      },
    ],
  },
];

function FaqAccordion({ item }: { item: FaqItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={item.question}
      accessibilityState={{ expanded }}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion} maxFontSizeMultiplier={1.4}>
          {item.question}
        </Text>
        <Text style={styles.faqChevron}>{expanded ? '▲' : '▼'}</Text>
      </View>
      {expanded && (
        <Text style={styles.faqAnswer} maxFontSizeMultiplier={1.4}>
          {item.answer}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function HelpScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle} maxFontSizeMultiplier={1.4}>Help & FAQ</Text>
      <Text style={styles.pageSubtitle} maxFontSizeMultiplier={1.4}>
        Everything you need to know about After Me
      </Text>

      {FAQ_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>{section.title}</Text>
          {section.items.map((item) => (
            <FaqAccordion key={item.question} item={item} />
          ))}
        </View>
      ))}

      <View style={styles.contactSection}>
        <Text style={styles.contactTitle} maxFontSizeMultiplier={1.4}>
          Still need help?
        </Text>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => Linking.openURL('mailto:support@myafterme.co.uk?subject=After%20Me%20Support')}
          accessibilityRole="button"
          accessibilityLabel="Email support"
        >
          <Text style={styles.contactButtonText} maxFontSizeMultiplier={1.4}>
            Contact Support
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://myafterme.co.uk/privacy')}
          accessibilityRole="link"
          accessibilityLabel="View privacy policy"
        >
          <Text style={styles.linkText} maxFontSizeMultiplier={1.4}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://myafterme.co.uk/terms')}
          accessibilityRole="link"
          accessibilityLabel="View terms of service"
        >
          <Text style={styles.linkText} maxFontSizeMultiplier={1.4}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  content: {
    padding: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.amWhite,
    fontFamily: SERIF_FONT,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.amAmber,
    marginBottom: 12,
    fontFamily: SERIF_FONT,
  },
  faqItem: {
    backgroundColor: colors.amCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.amWhite,
    flex: 1,
    paddingRight: 12,
  },
  faqChevron: {
    fontSize: 12,
    color: colors.textMuted,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    lineHeight: 21,
  },
  contactSection: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: colors.amAmber,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 20,
    minHeight: 48,
    justifyContent: 'center',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.amBackground,
  },
  linkButton: {
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 15,
    color: colors.amAmber,
    textDecorationLine: 'underline',
  },
});
