/**
 * 元器件和替代料管理Tauri命令
 */
use crate::db::DbPool;
use crate::errors::PaginatedResponse;
use crate::models::component::*;
use sqlx::Row;
use uuid::Uuid;

/// 创建元器件
#[tauri::command]
pub async fn create_component(
    db: tauri::State<'_, DbPool>,
    part_number: String,
    manufacturer: Option<String>,
    category: Option<String>,
    sub_category: Option<String>,
    description: Option<String>,
    package_type: Option<String>,
    datasheet_url: Option<String>,
    default_unit: Option<String>,
) -> Result<Component, String> {
    if part_number.is_empty() { return Err("型号不能为空".to_string()); }

    let mfr = manufacturer.unwrap_or_default();
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 检查唯一性
    let exists = sqlx::query("SELECT id FROM components WHERE part_number = ? AND manufacturer = ?")
        .bind(&part_number).bind(&mfr).fetch_optional(db.as_ref()).await.map_err(|e| e.to_string())?;
    if exists.is_some() { return Err("同厂商下型号已存在".to_string()); }

    sqlx::query("INSERT INTO components (id, part_number, manufacturer, category, sub_category, description, package_type, specifications, datasheet_url, default_unit, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, 1, ?, ?)")
        .bind(&id).bind(&part_number).bind(&mfr)
        .bind(&category.unwrap_or_default())
        .bind(&sub_category.unwrap_or_default())
        .bind(&description.unwrap_or_default())
        .bind(&package_type.unwrap_or_default())
        .bind(&datasheet_url.unwrap_or_default())
        .bind(&default_unit.unwrap_or_else(|| "PCS".to_string()))
        .bind(&now).bind(&now)
        .execute(db.as_ref()).await.map_err(|e| e.to_string())?;

    Ok(Component {
        id, part_number, manufacturer: mfr, category: category.unwrap_or_default(),
        sub_category: sub_category.unwrap_or_default(), description: description.unwrap_or_default(),
        package_type: package_type.unwrap_or_default(), specifications: "{}".to_string(),
        datasheet_url: datasheet_url.unwrap_or_default(),
        default_unit: default_unit.unwrap_or_else(|| "PCS".to_string()),
        is_active: true, has_alternatives: Some(false), alternative_count: Some(0),
        used_in_boms: Some(0), created_at: now.clone(), updated_at: now,
    })
}

/// 搜索元器件
#[tauri::command]
pub async fn search_components(
    db: tauri::State<'_, DbPool>,
    keyword: Option<String>,
    category: Option<String>,
    manufacturer: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<PaginatedResponse<Component>, String> {
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut where_clauses = vec!["is_active = 1".to_string()];
    if let Some(ref kw) = keyword {
        if !kw.is_empty() {
            where_clauses.push("(part_number LIKE ? OR description LIKE ? OR manufacturer LIKE ?)".to_string());
        }
    }
    if category.is_some() { where_clauses.push("category = ?".to_string()); }
    if manufacturer.is_some() { where_clauses.push("manufacturer = ?".to_string()); }

    let where_sql = where_clauses.join(" AND ");

    // Count
    let count_sql = format!("SELECT COUNT(*) FROM components WHERE {}", where_sql);
    let mut count_q = sqlx::query(&count_sql);
    if let Some(ref kw) = keyword { if !kw.is_empty() { let p = format!("%{}%", kw); count_q = count_q.bind(&p).bind(&p).bind(&p); } }
    if let Some(ref c) = category { count_q = count_q.bind(c); }
    if let Some(ref m) = manufacturer { count_q = count_q.bind(m); }
    let total: i64 = count_q.fetch_one(db.as_ref()).await.map(|r| r.get(0)).unwrap_or(0);

    // Query
    let query_sql = format!("SELECT * FROM components WHERE {} ORDER BY updated_at DESC LIMIT ? OFFSET ?", where_sql);
    let mut query = sqlx::query(&query_sql);
    if let Some(ref kw) = keyword { if !kw.is_empty() { let p = format!("%{}%", kw); query = query.bind(&p).bind(&p).bind(&p); } }
    if let Some(ref c) = category { query = query.bind(c); }
    if let Some(ref m) = manufacturer { query = query.bind(m); }
    query = query.bind(page_size).bind(offset);

    let rows = query.fetch_all(db.as_ref()).await.map_err(|e| e.to_string())?;

    let items: Vec<Component> = rows.iter().map(|r| Component {
        id: r.get("id"), part_number: r.get("part_number"), manufacturer: r.get("manufacturer"),
        category: r.get("category"), sub_category: r.get("sub_category"),
        description: r.get("description"), package_type: r.get("package_type"),
        specifications: r.get("specifications"), datasheet_url: r.get("datasheet_url"),
        default_unit: r.get("default_unit"), is_active: r.get::<bool, _>("is_active"),
        has_alternatives: None, alternative_count: None, used_in_boms: None,
        created_at: r.get("created_at"), updated_at: r.get("updated_at"),
    }).collect();

    Ok(PaginatedResponse { items, total, page, page_size, total_pages: (total + page_size - 1) / page_size })
}

/// 获取元器件详情
#[tauri::command]
pub async fn get_component(
    db: tauri::State<'_, DbPool>,
    component_id: String,
) -> Result<Component, String> {
    let r = sqlx::query("SELECT * FROM components WHERE id = ?")
        .bind(&component_id).fetch_optional(db.as_ref()).await.map_err(|e| e.to_string())?;

    match r {
        Some(r) => {
            let alt_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM alternative_parts WHERE original_component_id = ?")
                .bind(&component_id).fetch_one(db.as_ref()).await.unwrap_or(0);
            let used: i64 = sqlx::query_scalar("SELECT COUNT(DISTINCT bom_version_id) FROM bom_nodes WHERE component_id = ?")
                .bind(&component_id).fetch_one(db.as_ref()).await.unwrap_or(0);

            Ok(Component {
                id: r.get("id"), part_number: r.get("part_number"), manufacturer: r.get("manufacturer"),
                category: r.get("category"), sub_category: r.get("sub_category"),
                description: r.get("description"), package_type: r.get("package_type"),
                specifications: r.get("specifications"), datasheet_url: r.get("datasheet_url"),
                default_unit: r.get("default_unit"), is_active: r.get::<bool, _>("is_active"),
                has_alternatives: Some(alt_count > 0), alternative_count: Some(alt_count),
                used_in_boms: Some(used), created_at: r.get("created_at"), updated_at: r.get("updated_at"),
            })
        }
        None => Err(format!("元器件 {} 不存在", component_id)),
    }
}

/// 更新元器件
#[tauri::command]
pub async fn update_component(
    db: tauri::State<'_, DbPool>,
    component_id: String,
    part_number: Option<String>,
    manufacturer: Option<String>,
    category: Option<String>,
    description: Option<String>,
    package_type: Option<String>,
    datasheet_url: Option<String>,
) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut updates = vec!["updated_at = ?".to_string()];
    if part_number.is_some() { updates.push("part_number = ?".to_string()); }
    if manufacturer.is_some() { updates.push("manufacturer = ?".to_string()); }
    if category.is_some() { updates.push("category = ?".to_string()); }
    if description.is_some() { updates.push("description = ?".to_string()); }
    if package_type.is_some() { updates.push("package_type = ?".to_string()); }
    if datasheet_url.is_some() { updates.push("datasheet_url = ?".to_string()); }

    let sql = format!("UPDATE components SET {} WHERE id = ?", updates.join(", "));
    let mut query = sqlx::query(&sql).bind(&now);
    if let Some(ref v) = part_number { query = query.bind(v); }
    if let Some(ref v) = manufacturer { query = query.bind(v); }
    if let Some(ref v) = category { query = query.bind(v); }
    if let Some(ref v) = description { query = query.bind(v); }
    if let Some(ref v) = package_type { query = query.bind(v); }
    if let Some(ref v) = datasheet_url { query = query.bind(v); }
    query = query.bind(&component_id);

    query.execute(db.as_ref()).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// 获取替代料列表
#[tauri::command]
pub async fn list_alternative_parts(
    db: tauri::State<'_, DbPool>,
    component_id: String,
) -> Result<Vec<AlternativePart>, String> {
    let rows = sqlx::query("SELECT ap.*, c.part_number, c.manufacturer, c.category FROM alternative_parts ap JOIN components c ON ap.alternative_component_id = c.id WHERE ap.original_component_id = ? ORDER BY ap.priority")
        .bind(&component_id).fetch_all(db.as_ref()).await.map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|r| AlternativePart {
        id: r.get("id"), original_component_id: r.get("original_component_id"),
        alternative_component_id: r.get("alternative_component_id"),
        alternative_component: Some(Component {
            id: r.get("alternative_component_id"),
            part_number: r.get("part_number"), manufacturer: r.get("manufacturer"),
            category: r.get("category"), sub_category: String::new(), description: String::new(),
            package_type: String::new(), specifications: String::new(), datasheet_url: String::new(),
            default_unit: "PCS".to_string(), is_active: true, has_alternatives: None,
            alternative_count: None, used_in_boms: None, created_at: String::new(), updated_at: String::new(),
        }),
        priority: r.get("priority"), verification_status: r.get("verification_status"),
        notes: r.get("notes"), verified_by: r.get("verified_by"), verified_at: r.get("verified_at"),
        created_at: r.get("created_at"), updated_at: r.get("updated_at"),
    }).collect())
}

/// 添加替代料
#[tauri::command]
pub async fn add_alternative_part(
    db: tauri::State<'_, DbPool>,
    original_component_id: String,
    alternative_component_id: String,
    priority: Option<i32>,
    verification_status: Option<String>,
    notes: Option<String>,
) -> Result<AlternativePart, String> {
    if original_component_id == alternative_component_id {
        return Err("替代料不能与原件相同".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    sqlx::query("INSERT INTO alternative_parts (id, original_component_id, alternative_component_id, priority, verification_status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&id).bind(&original_component_id).bind(&alternative_component_id)
        .bind(priority.unwrap_or(1))
        .bind(verification_status.as_deref().unwrap_or("unverified"))
        .bind(&notes.unwrap_or_default())
        .bind(&now).bind(&now)
        .execute(db.as_ref()).await.map_err(|e| e.to_string())?;

    Ok(AlternativePart {
        id, original_component_id, alternative_component_id, alternative_component: None,
        priority: priority.unwrap_or(1),
        verification_status: verification_status.unwrap_or_else(|| "unverified".to_string()),
        notes: notes.unwrap_or_default(), verified_by: None, verified_at: None,
        created_at: now.clone(), updated_at: now,
    })
}

/// 删除替代料
#[tauri::command]
pub async fn remove_alternative_part(
    db: tauri::State<'_, DbPool>,
    alternative_id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM alternative_parts WHERE id = ?")
        .bind(&alternative_id).execute(db.as_ref()).await.map_err(|e| e.to_string())?;
    Ok(())
}