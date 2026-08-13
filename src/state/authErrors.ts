import { numar } from '../lib/text';

/**
 * Traduce mesajele de eroare ale Supabase — vin în engleză, interfața e în română.
 *
 * Stătea în `AuthContext.tsx`, dar e o funcție pură peste un șir: mutată aici, se
 * poate testa fără să randeze nimic și fără rețea.
 *
 * Cele două limitări au ajuns fiecare cu mesajul ei fiindcă se confundau, iar
 * confuzia costa: „mai așteaptă puțin" pentru o limită de o oră îl face pe om să
 * reîncerce la câteva secunde, degeaba, exact cum s-a întâmplat la primul cont
 * creat pe proiectul real. Un mesaj care nu spune cât să aștepți e aproape la fel
 * de prost ca niciun mesaj.
 */
export function mesajEroare(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes('Invalid login credentials')) return 'Email sau parolă greșită.';
  if (raw.includes('User already registered')) return 'Există deja un cont cu acest email.';
  if (raw.includes('Email not confirmed')) return 'Confirmă mai întâi adresa de email — verifică inboxul.';
  if (raw.includes('Password should be at least')) return 'Parola trebuie să aibă cel puțin 6 caractere.';
  if (raw.toLowerCase().includes('invalid') && raw.toLowerCase().includes('email')) {
    return 'Adresa de email nu e validă.';
  }

  // Două cereri prea apropiate pentru aceeași adresă. Supabase spune exact câte
  // secunde mai sunt, deci le spunem și noi — altfel omul ghicește.
  const secunde = /after (\d+) seconds?/.exec(raw)?.[1];
  if (secunde) return `Prea repede — mai încearcă peste ${numar(Number(secunde), 'secundă', 'secunde')}.`;

  // Altceva: cota de emailuri a proiectului, nu ceva ce a greșit utilizatorul.
  // Serverul de email al Supabase e limitat la câteva mesaje pe oră și e gândit
  // doar pentru probe; până la un SMTP propriu, asta e limita reală.
  if (raw.includes('email rate limit') || raw.includes('over_email_send_rate_limit')) {
    return 'Nu s-a putut trimite emailul de confirmare: s-a atins limita de trimitere. Mai încearcă peste o oră.';
  }

  if (raw.includes('rate limit') || raw.includes('security purposes')) {
    return 'Prea multe încercări la rând — mai așteaptă puțin.';
  }

  return 'A apărut o eroare. Încearcă din nou.';
}
