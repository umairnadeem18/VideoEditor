#[tauri::command]
fn app_status() -> String {
    "ok".to_string()
}

#[tauri::command]
fn save_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = keyring::Entry::new("research-agent", &provider).map_err(|e| e.to_string())?;
    entry.set_password(&key).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_api_key(provider: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new("research-agent", &provider).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(k) => Ok(Some(k)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn export_report(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_api_key(provider: String) -> Result<(), String> {
    let entry = keyring::Entry::new("research-agent", &provider).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri_plugin_sql::{Migration, MigrationKind};

fn migration(version: i64, sql: &'static str) -> Migration {
    Migration {
        version,
        description: "",
        sql,
        kind: MigrationKind::Up,
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(
                    "sqlite:agent.db",
                    vec![
                        migration(1, "CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, is_default INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));"),
                        migration(2, "CREATE TABLE IF NOT EXISTS profile_fields (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, key TEXT NOT NULL, value TEXT NOT NULL, UNIQUE(profile_id, key));"),
                        migration(3, "CREATE TABLE IF NOT EXISTS profile_links (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, platform TEXT NOT NULL, url TEXT NOT NULL, UNIQUE(profile_id, platform, url));"),
                        migration(4, "CREATE TABLE IF NOT EXISTS sources (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, UNIQUE(profile_id, name));"),
                        migration(5, "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));"),
                        migration(6, "CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE, path TEXT, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));"),
                    ],
                )
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            app_status,
            save_api_key,
            get_api_key,
            delete_api_key,
            export_report
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
