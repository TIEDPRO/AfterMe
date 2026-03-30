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
          'Deleting the app removes all local data permanently. If you have a cloud backup or a Personal Recovery Kit, you can restore your vault on a new installation. Without a backup, your data is unrecoverable.',
      },
      {
        question: 'Is my data backed up to any cloud?',
        answer: Platform.OS === 'android'
          ? 'Only if you explicitly enable cloud backup in Settings. When enabled, an encrypted copy of your vault is stored in your personal Google Drive account. The encryption key is stored separately. After Me cannot access your backup.'
          : 'Only if you explicitly enable cloud backup in Settings. When enabled, an encrypted copy of your vault is stored in your personal iCloud Documents container. The encryption key is stored in iCloud Keychain, separate from the data. After Me cannot access your backup.',
      },
    ],
  },
  {
    title: 'Recovery & Backup',
    items: [
      {
        question: 'What if I lose my phone?',
        answer: Platform.OS === 'android'
          ? 'If you enabled cloud backup, install After Me on your new device and your vault will be restored automatically from Google Drive. Alternatively, use your Personal Recovery Kit or Family Kit to restore.'
          : 'If you enabled cloud backup, install After Me on your new device and your vault will be restored automatically via iCloud Keychain + iCloud Documents. Alternatively, use your Personal Recovery Kit or Family Kit to restore.',
      },
      {
        question: 'What is a Personal Recovery Kit?',
        answer:
          'A Personal Recovery Kit is an encrypted vault file paired with a QR Recovery Card. You store the vault file on a USB drive and print the QR card. Both are needed to restore — neither works alone. Create one from Settings > Personal Recovery.',
      },
      {
        question: 'What is a Family Kit?',
        answer:
          'A Family Kit is for your loved ones. It packages an encrypted snapshot of your whole vault (every document in it at the time you generate the kit) plus a QR Key Card you print and give to a trusted person. Categories organise your vault in the app; the kit is one vault snapshot for whoever receives it — not separate hidden vaults per person unless you create new kits over time. You need at least one document before you can generate a kit. Use the Family Kit tab once your vault has documents.',
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
    title: 'The Vault File Format',
    items: [
      {
        question: 'What is the .afterme format?',
        answer:
          'It\'s an open standard — a ZIP file containing an encrypted vault (AES-256-GCM), a key file, a manifest, and a README with recovery instructions. You can always recover your data without the After Me app using freely available tools.',
      },
      {
        question: 'Can someone access my vault file without the QR code?',
        answer:
          'No. The vault file is encrypted with a key derived from the access key (encoded in the QR code). Without the QR code, the file cannot be opened by anyone.',
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
        <Text style={styles.faqQuestion} maxFontSizeMultiplier={3.0}>
          {item.question}
        </Text>
        <Text style={styles.faqChevron}>{expanded ? '▲' : '▼'}</Text>
      </View>
      {expanded && (
        <Text style={styles.faqAnswer} maxFontSizeMultiplier={3.0}>
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
      <Text style={styles.pageTitle} maxFontSizeMultiplier={3.0}>Help & FAQ</Text>
      <Text style={styles.pageSubtitle} maxFontSizeMultiplier={3.0}>
        Everything you need to know about After Me
      </Text>

      {FAQ_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={3.0}>{section.title}</Text>
          {section.items.map((item) => (
            <FaqAccordion key={item.question} item={item} />
          ))}
        </View>
      ))}

      <View style={styles.contactSection}>
        <Text style={styles.contactTitle} maxFontSizeMultiplier={3.0}>
          Still need help?
        </Text>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => Linking.openURL('mailto:support@myafterme.co.uk?subject=After%20Me%20Support')}
          accessibilityRole="button"
          accessibilityLabel="Email support"
        >
          <Text style={styles.contactButtonText} maxFontSizeMultiplier={3.0}>
            Contact Support
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://myafterme.co.uk/privacy')}
          accessibilityRole="link"
          accessibilityLabel="View privacy policy"
        >
          <Text style={styles.linkText} maxFontSizeMultiplier={3.0}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://myafterme.co.uk/terms')}
          accessibilityRole="link"
          accessibilityLabel="View terms of service"
        >
          <Text style={styles.linkText} maxFontSizeMultiplier={3.0}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://myafterme.co.uk/founders')}
          accessibilityRole="link"
          accessibilityLabel="Open For founders page on the website"
        >
          <Text style={styles.linkText} maxFontSizeMultiplier={3.0}>For founders (website)</Text>
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
