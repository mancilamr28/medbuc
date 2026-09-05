import {
  faCalendarDays,
  faChartLine,
  faGear,
  faHouse,
  faNoteSticky,
  faRotateLeft,
  faShieldHalved,
  faStopwatch,
  faWandMagicSparkles,
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
  const { simulareVeche } = useApp();
  const { role } = useAuth();


  return {
    main: [
      { id: 'acasa', label: 'Acasă', icon: faHouse },
      { id: 'test-nou', label: 'Test nou', icon: faWandMagicSparkles },
      ...(simulareVeche.run
        ? [{ id: 'simulari' as Screen, label: 'Continuă simularea', icon: faStopwatch }]
        : []),
      { id: 'recapitulare', label: 'Recapitulare', icon: faRotateLeft },
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
