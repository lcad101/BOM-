use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::sync::Arc;

pub type DbPool = Arc<SqlitePool>;

/// Initialize database connection pool
pub async fn init_pool(database_url: &str) -> Result<DbPool, sqlx::Error> {
    let options = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;
    
    Ok(Arc::new(options))
}

/// Create database file if not exists
pub async fn ensure_db_file(db_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = std::path::Path::new(db_path);
    
    // Create parent directories if needed
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)?;
        }
    }
    
    // Create empty database file if it doesn't exist
    if !path.exists() {
        std::fs::File::create(path)?;
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_init_pool() {
        let db_url = "sqlite::memory:";
        let pool = init_pool(db_url).await;
        assert!(pool.is_ok());
    }
}
