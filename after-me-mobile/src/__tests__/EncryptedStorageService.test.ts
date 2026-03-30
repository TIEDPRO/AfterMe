import { EncryptedStorageService } from '../core/storage/EncryptedStorageService';
import { CryptoService } from '../core/crypto/CryptoService';

jest.mock('../core/auth/VaultKeyStore', () => ({
  getVaultKey: jest.fn(() => Promise.resolve(Buffer.alloc(32, 0x42))),
}));

jest.mock('../services/SentryService', () => ({
  captureVaultError: jest.fn(),
  traceVaultOperation: jest.fn((_name: string, fn: () => Promise<unknown>) => fn()),
}));

const mockFileSystem = jest.requireMock('expo-file-system/legacy') as {
  getInfoAsync: jest.Mock;
  makeDirectoryAsync: jest.Mock;
  writeAsStringAsync: jest.Mock;
  readAsStringAsync: jest.Mock;
  deleteAsync: jest.Mock;
  readDirectoryAsync: jest.Mock;
  moveAsync: jest.Mock;
};

describe('EncryptedStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeVault', () => {
    it('creates vault directory if it does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false });
      await EncryptedStorageService.initializeVault();
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('vault/'),
        { intermediates: true },
      );
    });

    it('does not create directory if it already exists', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true });
      await EncryptedStorageService.initializeVault();
      expect(mockFileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    });
  });

  describe('path sanitization (Fix 5 regression test)', () => {
    it('rejects path traversal attempts', async () => {
      await expect(
        EncryptedStorageService.readFile('../../etc/passwd'),
      ).rejects.toThrow();
    });

    it('sanitizes filenames to allow only safe characters', async () => {
      // After sanitization, special chars are removed — the result is still valid
      // The key protection is that directory separators are stripped
      await EncryptedStorageService.deleteFile('safe_file-name.123');
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringMatching(/safe_file-name\.123\.enc$/),
        { idempotent: true },
      );
    });

    it('rejects empty filename', async () => {
      await expect(
        EncryptedStorageService.readFile(''),
      ).rejects.toThrow('Invalid filename');
    });

    it('rejects "." and ".." filenames', async () => {
      await expect(EncryptedStorageService.readFile('.')).rejects.toThrow('Invalid filename');
      await expect(EncryptedStorageService.readFile('..')).rejects.toThrow('Invalid filename');
    });
  });

  describe('saveFile', () => {
    it('encrypts and writes content to .enc file', async () => {
      const content = Buffer.from('test content');
      await EncryptedStorageService.saveFile('doc_abc123', content);
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringMatching(/vault\/doc_abc123\.enc$/),
        expect.any(String),
        expect.objectContaining({ encoding: 'base64' }),
      );
    });
  });

  describe('deleteFile', () => {
    it('deletes the .enc file idempotently', async () => {
      await EncryptedStorageService.deleteFile('doc_abc123');
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringMatching(/vault\/doc_abc123\.enc$/),
        { idempotent: true },
      );
    });
  });

  describe('fileExists', () => {
    it('returns true when file exists', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true });
      const result = await EncryptedStorageService.fileExists('doc_abc');
      expect(result).toBe(true);
    });

    it('returns false when file does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false });
      const result = await EncryptedStorageService.fileExists('doc_abc');
      expect(result).toBe(false);
    });
  });

  describe('getVaultSizeBytes', () => {
    it('sums file sizes in vault directory', async () => {
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true }) // initializeVault
        .mockResolvedValueOnce({ exists: true, size: 1000 })
        .mockResolvedValueOnce({ exists: true, size: 2000 });
      mockFileSystem.readDirectoryAsync.mockResolvedValueOnce(['a.enc', 'b.enc']);

      const size = await EncryptedStorageService.getVaultSizeBytes();
      expect(size).toBe(3000);
    });

    it('returns 0 for empty vault', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true });
      mockFileSystem.readDirectoryAsync.mockResolvedValueOnce([]);
      const size = await EncryptedStorageService.getVaultSizeBytes();
      expect(size).toBe(0);
    });
  });

  describe('cleanupStagedFiles', () => {
    it('deletes only .enc.new files', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true });
      mockFileSystem.readDirectoryAsync.mockResolvedValueOnce([
        'a.enc',
        'a.enc.new',
        'b.enc',
        'b.enc.new',
      ]);

      await EncryptedStorageService.cleanupStagedFiles();
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('a.enc.new'),
        { idempotent: true },
      );
    });
  });

  describe('reEncryptFile', () => {
    it('reads, decrypts with old key, re-encrypts with new key, writes', async () => {
      const oldKey = Buffer.alloc(32, 0x42);
      const newKey = Buffer.alloc(32, 0x43);
      const plaintext = Buffer.from('test content for re-encrypt');
      const encrypted = CryptoService.encrypt(plaintext, oldKey);

      mockFileSystem.readAsStringAsync.mockResolvedValueOnce(encrypted.toString('base64'));

      await EncryptedStorageService.reEncryptFile('doc_reenc', oldKey, newKey);

      expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(
        expect.stringMatching(/vault\/doc_reenc\.enc$/),
        expect.objectContaining({ encoding: 'base64' }),
      );
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringMatching(/vault\/doc_reenc\.enc\.tmp$/),
        expect.any(String),
        expect.objectContaining({ encoding: 'base64' }),
      );
      expect(mockFileSystem.moveAsync).toHaveBeenCalledWith({
        from: expect.stringMatching(/vault\/doc_reenc\.enc\.tmp$/),
        to: expect.stringMatching(/vault\/doc_reenc\.enc$/),
      });

      const writtenBase64 = mockFileSystem.writeAsStringAsync.mock.calls[0][1];
      const decrypted = CryptoService.decrypt(Buffer.from(writtenBase64, 'base64'), newKey);
      expect(decrypted.toString()).toBe('test content for re-encrypt');
    });
  });

  describe('reEncryptFileToStaging', () => {
    it('writes re-encrypted file to .enc.new path', async () => {
      const oldKey = Buffer.alloc(32, 0x42);
      const newKey = Buffer.alloc(32, 0x43);
      const plaintext = Buffer.from('staging content');
      const encrypted = CryptoService.encrypt(plaintext, oldKey);

      mockFileSystem.readAsStringAsync.mockResolvedValueOnce(encrypted.toString('base64'));

      await EncryptedStorageService.reEncryptFileToStaging('doc_stage', oldKey, newKey);

      expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(
        expect.stringMatching(/vault\/doc_stage\.enc$/),
        expect.objectContaining({ encoding: 'base64' }),
      );
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringMatching(/vault\/doc_stage\.enc\.new$/),
        expect.any(String),
        expect.objectContaining({ encoding: 'base64' }),
      );

      const writtenBase64 = mockFileSystem.writeAsStringAsync.mock.calls[0][1];
      const decrypted = CryptoService.decrypt(Buffer.from(writtenBase64, 'base64'), newKey);
      expect(decrypted.toString()).toBe('staging content');
    });
  });

  describe('commitStagedFiles', () => {
    it('deletes old .enc and moves .enc.new to .enc for each ref', async () => {
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true })
        .mockResolvedValueOnce({ exists: true });

      await EncryptedStorageService.commitStagedFiles(['ref_a', 'ref_b']);

      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringMatching(/vault\/ref_a\.enc$/),
        { idempotent: true },
      );
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringMatching(/vault\/ref_b\.enc$/),
        { idempotent: true },
      );

      expect(mockFileSystem.moveAsync).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.moveAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringMatching(/ref_a\.enc\.new$/),
          to: expect.stringMatching(/ref_a\.enc$/),
        }),
      );
    });

    it('skips files whose .enc.new does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false });

      await EncryptedStorageService.commitStagedFiles(['missing_ref']);

      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
      expect(mockFileSystem.moveAsync).not.toHaveBeenCalled();
    });
  });

  describe('validateFileIntegrity', () => {
    it('returns true when readFile succeeds', async () => {
      const key = Buffer.alloc(32, 0x42);
      const encrypted = CryptoService.encrypt(Buffer.from('valid'), key);
      mockFileSystem.readAsStringAsync.mockResolvedValueOnce(encrypted.toString('base64'));

      const result = await EncryptedStorageService.validateFileIntegrity('doc_valid');
      expect(result).toBe(true);
    });

    it('returns false when readFile throws', async () => {
      mockFileSystem.readAsStringAsync.mockRejectedValueOnce(new Error('corrupted'));

      const result = await EncryptedStorageService.validateFileIntegrity('doc_corrupt');
      expect(result).toBe(false);
    });
  });
});
