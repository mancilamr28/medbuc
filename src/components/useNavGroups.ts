import {
  faCalendarDays,
  faChartLine,
  faGear,
  faHouse,
  faListCheck,
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
  const { session, sim } = useApp();
  const { role } = useAuth();

  // Doar o sesiune pornită și neterminată are „rămase". Fără `hasStarted`,
  // `session.total` e biblioteca întreagă (scop gol = toată materia), așa că un
  // elev care n-a început nimic vedea lângă „Grile" un număr egal cu toată
  // biblioteca, ca și cum ar avea o sesiune în așteptare.
  const sesiuneVecheInCurs = session.hasStarted && !session.finished;
  const ramase = sesiuneVecheInCurs
    ? session.total - Object.keys(session.revealed).length
    : 0;

  return {
    main: [
      { id: 'acasa', label: 'Acasă', icon: faHouse },
      { id: 'test-nou', label: 'Test nou', icon: faWandMagicSparkles },
      ...(sesiuneVecheInCurs
        ? [{
            id: 'grile' as Screen,
            label: 'Continuă sesiunea',
            icon: faListCheck,
            badge: ramase > 0 ? String(ramase) : undefined,
          }]
        : []),
      ...(sim.phase === 'rulare'
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
