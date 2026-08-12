import { describe, expect, it } from 'vitest';
import { daysUntil, formatClock, formatDay } from './time';

describe('daysUntil', () => {
  const from = new Date(2027, 6, 20); // 20 iulie 2027

  it('numără zilele calendaristice rămase', () => {
    expect(daysUntil(new Date(2027, 6, 25), from)).toBe(5);
  });

  it('dă 0 în ziua examenului', () => {
    expect(daysUntil(new Date(2027, 6, 20), from)).toBe(0);
  });

  it('nu coboară sub 0 după ce data a trecut', () => {
    expect(daysUntil(new Date(2027, 6, 1), from)).toBe(0);
  });

  it('ignoră ora din zi — contează doar data', () => {
    const seara = new Date(2027, 6, 20, 23, 59);
    const dimineata = new Date(2027, 6, 25, 0, 1);
    expect(daysUntil(dimineata, seara)).toBe(5);
  });

  it('trece corect peste schimbarea de lună și de an', () => {
    expect(daysUntil(new Date(2027, 0, 1), new Date(2026, 11, 25))).toBe(7);
  });
});

describe('formatClock', () => {
  it('scrie mm:ss sub o oră', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(9)).toBe('00:09');
    expect(formatClock(75)).toBe('01:15');
    expect(formatClock(3599)).toBe('59:59');
  });

  it('trece la h:mm:ss de la o oră în sus', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(10_800)).toBe('3:00:00'); // durata unei simulări
  });

  it('taie fracțiunile de secundă în loc să rotunjească', () => {
    expect(formatClock(59.9)).toBe('00:59');
  });

  it('tratează valorile negative ca zero', () => {
    expect(formatClock(-5)).toBe('00:00');
  });
});

describe('formatDay', () => {
  it('scrie ziua cu luna în română', () => {
    expect(formatDay(new Date(2026, 7, 11))).toBe('11 august');
    expect(formatDay(new Date(2026, 0, 1))).toBe('1 ianuarie');
    expect(formatDay(new Date(2026, 11, 31))).toBe('31 decembrie');
  });
});
