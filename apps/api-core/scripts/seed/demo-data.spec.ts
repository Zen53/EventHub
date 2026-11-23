import { buildDemoEvents, DEMO_ORGANIZER_ID } from './demo-data.js';

describe('buildDemoEvents', () => {
  const now = new Date('2026-11-23T10:00:00Z');
  const rows = buildDemoEvents(now, DEMO_ORGANIZER_ID);

  it('builds about ten events with unique fixed ids', () => {
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('dates events relative to now, with at least one past event', () => {
    const past = rows.filter((row) => row.startsAt < now);
    expect(past.length).toBeGreaterThanOrEqual(1);
    expect(rows.length - past.length).toBeGreaterThanOrEqual(9);
    expect(rows[0].startsAt).toEqual(new Date('2026-11-26T18:00:00Z'));
  });

  it('includes a cancelled event and events without image', () => {
    expect(rows.some((row) => row.status === 'cancelled')).toBe(true);
    expect(rows.some((row) => row.imageUrl === null)).toBe(true);
  });

  it('assigns every event to the given organizer', () => {
    const rowsForOther = buildDemoEvents(now, 'other-id');
    expect(rowsForOther.every((row) => row.organizerId === 'other-id')).toBe(
      true,
    );
  });
});
