/**
 * GoogleDriveService — provides file operations on Google Drive's appDataFolder.
 *
 * Uses @react-native-google-signin for authentication and the Google Drive REST API v3
 * for file operations. The appDataFolder is hidden from the user and scoped to this app,
 * mirroring how iCloud Documents works on iOS.
 *
 * Required Google OAuth scope: https://www.googleapis.com/auth/drive.appdata
 */
import { Platform } from 'react-native';
import { captureVaultError } from './SentryService';

let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;
let statusCodes: typeof import('@react-native-google-signin/google-signin').statusCodes | null = null;

try {
  if (Platform.OS === 'android') {
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes;
  }
} catch {
  GoogleSignin = null;
  statusCodes = null;
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

let configured = false;

function configureIfNeeded(): void {
  if (configured || !GoogleSignin) return;
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
    offlineAccess: false,
  });
  configured = true;
}

async function getAccessToken(): Promise<string | null> {
  if (!GoogleSignin) return null;
  try {
    configureIfNeeded();
    const isSignedIn = GoogleSignin.hasPreviousSignIn();
    if (!isSignedIn) {
      await GoogleSignin.signIn();
    } else {
      await GoogleSignin.signInSilently();
    }
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (err: any) {
    if (statusCodes && err?.code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }
    captureVaultError(err, 'GoogleDriveService:getAccessToken');
    return null;
  }
}

async function findFileByName(accessToken: string, fileName: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${fileName}' and trashed=false`);
  const url = `${DRIVE_API}/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export const GoogleDriveService = {
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android' || !GoogleSignin) return false;
    try {
      configureIfNeeded();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      return true;
    } catch {
      return false;
    }
  },

  async isSignedIn(): Promise<boolean> {
    if (!GoogleSignin) return false;
    configureIfNeeded();
    return GoogleSignin.hasPreviousSignIn();
  },

  async signIn(): Promise<boolean> {
    if (!GoogleSignin) return false;
    try {
      configureIfNeeded();
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      return true;
    } catch {
      return false;
    }
  },

  async signOut(): Promise<void> {
    if (!GoogleSignin) return;
    try {
      await GoogleSignin.signOut();
    } catch {}
  },

  /**
   * Write a file to Google Drive's appDataFolder.
   * Creates the file if it doesn't exist, updates it if it does.
   */
  async writeToGoogleDrive(fileName: string, base64Content: string): Promise<boolean> {
    const accessToken = await getAccessToken();
    if (!accessToken) return false;

    try {
      const existingId = await findFileByName(accessToken, fileName);
      const content = Buffer.from(base64Content, 'base64');

      if (existingId) {
        const res = await fetch(`${DRIVE_UPLOAD_API}/files/${existingId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
          },
          body: content.toString('binary'),
        });
        return res.ok;
      } else {
        const metadata = {
          name: fileName,
          parents: ['appDataFolder'],
        };
        const boundary = '----AfterMeBoundary';
        const body =
          `--${boundary}\r\n` +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) + '\r\n' +
          `--${boundary}\r\n` +
          'Content-Type: application/octet-stream\r\n' +
          `Content-Transfer-Encoding: base64\r\n\r\n` +
          base64Content + '\r\n' +
          `--${boundary}--`;

        const res = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        });
        return res.ok;
      }
    } catch (err) {
      captureVaultError(err, 'GoogleDriveService:writeToGoogleDrive');
      return false;
    }
  },

  /**
   * Read a file from Google Drive's appDataFolder.
   * Returns base64-encoded content, or null if file doesn't exist.
   */
  async readFromGoogleDrive(fileName: string): Promise<string | null> {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    try {
      const fileId = await findFileByName(accessToken, fileName);
      if (!fileId) return null;

      const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;

      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1] || '';
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      captureVaultError(err, 'GoogleDriveService:readFromGoogleDrive');
      return null;
    }
  },

  /**
   * Delete a file from Google Drive's appDataFolder.
   */
  async deleteFromGoogleDrive(fileName: string): Promise<boolean> {
    const accessToken = await getAccessToken();
    if (!accessToken) return false;

    try {
      const fileId = await findFileByName(accessToken, fileName);
      if (!fileId) return true;

      const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.ok || res.status === 404;
    } catch (err) {
      captureVaultError(err, 'GoogleDriveService:deleteFromGoogleDrive');
      return false;
    }
  },

  /**
   * List files in Google Drive's appDataFolder.
   */
  async listFiles(): Promise<string[]> {
    const accessToken = await getAccessToken();
    if (!accessToken) return [];

    try {
      const res = await fetch(
        `${DRIVE_API}/files?spaces=appDataFolder&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.files || []).map((f: { name: string }) => f.name);
    } catch {
      return [];
    }
  },
};
