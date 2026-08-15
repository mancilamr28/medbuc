import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Topbar } from './Topbar';

const toggleTheme = vi.fn();

vi.mock('../state/appContextValue', () => ({
  useApp: () => ({ theme: 'dark', toggleTheme }),
}));

vi.mock('./Logo', () => ({
  Logo: () => <button type="button">MedBuc</button>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Topbar', () => {
  it('păstrează antetul mobil pe un singur rând cu identitatea și tema', async () => {
    const user = userEvent.setup();
    render(<Topbar compact />);

    expect(screen.getByRole('button', { name: 'MedBuc' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mod luminos' }));
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('nu promite căutare sau notificări înainte să existe funcționalitatea', () => {
    render(<Topbar compact />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Notificări/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ctrl K')).not.toBeInTheDocument();
  });

  it('nu repetă identitatea în varianta desktop', () => {
    render(<Topbar compact={false} />);

    expect(screen.queryByRole('button', { name: 'MedBuc' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mod luminos' })).toBeInTheDocument();
  });
});
