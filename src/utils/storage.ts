const SAVE_KEY = 'tsuri_sugoroku_save';
const ENCYCLOPEDIA_KEY = 'tsuri_sugoroku_encyclopedia';

export function saveGameState(state: unknown): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadGameState(): unknown | null {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearGameState(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function saveEncyclopedia(encyclopedia: Record<string, boolean>): void {
  try {
    localStorage.setItem(ENCYCLOPEDIA_KEY, JSON.stringify(encyclopedia));
  } catch {
    // ignore
  }
}

export function loadEncyclopedia(): Record<string, boolean> {
  try {
    const data = localStorage.getItem(ENCYCLOPEDIA_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}
