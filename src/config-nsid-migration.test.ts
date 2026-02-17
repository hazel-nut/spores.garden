import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./at-client', () => ({
  getRecord: vi.fn(),
  listRecords: vi.fn(),
  resolveHandle: vi.fn(),
  parseAtUri: vi.fn(),
  buildAtUri: vi.fn(),
}));

vi.mock('./oauth', () => ({
  createRecord: vi.fn(),
  putRecord: vi.fn(),
  deleteRecord: vi.fn(),
  getCurrentDid: vi.fn(),
  isLoggedIn: vi.fn(),
}));

vi.mock('./themes/engine', () => ({
  generateThemeFromDid: vi.fn(() => ({ theme: {} })),
}));

vi.mock('./themes/fonts', () => ({
  getHeadingFontOption: vi.fn(() => ({ css: '' })),
  getBodyFontOption: vi.fn(() => ({ css: '' })),
}));

vi.mock('./components/recent-gardens', () => ({
  registerGarden: vi.fn(),
}));

import { getRecord, listRecords } from './at-client';
import { putRecord, deleteRecord, getCurrentDid, isLoggedIn } from './oauth';
import { migrateOwnerNsidRecords } from './config';
import { getCollection } from './config/nsid';

type StoredRecord = {
  value: any;
  uri: string;
};

const DID = 'did:plc:testowner';

function key(repo: string, collection: string, rkey: string): string {
  return `${repo}|${collection}|${rkey}`;
}

describe('NSID owner migration', () => {
  const store = new Map<string, StoredRecord>();

  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();

    vi.mocked(isLoggedIn).mockReturnValue(true);
    vi.mocked(getCurrentDid).mockReturnValue(DID);

    vi.mocked(getRecord).mockImplementation(async (repo: string, collection: string, rkey: string) => {
      return store.get(key(repo, collection, rkey)) || null;
    });

    vi.mocked(listRecords).mockImplementation(async (repo: string, collection: string) => {
      const records = Array.from(store.values()).filter((record) => {
        const parts = record.uri.split('/');
        return parts[2] === repo && parts[3] === collection;
      });
      return { records } as any;
    });

    vi.mocked(putRecord).mockImplementation(async (collection: string, rkey: string, value: any) => {
      store.set(key(DID, collection, rkey), {
        value,
        uri: `at://${DID}/${collection}/${rkey}`,
      });
      return { uri: `at://${DID}/${collection}/${rkey}` } as any;
    });

    vi.mocked(deleteRecord).mockImplementation(async (collection: string, rkey: string) => {
      store.delete(key(DID, collection, rkey));
      return {} as any;
    });
  });

  it('does not create records when there is nothing to migrate', async () => {
    await migrateOwnerNsidRecords(DID);

    const newConfigCollection = getCollection('siteConfig', 'new');
    const migratedConfig = store.get(key(DID, newConfigCollection, 'self'));

    expect(migratedConfig).toBeUndefined();
    expect(vi.mocked(putRecord)).not.toHaveBeenCalled();
  });

  it('migrates old records to new namespace and is idempotent', async () => {
    const oldConfigCollection = getCollection('siteConfig', 'old');
    const oldSectionCollection = getCollection('siteSection', 'old');
    const oldContentCollection = getCollection('contentText', 'old');

    store.set(key(DID, oldConfigCollection, 'self'), {
      value: { $type: oldConfigCollection, title: 'My Garden', subtitle: '' },
      uri: `at://${DID}/${oldConfigCollection}/self`,
    });

    store.set(key(DID, oldSectionCollection, 'abc123'), {
      value: {
        $type: oldSectionCollection,
        type: 'content',
        ref: `at://${DID}/${oldContentCollection}/welcome`,
      },
      uri: `at://${DID}/${oldSectionCollection}/abc123`,
    });

    await migrateOwnerNsidRecords(DID);

    const newSectionCollection = getCollection('siteSection', 'new');
    const newContentCollection = getCollection('contentText', 'new');
    const migratedSection = store.get(key(DID, newSectionCollection, 'abc123'));

    expect(migratedSection).toBeTruthy();
    expect(migratedSection?.value?.$type).toBe(newSectionCollection);
    expect(migratedSection?.value?.ref).toBe(`at://${DID}/${newContentCollection}/welcome`);

    const putsAfterFirstRun = vi.mocked(putRecord).mock.calls.length;
    await migrateOwnerNsidRecords(DID);
    const putsAfterSecondRun = vi.mocked(putRecord).mock.calls.length;

    expect(putsAfterSecondRun).toBe(putsAfterFirstRun);
  });
});
