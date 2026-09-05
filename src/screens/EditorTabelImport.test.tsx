import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { EditorTabelImport } from './EditorTabelImport';

it('corectează o celulă fără să piardă textul sau codul celorlalte rânduri', async () => {
  const user = userEvent.setup();
  function Exemplu() {
    const [text, setText] = useState('Enunț\tCorect\tCod intern\nPrima\tZ\tlot-1\nA doua\tB\tlot-2');
    return <><EditorTabelImport text={text} onChange={setText} /><output>{text}</output></>;
  }
  render(<Exemplu />);
  await user.clear(screen.getByRole('textbox', { name: 'Rândul 1: Corect' }));
  await user.type(screen.getByRole('textbox', { name: 'Rândul 1: Corect' }), 'A');
  expect(screen.getByRole('status')).toHaveTextContent('Prima A lot-1 A doua B lot-2');
  expect(screen.queryByRole('textbox', { name: /Cod intern/ })).not.toBeInTheDocument();
});
