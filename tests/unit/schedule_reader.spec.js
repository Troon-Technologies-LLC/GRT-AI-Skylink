const { test, expect } = require('@playwright/test');
const ScheduleReader = require('../../TestData/schedule_reader');

test.describe('ScheduleReader.extractLocation()', () => {
  test('parses PIR multi-word location', async () => {
    expect(ScheduleReader.extractLocation('BOB Dinning room PIR')).toBe('Dinning room');
  });

  test('parses DOOR single-word location', async () => {
    expect(ScheduleReader.extractLocation('BOB Kitchen DOOR')).toBe('Kitchen');
  });

  test('parses PIR single-word location', async () => {
    expect(ScheduleReader.extractLocation('BOB Bedroom PIR')).toBe('Bedroom');
  });

  test('trims spaces and is case-insensitive for suffix', async () => {
    expect(ScheduleReader.extractLocation('  BOB   Livingroom   pir  ')).toBe('Livingroom');
    expect(ScheduleReader.extractLocation('BOB Office door')).toBe('Office');
  });

  test('returns empty string for invalid input', async () => {
    expect(ScheduleReader.extractLocation('')).toBe('');
    expect(ScheduleReader.extractLocation(undefined)).toBe('');
  });
});
