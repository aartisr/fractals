/**
 * Guarda una solicitud de análisis en la base de datos.
 * @param requestEvent Evento de la request (para obtener el cliente y variables de entorno)
 * @param data Objeto con los datos del formulario: { name, email, phone, objective }
 */
export async function saveAnalysisRequest(
  requestEvent: RequestEventBase,
  data: { name: string; email: string; phone: string; objective: string }
): Promise<void> {
  // Crear tabla si no existe
  await executeQuery(
    requestEvent,
    `CREATE TABLE IF NOT EXISTS analysis_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      objective TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // Insertar la solicitud
  await executeQuery(
    requestEvent,
    `INSERT INTO analysis_requests (name, email, phone, objective) VALUES (?, ?, ?, ?)`,
    [data.name, data.email, data.phone, data.objective]
  );
}
import type { RequestEventBase } from "@builder.io/qwik-city";
import { createClient, type Client } from "@libsql/client";

// Define a browser-safe QueryArgs type that doesn't use Buffer
type QueryArgs = (string | number | boolean | null | Uint8Array)[];

export type QueryResult = {
  rows: Array<Record<string, any>>;
  columns: string[];
  rowsAffected: number;
  lastInsertRowid: unknown;
};

export function tursoClient(requestEvent: RequestEventBase): Client {
  const url = requestEvent.env.get("PRIVATE_TURSO_DATABASE_URL")?.trim();
  if (url === undefined) {
    throw new Error("PRIVATE_TURSO_DATABASE_URL is not defined");
  }

  const authToken = requestEvent.env.get("PRIVATE_TURSO_AUTH_TOKEN")?.trim();
  if (authToken === undefined) {
    if (!url.includes("file:")) {
      throw new Error("PRIVATE_TURSO_AUTH_TOKEN is not defined");
    }
  }

  return createClient({
    url,
    authToken,
  });
}

/**
 * Todas las migraciones se han movido a esta función pero ya no se ejecutan
 * automáticamente en cada carga de página.
 *
 * IMPORTANTE: estas migraciones ya se han ejecutado y no es necesario volver a ejecutarlas.
 * Si se necesitan nuevas migraciones en el futuro, se deben agregar aquí y luego
 * ejecutarlas una sola vez manualmente.
 */
export async function runMigrations(requestEvent: RequestEventBase): Promise<void> {
  // Esta función ya no ejecuta migraciones automáticamente porque ralentiza la página
  console.log("Migrations were already applied. Not executing them again.");
  return;
  
  // Código dejado como referencia para futuras migraciones manuales:
  /*
  try {
    console.log("Running database migrations...");
    
    // First create users table since other tables reference it
    await migrateUsersTable(requestEvent);
    console.log("Users table migration complete");
    
    // Add missing type column to users table if needed
    await addTypeColumnToUsersTable(requestEvent);
    console.log("Users table type column migration complete");
    
    // Create schools table
    await migrateSchoolsTable(requestEvent);
    console.log("Schools table migration complete");
    
    // Create grades table
    await migrateGradesTable(requestEvent);
    console.log("Grades table migration complete");
    
    // Create coordinators table
    await migrateCoordinatorsTable(requestEvent);
    console.log("Coordinators table migration complete");
    
    // Create students table
    await migrateStudentsTable(requestEvent);
    console.log("Students table migration complete");
    
    // Create administrators table
    await migrateAdministratorsTable(requestEvent);
    console.log("Administrators table migration complete");
    
    // Create challenges table
    await migrateChallengesTable(requestEvent);
    console.log("Challenges table migration complete");
    
    // Add missing difficulty column to challenges table if needed
    await addDifficultyColumnToChallengesTable(requestEvent);
    console.log("Challenges table difficulty column migration complete");
    
    // Add missing url and category columns to challenges table if needed
    await addUrlAndCategoryColumnsToChallengesTable(requestEvent);
    console.log("Challenges table url and category columns migration complete");
    
    // Create user_challenge_progress table
    await migrateUserChallengeProgressTable(requestEvent);
    console.log("User challenge progress table migration complete");
    
    // Create admin user if it doesn't exist
    await createAdminUser(requestEvent);
    console.log("Admin user creation check complete");
    
    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
  */
}

/**
 * Migración para crear la tabla users
 */
export async function migrateUsersTable(requestEvent: RequestEventBase): Promise<void> {
  await executeQuery(
    requestEvent,
    `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      type TEXT DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      session_expires DATETIME
    )
    `
  );
}

/**
 * Migración para añadir la columna type a la tabla users si no existe
 */
export async function addTypeColumnToUsersTable(requestEvent: RequestEventBase): Promise<void> {
  try {
    // Check if the type column exists
    const tableInfo = await executeQuery(
      requestEvent,
      `PRAGMA table_info(users)`
    );
    
    // Look for a column named 'type'
    const typeColumnExists = tableInfo.rows.some((row: any) => row.name === 'type');
    
    // If type column doesn't exist, add it
    if (!typeColumnExists) {
      console.log("Adding 'type' column to users table");
      await executeQuery(
        requestEvent,
        `ALTER TABLE users ADD COLUMN type TEXT DEFAULT 'normal'`
      );
      console.log("'type' column added successfully");
    } else {
      console.log("'type' column already exists in users table");
    }
  } catch (error) {
    console.error("Error adding type column:", error);
    throw error;
  }
}

/**
 * Migración para crear la tabla schools
 */
export async function migrateSchoolsTable(requestEvent: RequestEventBase): Promise<void> {
  await executeQuery(
    requestEvent,
    `
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    `
  );
}

/**
 * Migración para crear la tabla grades (grados escolares)
 */
export async function migrateGradesTable(requestEvent: RequestEventBase): Promise<void> {
  await executeQuery(
    requestEvent,
    `
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    `
  );
}

/**
 * Migración para crear la tabla coordinators
 */
export async function migrateCoordinatorsTable(requestEvent: RequestEventBase): Promise<void> {
  await executeQuery(
    requestEvent,
    `
    CREATE TABLE IF NOT EXISTS coordinators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (school_id) REFERENCES schools (id),
      UNIQUE (user_id),
      UNIQUE (email)
    )
    `
  );
}

/**
 * Migración para crear la tabla students (estudiantes)
 */
export async function migrateStudentsTable(requestEvent: RequestEventBase): Promise<void> {
  await executeQuery(
    requestEvent,
    `
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      grade_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (school_id) REFERENCES schools (id),
      FOREIGN KEY (grade_id) REFERENCES grades (id),
      UNIQUE (user_id)
    )
    `
  );
}

/**
 * Migración para crear la tabla administrators
 */
export async function migrateAdministratorsTable(requestEvent: RequestEventBase): Promise<void> {
  await executeQuery(
    requestEvent,
    `
    CREATE TABLE IF NOT EXISTS administrators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT 'Administrator',
      position TEXT DEFAULT 'System Administrator',
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE (user_id)
    )
    `
  );
}

/**
 * Migración para crear la tabla challenges
 */
export async function migrateChallengesTable(requestEvent: RequestEventBase): Promise<void> {
  await executeQuery(
    requestEvent,
    `
    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      created_by TEXT,
      category TEXT DEFAULT 'General',
      difficulty TEXT DEFAULT 'Intermediate',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    `
  );
}

/**
 * Migración para añadir la columna difficulty a la tabla challenges si no existe
 */
export async function addDifficultyColumnToChallengesTable(requestEvent: RequestEventBase): Promise<void> {
  try {
    // Check if challenges table exists
    const tablesResult = await executeQuery(
      requestEvent,
      `SELECT name FROM sqlite_master WHERE type='table' AND name='challenges'`
    );
    
    if (tablesResult.rows.length === 0) {
      console.log("Challenges table does not exist yet, skipping difficulty column check");
      return;
    }
    
    console.log("Ensured challenges table exists");
    
    // Check if the difficulty column exists
    const tableInfo = await executeQuery(
      requestEvent,
      `PRAGMA table_info(challenges)`
    );
    
    // Look for a column named 'difficulty'
    const difficultyColumnExists = tableInfo.rows.some((row: any) => row.name === 'difficulty');
    
    // If difficulty column doesn't exist, add it
    if (!difficultyColumnExists) {
      console.log("Adding 'difficulty' column to challenges table");
      await executeQuery(
        requestEvent,
        `ALTER TABLE challenges ADD COLUMN difficulty TEXT DEFAULT 'Intermediate'`
      );
      console.log("'difficulty' column added successfully");
    } else {
      console.log("'difficulty' column already exists in challenges table");
    }
  } catch (error) {
    console.error("Error adding difficulty column:", error);
    throw error;
  }
}

/**
 * Migración para añadir las columnas url y category a la tabla challenges si no existen
 */
export async function addUrlAndCategoryColumnsToChallengesTable(requestEvent: RequestEventBase): Promise<void> {
  try {
    // Check if challenges table exists
    const tablesResult = await executeQuery(
      requestEvent,
      `SELECT name FROM sqlite_master WHERE type='table' AND name='challenges'`
    );
    
    if (tablesResult.rows.length === 0) {
      console.log("Challenges table does not exist yet, skipping url and category columns check");
      return;
    }
    
    console.log("Ensured challenges table exists");
    
    // Check if the columns exist
    const tableInfo = await executeQuery(
      requestEvent,
      `PRAGMA table_info(challenges)`
    );
    
    // Look for columns named 'url' and 'category'
    const urlColumnExists = tableInfo.rows.some((row: any) => row.name === 'url');
    const categoryColumnExists = tableInfo.rows.some((row: any) => row.name === 'category');
    
    // If url column doesn't exist, add it
    if (!urlColumnExists) {
      console.log("Adding 'url' column to challenges table");
      await executeQuery(
        requestEvent,
        `ALTER TABLE challenges ADD COLUMN url TEXT DEFAULT ''`
      );
      console.log("'url' column added successfully");
    } else {
      console.log("'url' column already exists in challenges table");
    }
    
    // If category column doesn't exist, add it
    if (!categoryColumnExists) {
      console.log("Adding 'category' column to challenges table");
      await executeQuery(
        requestEvent,
        `ALTER TABLE challenges ADD COLUMN category TEXT DEFAULT 'General'`
      );
      console.log("'category' column added successfully");
    } else {
      console.log("'category' column already exists in challenges table");
    }
  } catch (error) {
    console.error("Error adding url and category columns:", error);
    throw error;
  }
}

/**
 * Migración para crear la tabla user_challenge_progress para rastrear el progreso de los usuarios
 */
export async function migrateUserChallengeProgressTable(requestEvent: RequestEventBase): Promise<void> {
  await executeQuery(
    requestEvent,
    `
    CREATE TABLE IF NOT EXISTS user_challenge_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      challenge_id INTEGER NOT NULL,
      completed BOOLEAN DEFAULT 0,
      score INTEGER,
      completed_at DATETIME,
      attempts INTEGER DEFAULT 0,
      last_attempt_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (challenge_id) REFERENCES challenges (id),
      UNIQUE (user_id, challenge_id)
    )
    `
  );
  
  // Create indexes for better performance
  try {
    await executeQuery(
      requestEvent,
      `CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON user_challenge_progress(user_id)`
    );
    
    await executeQuery(
      requestEvent,
      `CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_challenge ON user_challenge_progress(challenge_id)`
    );
    
    await executeQuery(
      requestEvent,
      `CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_completed ON user_challenge_progress(completed)`
    );
  } catch (error) {
    console.warn("Warning: Could not create indexes:", error);
    // Continue anyway as indexes are not critical
  }
}

/**
 * Create admin user if it doesn't exist
 */
export async function createAdminUser(requestEvent: RequestEventBase): Promise<void> {
  try {
    const adminEmail = "admin@gmail.com";
    
    // Check if admin user already exists
    const checkResult = await executeQuery(
      requestEvent,
      `SELECT id FROM users WHERE email = ?`,
      [adminEmail]
    );
    
    if (checkResult.rows.length === 0) {
      console.log("Creating admin user...");
      
      // Hash the password
      const passwordHash = ""
      
      // Insert admin user
      const userResult = await executeQuery(
        requestEvent,
        `INSERT INTO users (email, password_hash, type) VALUES (?, ?, ?)`,
        [adminEmail, passwordHash, "admin"]
      );
      
      // Get the user ID and ensure it's a string/number
      const userId = String(userResult.lastInsertRowid);
      
      // Create administrator record
      await executeQuery(
        requestEvent,
        `INSERT INTO administrators (user_id, name, email) VALUES (?, ?, ?)`,
        [userId, "Administrator", adminEmail]
      );
      
      console.log("Admin user created successfully with administrator record");
    } else {
      console.log("Admin user already exists, checking for administrator record");
      
      // Get the user ID and ensure it's a string/number
      const userId = String(checkResult.rows[0].id);
      
      // Check if administrator record exists
      const adminResult = await executeQuery(
        requestEvent,
        `SELECT id FROM administrators WHERE user_id = ?`,
        [userId]
      );
      
      // If administrator record doesn't exist, create it
      if (adminResult.rows.length === 0) {
        console.log("Creating missing administrator record for existing user");
        await executeQuery(
          requestEvent,
          `INSERT INTO administrators (user_id, name, email) VALUES (?, ?, ?)`,
          [userId, "Administrator", adminEmail]
        );
        console.log("Administrator record created successfully");
      } else {
        console.log("Administrator record already exists");
      }
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
    throw error;
  }
}

export async function executeQuery(
  requestEvent: RequestEventBase,
  sql: string,
  args: QueryArgs = []
): Promise<QueryResult> {
  try {
    const client = tursoClient(requestEvent);
    return await client.execute({ sql, args });
  } catch (err: unknown) {
    console.error("Database query failed:", err instanceof Error ? err.message : err);
    throw new Error(`Database error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}