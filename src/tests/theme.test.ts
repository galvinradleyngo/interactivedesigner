import { describe, expect, it } from 'vitest';
import { applyTheme } from '../player/stage';
import { migrate, newProject } from '../schema/migrate';

describe('surround (background around the page)', () => {
  it('is transparent by default, including for older projects', () => {
    expect(newProject('t').design.surround).toBe('');
    const old = { ...newProject('t'), design: { primary: '#000' } };
    expect(migrate(old).design.surround).toBe('');
  });
  it('sets the CSS variable only when a colour is chosen', () => {
    const el = document.createElement('div');
    const d = newProject('t').design;
    applyTheme(el, d);
    expect(el.style.getPropertyValue('--surround')).toBe('');
    applyTheme(el, { ...d, surround: '#ffeedd' });
    expect(el.style.getPropertyValue('--surround')).toBe('#ffeedd');
    applyTheme(el, d); // cleared again
    expect(el.style.getPropertyValue('--surround')).toBe('');
  });
});
