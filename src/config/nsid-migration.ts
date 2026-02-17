type CollectionSet = {
  CONFIG_COLLECTION: string;
  SECTION_COLLECTION: string;
  LAYOUT_COLLECTION: string;
  SPECIAL_SPORE_COLLECTION: string;
  PROFILE_COLLECTION: string;
  CONTENT_TEXT_COLLECTION: string;
};

type ListRecordsFn = (
  did: string,
  collection: string,
  options?: { limit?: number; cursor?: string }
) => Promise<{ records?: any[]; cursor?: string }>;

const MAX_LIST_PAGES = 200;

async function listAllRecordsForCollection(
  did: string,
  collection: string,
  listRecords: ListRecordsFn
): Promise<any[]> {
  const all: any[] = [];
  const seenCursors = new Set<string>();
  let pages = 0;
  let cursor: string | undefined = undefined;
  for (;;) {
    if (pages >= MAX_LIST_PAGES) {
      console.warn(`[nsid-migration] Aborting pagination for ${collection}: exceeded ${MAX_LIST_PAGES} pages.`);
      break;
    }
    pages += 1;

    const response = await listRecords(did, collection, { limit: 100, cursor });
    const records = response?.records || [];
    all.push(...records);
    const nextCursor = response?.cursor;
    if (!nextCursor) break;
    if (nextCursor === cursor || seenCursors.has(nextCursor)) {
      console.warn(`[nsid-migration] Aborting pagination for ${collection}: repeated cursor "${nextCursor}".`);
      break;
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }
  return all;
}

function getRecordRkey(record: any): string | null {
  const uri = record?.uri;
  if (typeof uri !== 'string') return null;
  const parts = uri.split('/');
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

export async function migrateOwnerNsidRecordsImpl(
  did: string,
  deps: {
    isLoggedIn: () => boolean;
    getCurrentDid: () => string | null;
    getCollection: (key: string, namespace?: 'old' | 'new') => string;
    SPORE_COLLECTION_KEYS: string[];
    getRecord: (did: string, collection: string, rkey: string) => Promise<any>;
    putRecord: (collection: string, rkey: string, value: any) => Promise<any>;
    deleteRecord: (collection: string, rkey: string) => Promise<any>;
    listRecords: ListRecordsFn;
    rewriteRecordPayloadForNamespace: (collection: string, value: any, namespace: 'old' | 'new') => any;
    CONFIG_RKEY: string;
    debugLog: (...args: unknown[]) => void;
  }
): Promise<void> {
  if (!deps.isLoggedIn() || deps.getCurrentDid() !== did) {
    deps.debugLog(`[nsid-migration] Skipping migration for ${did}: not logged in as owner.`);
    return;
  }

  try {
    let writes = 0;
    let deletes = 0;

    for (const key of deps.SPORE_COLLECTION_KEYS) {
      const oldCollection = deps.getCollection(key, 'old');
      const newCollection = deps.getCollection(key, 'new');

      if (key === 'siteConfig' || key === 'siteLayout' || key === 'siteProfile') {
        const oldRecord = await deps.getRecord(did, oldCollection, deps.CONFIG_RKEY);
        if (!oldRecord?.value) continue;

        const existingNewRecord = await deps.getRecord(did, newCollection, deps.CONFIG_RKEY);
        if (!existingNewRecord?.value) {
          const rewritten = deps.rewriteRecordPayloadForNamespace(oldCollection, oldRecord.value, 'new');
          await deps.putRecord(newCollection, deps.CONFIG_RKEY, {
            ...rewritten,
            $type: newCollection,
          });
          writes += 1;
        }
        await deps.deleteRecord(oldCollection, deps.CONFIG_RKEY);
        deletes += 1;
        continue;
      }

      const oldRecords = await listAllRecordsForCollection(did, oldCollection, deps.listRecords);
      if (oldRecords.length === 0) {
        continue;
      }
      const newRecords = await listAllRecordsForCollection(did, newCollection, deps.listRecords);
      const newRkeys = new Set(newRecords.map((record) => getRecordRkey(record)).filter(Boolean));

      for (const record of oldRecords) {
        const rkey = getRecordRkey(record);
        if (!rkey || !record?.value) continue;
        if (!newRkeys.has(rkey)) {
          const rewritten = deps.rewriteRecordPayloadForNamespace(oldCollection, record.value, 'new');
          await deps.putRecord(newCollection, rkey, {
            ...rewritten,
            $type: newCollection,
          });
          writes += 1;
          newRkeys.add(rkey);
        }
        await deps.deleteRecord(oldCollection, rkey);
        deletes += 1;
      }
    }

    if (writes === 0 && deletes === 0) {
      deps.debugLog(`[nsid-migration] No migration needed for ${did}: no old records to migrate.`);
      return;
    }
    deps.debugLog(`[nsid-migration] Completed migration for ${did}: wrote ${writes}, deleted ${deletes}.`);
  } catch (error) {
    console.error(`[nsid-migration] Failed migration for ${did}:`, error);
  }
}

export async function migrateLegacySectionsRecordImpl(
  did: string,
  deps: {
    isLoggedIn: () => boolean;
    getCurrentDid: () => string | null;
    getCollections: () => CollectionSet;
    getRecord: (did: string, collection: string, rkey: string) => Promise<any>;
    createRecord: (collection: string, value: any) => Promise<{ uri: string }>;
    putRecord: (collection: string, rkey: string, value: any) => Promise<any>;
    deleteRecord: (collection: string, rkey: string) => Promise<any>;
    CONFIG_RKEY: string;
    debugLog: (...args: unknown[]) => void;
  }
): Promise<void> {
  if (!deps.isLoggedIn() || deps.getCurrentDid() !== did) {
    deps.debugLog(`Skipping migration for ${did}: Not logged in or not owner.`);
    return;
  }
  const OLD_SECTIONS_COLLECTION = 'garden.spores.site.sections';
  const collections = deps.getCollections();

  try {
    const oldSectionsRecord = await deps.getRecord(did, OLD_SECTIONS_COLLECTION, deps.CONFIG_RKEY);
    if (oldSectionsRecord && oldSectionsRecord.value && oldSectionsRecord.value.sections) {
      deps.debugLog(`Migrating old sections record for user: ${did}`);

      const sections = oldSectionsRecord.value.sections as any[];
      const sectionUris: string[] = [];

      for (const section of sections) {
        const sectionRecord = {
          $type: collections.SECTION_COLLECTION,
          type: section.type,
          title: section.title || undefined,
          layout: section.layout || undefined,
          collection: section.collection || undefined,
          rkey: section.rkey || undefined,
          records: section.records || undefined,
          content: section.content || undefined,
          format: section.format || undefined,
          limit: section.limit || undefined,
          hideHeader: section.hideHeader || undefined,
        };

        const response = await deps.createRecord(collections.SECTION_COLLECTION, sectionRecord);
        sectionUris.push(response.uri);
      }

      const layoutRecord = {
        $type: collections.LAYOUT_COLLECTION,
        sections: sectionUris,
      };
      await deps.putRecord(collections.LAYOUT_COLLECTION, deps.CONFIG_RKEY, layoutRecord);

      await deps.deleteRecord(OLD_SECTIONS_COLLECTION, deps.CONFIG_RKEY);
      deps.debugLog(`Migration successful for user: ${did}`);
    }
  } catch (error: any) {
    if (error?.message?.includes('not found')) {
      // expected: already migrated or new user
    } else {
      console.error(`Error during sections migration check for user ${did}:`, error);
    }
  }
}
