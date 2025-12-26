import * as SQLite from 'expo-sqlite';

let db;

export const initSync = () => {
    // Synchronous initialization if needed, but modern expo-sqlite is async mostly
};

export const getDb = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync('specterpost.db');
        await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT,
        content TEXT,
        featured_image TEXT,
        featured_image_alt TEXT,
        custom_excerpt TEXT,
        tags TEXT,
        status TEXT,
        platform TEXT,
        ghost_post_id TEXT,
        updated_at TEXT,
        created_at TEXT
      );
    `);
    }
    return db;
};

export const saveDraftToDb = async (draft) => {
    const database = await getDb();
    const id = draft.id || Date.now().toString();
    const now = new Date().toISOString();

    await database.runAsync(
        `INSERT OR REPLACE INTO drafts (
      id, title, content, featured_image, featured_image_alt, custom_excerpt, tags, status, platform, ghost_post_id, updated_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM drafts WHERE id = ?), ?))`,
        [
            id,
            draft.title || '',
            draft.content || '',
            draft.featured_image || null,
            draft.featured_image_alt || null,
            draft.custom_excerpt || null,
            JSON.stringify(draft.tags || []),
            draft.status || 'draft',
            draft.platform || 'ghost',
            draft.ghost_post_id || null,
            now,
            id,
            now
        ]
    );

    return { ...draft, id, updated_at: now, created_at: draft.created_at || now };
};

export const getDraftsFromDb = async () => {
    const database = await getDb();
    const result = await database.getAllAsync('SELECT * FROM drafts ORDER BY updated_at DESC');
    return result.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        // Map snake_case to camelCase if needed by app, or keep consist
        updatedAt: row.updated_at,
        createdAt: row.created_at
    }));
};

export const getDraftByIdFromDb = async (id) => {
    const database = await getDb();
    const result = await database.getFirstAsync('SELECT * FROM drafts WHERE id = ?', [id]);
    if (!result) return null;
    return {
        ...result,
        tags: result.tags ? JSON.parse(result.tags) : [],
        updatedAt: result.updated_at,
        createdAt: result.created_at
    };
};

export const deleteDraftFromDb = async (id) => {
    const database = await getDb();
    await database.runAsync('DELETE FROM drafts WHERE id = ?', [id]);
    return true;
};
