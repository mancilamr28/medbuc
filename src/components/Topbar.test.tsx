import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Topbar } from './Topbar';

const toggleTheme = vi.fn();
let theme: 'light' | 'dark' = 'dark';

vi.mock('../state/appContextValue', () => ({
  useApp: () => ({ theme, toggleTheme }),
}));

vi.mock('./Logo', () => ({
  Logo: () => <button type="button">MedBuc</button>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  theme = 'dark';
});

describe('Topbar', () => {
  it('păstrează antetul mobil pe un singur rând cu identitatea și tema', async () => {
    const user = userEvent.setup();
    render(<Topbar compact />);

    expect(screen.getByRole('button', { name: 'MedBuc' })).toBeInTheDocument();
    const tema = screen.getByRole('button', { name: 'Activează modul luminos' });
    expect(tema).toHaveAttribute('title', 'Activează modul luminos');
    expect(tema).toHaveTextContent('');
    expect(tema).toHaveClass('tinta-tactila', 'tinta-tactila--patrata');
    await user.click(tema);
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
    expect(screen.getByRole('button', { name: 'Activează modul luminos' })).toBeInTheDocument();
  });

  it('arată luna când acțiunea activează tema întunecată', () => {
    theme = 'light';
    render(<Topbar compact />);

    const tema = screen.getByRole('button', { name: 'Activează modul întunecat' });
    expect(tema).toHaveAttribute('title', 'Activează modul întunecat');
    expect(tema).toHaveTextContent('');
  });
});
