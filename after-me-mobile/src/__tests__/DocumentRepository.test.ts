import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../core/auth/VaultKeyStore', () => ({
  getVaultKey: jest.fn(() => Promise.resolve(Buffer.alloc(32, 0x42))),
}));

jest.mock('../db/migrations', () => ({
  runMigrations: jest.fn(() => Promise.resolve()),
  checkAndRecoverMigrationFailure: jest.fn(() => Promise.resolve()),
}));

jest.mock('../core/crypto/CryptoService', () => ({
  CryptoService: {
    encryptString: jest.fn((val: string) => `enc:${val}`),
    decryptString: jest.fn((val: string) => {
      if (val.startsWith('enc:')) return val.slice(4);
      throw new Error('decrypt failed');
    }),
    generateSecureId: jest.fn((prefix: string) => `${prefix}_mock123`),
  },
}));

jest.mock('../services/SentryService', () => ({
  captureVaultError: jest.fn(),
  traceVaultOperation: jest.fn((_name: string, fn: () => Promise<unknown>) => fn()),
}));

function makeMockDb() {
  return {
    runAsync: jest.fn(() => Promise.resolve()),
    getFirstAsync: jest.fn(() => Promise.resolve(null)) as jest.Mock<Promise<Record<string, unknown> | null>>,
    getAllAsync: jest.fn(() => Promise.resolve([])) as jest.Mock<Promise<Record<string, unknown>[]>>,
    execAsync: jest.fn(() => Promise.resolve()),
    withExclusiveTransactionAsync: jest.fn(
      async (cb: (txn: { runAsync: jest.Mock }) => Promise<void>) => {
        const txn = { runAsync: jest.fn(() => Promise.resolve()) };
        await cb(txn);
        return txn;
      },
    ),
  };
}

function makeDocRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc_abc',
    category: 'identity',
    title: 'enc:My Passport',
    document_date: '2024-01-01',
    expiry_date: '2034-01-01',
    provider_name: 'enc:Gov',
    location_of_original: null,
    file_ref: 'file_001',
    thumbnail_ref: 'thumb_001',
    format: 'jpeg',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

type RepoModule = typeof import('../db/DocumentRepository');

describe('DocumentRepository', () => {
  let mockDb: ReturnType<typeof makeMockDb>;
  let repo: RepoModule;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = makeMockDb();

    jest.resetModules();

    const SQLiteMock = require('expo-sqlite') as { openDatabaseAsync: jest.Mock };
    SQLiteMock.openDatabaseAsync.mockResolvedValue(mockDb);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    repo = require('../db/DocumentRepository') as RepoModule;
  });

  describe('insertDocument', () => {
    it('creates a document with encrypted title and returns decrypted Document', async () => {
      const row = makeDocRow({ id: 'doc_mock123' });
      mockDb.getFirstAsync.mockResolvedValueOnce(row);

      const result = await repo.insertDocument({
        category: 'identity',
        title: 'My Passport',
        fileRef: 'file_001',
        format: 'jpeg',
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO documents'),
        expect.arrayContaining(['doc_mock123', 'identity', 'enc:My Passport']),
      );
      expect(result.id).toBe('doc_mock123');
      expect(result.title).toBe('My Passport');
      expect(result.category).toBe('identity');
    });
  });

  describe('getAllDocuments', () => {
    it('returns all rows mapped through rowToDocument', async () => {
      const rows = [
        makeDocRow({ id: 'doc_1', title: 'enc:Doc One' }),
        makeDocRow({ id: 'doc_2', title: 'enc:Doc Two' }),
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(rows);

      const docs = await repo.getAllDocuments();

      expect(docs).toHaveLength(2);
      expect(docs[0].id).toBe('doc_1');
      expect(docs[0].title).toBe('Doc One');
      expect(docs[1].title).toBe('Doc Two');
    });
  });

  describe('getDocumentById', () => {
    it('returns a document when found', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(makeDocRow());

      const doc = await repo.getDocumentById('doc_abc');

      expect(doc).not.toBeNull();
      expect(doc!.id).toBe('doc_abc');
      expect(doc!.title).toBe('My Passport');
    });

    it('returns null when not found', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      const doc = await repo.getDocumentById('nonexistent');

      expect(doc).toBeNull();
    });
  });

  describe('updateDocument', () => {
    it('builds UPDATE SQL for title only', async () => {
      await repo.updateDocument('doc_abc', { title: 'New Title' });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE documents SET title = ?'),
        expect.arrayContaining(['enc:New Title', 'doc_abc']),
      );
    });

    it('builds UPDATE SQL for multiple fields', async () => {
      await repo.updateDocument('doc_abc', {
        title: 'Updated',
        documentDate: '2025-06-01',
        providerName: 'New Provider',
      });

      expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
      const call = mockDb.runAsync.mock.calls[0] as unknown[];
      const sql = call[0] as string;
      const params = call[1] as unknown[];
      expect(sql).toContain('title = ?');
      expect(sql).toContain('document_date = ?');
      expect(sql).toContain('provider_name = ?');
      expect(params).toContain('enc:Updated');
      expect(params).toContain('2025-06-01');
      expect(params).toContain('enc:New Provider');
    });

    it('does nothing when no fields are provided', async () => {
      await repo.updateDocument('doc_abc', {});

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    it('removes document by ID', async () => {
      await repo.deleteDocument('doc_abc');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM documents WHERE id = ?',
        ['doc_abc'],
      );
    });
  });

  describe('getDocumentCountByCategory', () => {
    it('returns correct counts per category', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([
        { category: 'identity', count: 3 },
        { category: 'legal', count: 1 },
      ]);

      const counts = await repo.getDocumentCountByCategory();

      expect(counts).toEqual({ identity: 3, legal: 1 });
    });
  });

  describe('getAllFileRefs', () => {
    it('returns unique file refs + thumbnail refs', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([
          { file_ref: 'file_1' },
          { file_ref: 'file_2' },
        ])
        .mockResolvedValueOnce([
          { thumbnail_ref: 'thumb_1' },
          { thumbnail_ref: 'file_1' },
        ]);

      const refs = await repo.getAllFileRefs();

      expect(refs).toContain('file_1');
      expect(refs).toContain('file_2');
      expect(refs).toContain('thumb_1');
      expect(new Set(refs).size).toBe(refs.length);
    });
  });

  describe('decryptField regression (Fix 25)', () => {
    it('returns [encrypted] on decryption failure', async () => {
      const row = makeDocRow({ title: 'corrupted-ciphertext' });
      mockDb.getFirstAsync.mockResolvedValueOnce(row);

      const doc = await repo.getDocumentById('doc_abc');

      expect(doc!.title).toBe('[encrypted]');
    });
  });

  describe('getDb shared promise pattern (Fix 43)', () => {
    it('concurrent calls do not open multiple databases', async () => {
      const SQLiteMock = require('expo-sqlite') as { openDatabaseAsync: jest.Mock };

      await Promise.all([
        repo.getAllDocuments(),
        repo.getAllDocuments(),
        repo.getAllDocuments(),
      ]);

      expect(SQLiteMock.openDatabaseAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('migrateDatesToPlaintext', () => {
    it('runs one-time migration and sets AsyncStorage flag', async () => {
      const rows = [
        { id: 'doc_1', document_date: 'enc:2024-01-01', expiry_date: 'enc:2034-01-01' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(rows);

      await repo.migrateDatesToPlaintext();

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE documents SET document_date = ?, expiry_date = ? WHERE id = ?',
        ['2024-01-01', '2034-01-01', 'doc_1'],
      );
      const AS = require('@react-native-async-storage/async-storage').default;
      expect(AS.setItem).toHaveBeenCalledWith(
        'afterme_date_plaintext_migrated',
        'true',
      );
    });

    it('skips if migration was already done', async () => {
      const AS = require('@react-native-async-storage/async-storage').default;
      AS.getItem.mockResolvedValueOnce('true');

      await repo.migrateDatesToPlaintext();

      expect(mockDb.getAllAsync).not.toHaveBeenCalled();
    });
  });

  describe('reEncryptAllMetadata', () => {
    it('uses transaction for re-encryption', async () => {
      const rows = [makeDocRow()];
      mockDb.getAllAsync.mockResolvedValueOnce(rows);

      const oldKey = Buffer.alloc(32, 0x01);
      const newKey = Buffer.alloc(32, 0x02);
      await repo.reEncryptAllMetadata(oldKey, newKey);

      expect(mockDb.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    });
  });
});
