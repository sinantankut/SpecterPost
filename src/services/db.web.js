// Web fallback (used for browser previews only): drafts live in localStorage.
const KEY = 'specterpost_drafts';
const read = () => {
  try { return JSON.parse(globalThis.localStorage?.getItem(KEY) || '[]'); } catch { return []; }
};
const write = (rows) => {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(rows)); } catch {}
};
export const getDb = async () => null;
export const saveDraftToDb = async (draft) => {
  const rows = read();
  const id = draft.id || Date.now().toString();
  const now = new Date().toISOString();
  const prev = rows.find((r) => r.id === id);
  const row = { ...prev, ...draft, id, updated_at: now, created_at: prev?.created_at || now };
  write([row, ...rows.filter((r) => r.id !== id)]);
  return row;
};
export const getDraftsFromDb = async () =>
  read().sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).map((r) => ({ ...r, updatedAt: r.updated_at }));
export const getDraftByIdFromDb = async (id) => read().find((r) => r.id === id) || null;
export const deleteDraftFromDb = async (id) => {
  write(read().filter((r) => r.id !== id));
  return true;
};
