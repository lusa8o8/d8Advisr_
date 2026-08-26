import assert from 'node:assert/strict';
import test from 'node:test';
import { presentEventTrust, type PublicEventAction, type PublicEventSource } from '../artifacts/d8advisr/src/features/events/eventTrust.ts';

const source = (patch: Partial<PublicEventSource> = {}): PublicEventSource => ({
  id: 'source-1',
  publisher_name: 'Official organiser',
  source_title: 'Event announcement',
  url: 'https://example.com/event',
  is_primary: true,
  last_checked_at: '2026-08-26T10:00:00Z',
  created_at: '2026-08-25T10:00:00Z',
  ...patch,
});

const action = (patch: Partial<PublicEventAction> = {}): PublicEventAction => ({
  id: 'action-1',
  provider_name: 'TicketHost',
  label: 'Get tickets',
  url: 'https://example.com/tickets',
  status: 'active',
  is_primary: true,
  last_checked_at: '2026-08-26T10:00:00Z',
  created_at: '2026-08-25T10:00:00Z',
  ...patch,
});

test('active primary action becomes the one external CTA', () => {
  const result = presentEventTrust({ eventStatus: 'live', isImported: true, sources: [source()], actions: [action()] });
  assert.equal(result.action.kind, 'active');
  if (result.action.kind === 'active') assert.equal(result.action.url, 'https://example.com/tickets');
});

test('active fallback beats a sold-out primary action', () => {
  const result = presentEventTrust({
    eventStatus: 'live',
    isImported: true,
    sources: [],
    actions: [action({ status: 'sold_out' }), action({ id: 'action-2', is_primary: false, url: 'https://example.com/available' })],
  });
  assert.equal(result.action.kind, 'active');
  if (result.action.kind === 'active') assert.equal(result.action.url, 'https://example.com/available');
});

test('sold-out and closed links produce non-navigable status states', () => {
  assert.equal(presentEventTrust({ eventStatus: 'live', isImported: true, sources: [], actions: [action({ status: 'sold_out' })] }).action.kind, 'sold_out');
  assert.equal(presentEventTrust({ eventStatus: 'live', isImported: true, sources: [], actions: [action({ status: 'closed', is_primary: false })] }).action.kind, 'closed');
});

test('invalid or missing imported actions are unavailable', () => {
  assert.equal(presentEventTrust({ eventStatus: 'live', isImported: true, sources: [], actions: [action({ status: 'invalid', is_primary: false })] }).action.kind, 'unavailable');
  assert.equal(presentEventTrust({ eventStatus: 'live', isImported: true, sources: [source()], actions: [] }).action.kind, 'unavailable');
});

test('ordinary events without provenance do not get a fabricated trust card', () => {
  const result = presentEventTrust({ eventStatus: 'live', isImported: false, sources: [], actions: [] });
  assert.equal(result.citation, null);
  assert.equal(result.action.kind, 'hidden');
});

test('primary citation wins while a missing primary falls back deterministically', () => {
  const secondary = source({ id: 'source-2', is_primary: false, publisher_name: 'Calendar', last_checked_at: '2026-08-27T10:00:00Z' });
  assert.equal(presentEventTrust({ eventStatus: 'live', isImported: true, sources: [secondary, source()], actions: [] }).citation?.publisher_name, 'Official organiser');
  assert.equal(presentEventTrust({ eventStatus: 'live', isImported: true, sources: [source({ is_primary: false }), secondary], actions: [] }).citation?.publisher_name, 'Calendar');
});

test('cancelled events retain citation but suppress every external action', () => {
  const result = presentEventTrust({ eventStatus: 'cancelled', isImported: true, sources: [source()], actions: [action()] });
  assert.equal(result.citation?.publisher_name, 'Official organiser');
  assert.equal(result.action.kind, 'cancelled');
});
