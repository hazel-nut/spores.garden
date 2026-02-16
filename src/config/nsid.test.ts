import { describe, expect, it } from 'vitest';
import {
  getCollection,
  getReadNamespaces,
  getWriteNamespace,
  mapCollectionToNamespace,
  parseNsidMigrationEnabled,
  rewriteAtUriNamespace,
  setNsidMigrationEnabledForTests,
} from './nsid';

describe('nsid helpers', () => {
  it('switches write/read behavior when migration flag is enabled', () => {
    setNsidMigrationEnabledForTests(false);
    expect(getWriteNamespace()).toBe('old');
    expect(getReadNamespaces()).toEqual(['old']);

    setNsidMigrationEnabledForTests(true);
    expect(getWriteNamespace()).toBe('new');
    expect(getReadNamespaces()).toEqual(['new', 'old']);

    setNsidMigrationEnabledForTests(false);
  });

  it('rewrites collection names and AT URIs across namespaces', () => {
    const oldContent = getCollection('contentText', 'old');
    const newContent = getCollection('contentText', 'new');

    expect(mapCollectionToNamespace(oldContent, 'new')).toBe(newContent);
    expect(mapCollectionToNamespace(newContent, 'old')).toBe(oldContent);

    const oldUri = `at://did:plc:test/${oldContent}/rkey1`;
    const newUri = rewriteAtUriNamespace(oldUri, 'new');
    expect(newUri).toBe(`at://did:plc:test/${newContent}/rkey1`);
  });

  it('parses migration flag values from env-like strings', () => {
    expect(parseNsidMigrationEnabled(undefined)).toBe(false);
    expect(parseNsidMigrationEnabled('')).toBe(false);
    expect(parseNsidMigrationEnabled('false')).toBe(false);
    expect(parseNsidMigrationEnabled('0')).toBe(false);

    expect(parseNsidMigrationEnabled('true')).toBe(true);
    expect(parseNsidMigrationEnabled('TRUE')).toBe(true);
    expect(parseNsidMigrationEnabled('1')).toBe(true);
    expect(parseNsidMigrationEnabled('yes')).toBe(true);
    expect(parseNsidMigrationEnabled('on')).toBe(true);
  });
});
