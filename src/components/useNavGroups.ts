import {
  faBookOpen,
  faCalendarDays,
  faChartLine,
  faGear,
  faHouse,
  faListCheck,
  faNoteSticky,
  faRotateLeft,
  faShieldHalved,
  faStopwatch,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import type { Screen } from '../lib/router';
import { useApp } from '../state/appContextValue';
import { useAuth } from '../state/authState';

export interface NavEntry {
  id: Screen;
  label: string;
  icon: IconDefinition;
  badge?: string;
}

export function useNavGroups(): { main: NavEntry[]; sec: NavEntry[] } {
  const { session } = useApp();
  const { role } = useAuth();
  const ramase = session.total - Object.keys(session.revealed).length;

  return {
    main: [
      { id: 'acasa', label: 'Acasă', icon: faHouse },
      { id: 'materii', label: 'Materii', icon: faBookOpen },
      { id: 'grile', label: 'Grile', icon: faListCheck, badge: ramase > 0 ? String(ramase) : undefined },
      { id: 'recapitulare', label: 'Recapitulare', icon: faRotateLeft },
      { id: 'simulari', label: 'Simulări', icon: faStopwatch },
      { id: 'statistici', label: 'Statistici', icon: faChartLine },
    ],
    sec: [
      { id: 'plan', label: 'Planul meu', icon: faCalendarDays },
      { id: 'notite', label: 'Notițe', icon: faNoteSticky },
      { id: 'setari', label: 'Profil și setări', icon: faGear },
      ...(role === 'admin' ? [{ id: 'admin' as Screen, label: 'Administrare', icon: faShieldHalved }] : []),
    ],
  };
}
