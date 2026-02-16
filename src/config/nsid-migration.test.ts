import { beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateOwnerNsidRecordsImpl } from './nsid-migration';

type CollectionSet = {
  CONFIG_COLLECTION: string;
  SECTION_COLLECTION: string;
  LAYOUT_COLLECTION: string;
  SPECIAL_SPORE_COLLECTION: string;
  PROFILE_COLLECTION: string;
  CONTENT_TEXT_COLLECTION: string;
};

const DID = 'did:plc:testowner';

const OLD: CollectionSet = {
  CONFIG_COLLECTION: 'garden.spores.site.config',
  SECTION_COLLECTION: 'garden.spores.site.section',
  LAYOUT_COLLECTION: 'garden.spores.site.layout',
  SPECIAL_SPORE_COLLECTION: 'garden.spores.item.specialSpore',
  PROFILE_COLLECTION: 'garden.spores.site.profile',
  CONTENT_TEXT_COLLECTION: 'garden.spores.content.text',
};

const NEW: CollectionSet = {
  CONFIG_COLLECTION: 'coop.hypha.spores.site.config',
  SECTION_COLLECTION: 'coop.hypha.spores.site.section',
  LAYOUT_COLLECTION: 'coop.hypha.spores.site.layout',
  SPECIAL_SPORE_COLLECTION: 'coop.hypha.spores.item.specialSpore',
  PROFILE_COLLECTION: 'coop.hypha.spores.site.profile',
  CONTENT_TEXT_COLLECTION: 'coop.hypha.spores.content.text',
};

function getCollection(key: string, namespace: 'old' | 'new' = 'old'): string {
  const map: Record<string, string> = {
    siteConfig: namespace === 'new' ? NEW.CONFIG_COLLECTION : OLD.CONFIG_COLLECTION,
    siteLayout: namespace === 'new' ? NEW.LAYOUT_COLLECTION : OLD.LAYOUT_COLLECTION,
    siteSection: namespace === 'new' ? NEW.SECTION_COLLECTION : OLD.SECTION_COLLECTION,
    siteProfile: namespace === 'new' ? NEW.PROFILE_COLLECTION : OLD.PROFILE_COLLECTION,
    contentText: namespace === 'new' ? NEW.CONTENT_TEXT_COLLECTION : OLD.CONTENT_TEXT_COLLECTION,
    itemSpecialSpore: namespace === 'new' ? NEW.SPECIAL_SPORE_COLLECTION : OLD.SPECIAL_SPORE_COLLECTION,
  };
  return map[key] || key;
}

function makeDeps(overrides: Record<string, any> = {}) {
  return {
    isNsidMigrationEnabled: vi.fn(() => true),
    isLoggedIn: vi.fn(() => true),
    getCurrentDid: vi.fn(() => DID),
    getCollections: vi.fn((namespace: 'old' | 'new') => (namespace === 'new' ? NEW : OLD)),
    getCollection: vi.fn(getCollection),
    SPORE_COLLECTION_KEYS: ['siteConfig', 'siteLayout', 'siteSection', 'siteProfile', 'contentText', 'itemSpecialSpore'],
    getRecord: vi.fn(async () => null),
    putRecord: vi.fn(async () => ({})),
    listRecords: vi.fn(async () => ({ records: [] })),
    rewriteRecordPayloadForNamespace: vi.fn((_: string, value: any) => value),
    CONFIG_RKEY: 'self',
    NSID_MIGRATION_VERSION: 1,
    debugLog: vi.fn(),
    ...overrides,
  };
}

describe('migrateOwnerNsidRecordsImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips when caller is not owner', async () => {
    const deps = makeDeps({
      getCurrentDid: vi.fn(() => 'did:plc:someone-else'),
    });

    await migrateOwnerNsidRecordsImpl(DID, deps);

    expect(deps.getRecord).not.toHaveBeenCalled();
    expect(deps.putRecord).not.toHaveBeenCalled();
    expect(deps.listRecords).not.toHaveBeenCalled();
  });

  it('skips when migration marker is already at current version', async () => {
    const deps = makeDeps({
      getRecord: vi.fn(async (_did: string, collection: string) => {
        if (collection === NEW.CONFIG_COLLECTION) {
          return { value: { nsidMigrationVersion: 1 } };
        }
        return null;
      }),
    });

    await migrateOwnerNsidRecordsImpl(DID, deps);

    expect(deps.putRecord).not.toHaveBeenCalled();
    expect(deps.listRecords).not.toHaveBeenCalled();
  });

  it('migrates paginated old records and writes migration marker', async () => {
    const deps = makeDeps({
      listRecords: vi.fn(async (_did: string, collection: string, options?: { cursor?: string }) => {
        if (collection !== OLD.SECTION_COLLECTION) return { records: [] };
        if (!options?.cursor) {
          return {
            records: [
              {
                uri: `at://${DID}/${OLD.SECTION_COLLECTION}/first`,
                value: { $type: OLD.SECTION_COLLECTION, type: 'content' },
              },
            ],
            cursor: 'page-2',
          };
        }
        return {
          records: [
            {
              uri: `at://${DID}/${OLD.SECTION_COLLECTION}/second`,
              value: { $type: OLD.SECTION_COLLECTION, type: 'content' },
            },
          ],
        };
      }),
      getRecord: vi.fn(async (_did: string, collection: string) => {
        if (collection === NEW.CONFIG_COLLECTION) return null;
        if (collection === OLD.CONFIG_COLLECTION) return { value: { title: 'Legacy Title', subtitle: 'Legacy Subtitle' } };
        return null;
      }),
    });

    await migrateOwnerNsidRecordsImpl(DID, deps);

    expect(deps.putRecord).toHaveBeenCalledWith(
      NEW.SECTION_COLLECTION,
      'first',
      expect.objectContaining({ $type: NEW.SECTION_COLLECTION })
    );
    expect(deps.putRecord).toHaveBeenCalledWith(
      NEW.SECTION_COLLECTION,
      'second',
      expect.objectContaining({ $type: NEW.SECTION_COLLECTION })
    );
    expect(deps.putRecord).toHaveBeenCalledWith(
      NEW.CONFIG_COLLECTION,
      'self',
      expect.objectContaining({
        $type: NEW.CONFIG_COLLECTION,
        nsidMigrationVersion: 1,
        title: 'Legacy Title',
      })
    );
  });
});
