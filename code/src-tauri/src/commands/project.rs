/**
 * 项目管理Tauri命令
 */
use crate::db::DbPool;
use crate::errors::AppError;
use crate::models::project::*;
use crate::errors::PaginatedResponse;
use serde::Serialize;
use sqlx::Row;
use uuid::Uuid;

/// 创建项目
#[tauri::command]
pub async fn create_project(
    db: tauri::State<'_, DbPool>,
    name: String,
    project_code: String,
    description: String,
    owner: String,
) -> Result<Project, String> {
    // 参数校验
    if name.is_empty() {
        return Err("项目名称不能为空".to_string());
    }
    if project_code.is_empty() {
        return Err("项目编号不能为空".to_string());
    }
    if owner.is_empty() {
        return Err("负责人不能为空".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 检查名称和编号唯一性
    let existing = sqlx::query("SELECT id FROM projects WHERE name = ? OR project_code = ?")
        .bind(&name)
        .bind(&project_code)
        .fetch_optional(db.as_ref())
        .await
        .map_err(|e| format!("数据库查询失败: {}", e))?;

    if existing.is_some() {
        return Err("项目名称或编号已存在".to_string());
    }

    sqlx::query(
        "INSERT INTO projects (id, name, project_code, description, owner, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)"
    )
    .bind(&id)
    .bind(&name)
    .bind(&project_code)
    .bind(&description)
    .bind(&owner)
    .bind(&now)
    .bind(&now)
    .execute(db.as_ref())
    .await
    .map_err(|e| format!("创建项目失败: {}", e))?;

    Ok(Project {
        id,
        name,
        project_code,
        description,
        owner,
        status: "active".to_string(),
        created_at: now.clone(),
        updated_at: now,
        deleted_at: None,
        bom_count: Some(0),
    })
}

/// 获取项目列表
#[tauri::command]
pub async fn list_projects(
    db: tauri::State<'_, DbPool>,
    status: Option<String>,
    keyword: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
    sort_by: Option<String>,
    sort_order: Option<String>,
) -> Result<PaginatedResponse<Project>, String> {
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let sort_by = sort_by.unwrap_or_else(|| "updated_at".to_string());
    let sort_order = sort_order.unwrap_or_else(|| "desc".to_string());
    let status_filter = status.unwrap_or_else(|| "active".to_string());

    // 构建查询
    let mut where_clauses = vec!["status = ?".to_string()];
    if let Some(ref kw) = keyword {
        if !kw.is_empty() {
            where_clauses.push("(name LIKE ? OR project_code LIKE ?)".to_string());
        }
    }

    let where_sql = where_clauses.join(" AND ");
    let order_sql = format!("{} {}", sort_by, if sort_order == "asc" { "ASC" } else { "DESC" });

    // 计算总数
    let count_sql = format!("SELECT COUNT(*) as cnt FROM projects WHERE {}", where_sql);
    let mut count_query = sqlx::query(&count_sql).bind(&status_filter);
    if let Some(ref kw) = keyword {
        if !kw.is_empty() {
            let like_pattern = format!("%{}%", kw);
            count_query = count_query.bind(&like_pattern).bind(&like_pattern);
        }
    }
    let total: i64 = count_query
        .fetch_one(db.as_ref())
        .await
        .map(|r| r.get("cnt"))
        .unwrap_or(0);

    // 查询列表
    let query_sql = format!(
        "SELECT id, name, project_code, description, owner, status, created_at, updated_at, deleted_at FROM projects WHERE {} ORDER BY {} LIMIT ? OFFSET ?",
        where_sql, order_sql
    );
    let mut query = sqlx::query(&query_sql).bind(&status_filter);
    if let Some(ref kw) = keyword {
        if !kw.is_empty() {
            let like_pattern = format!("%{}%", kw);
            query = query.bind(&like_pattern).bind(&like_pattern);
        }
    }
    query = query.bind(page_size).bind(offset);

    let rows = query.fetch_all(db.as_ref()).await.map_err(|e| format!("查询失败: {}", e))?;

    let items: Vec<Project> = rows.iter().map(|r| Project {
        id: r.get("id"),
        name: r.get("name"),
        project_code: r.get("project_code"),
        description: r.get("description"),
        owner: r.get("owner"),
        status: r.get("status"),
        created_at: r.get("created_at"),
        updated_at: r.get("updated_at"),
        deleted_at: r.get("deleted_at"),
        bom_count: None,
    }).collect();

    let total_pages = (total + page_size - 1) / page_size;

    Ok(PaginatedResponse {
        items,
        total,
        page,
        page_size,
        total_pages,
    })
}

/// 获取项目详情
#[tauri::command]
pub async fn get_project(
    db: tauri::State<'_, DbPool>,
    project_id: String,
) -> Result<Project, String> {
    let row = sqlx::query(
        "SELECT id, name, project_code, description, owner, status, created_at, updated_at, deleted_at FROM projects WHERE id = ?"
    )
    .bind(&project_id)
    .fetch_optional(db.as_ref())
    .await
    .map_err(|e| format!("查询失败: {}", e))?;

    match row {
        Some(r) => {
            // 查询BOM数量
            let bom_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM bom_versions WHERE project_id = ?")
                .bind(&project_id)
                .fetch_one(db.as_ref())
                .await
                .unwrap_or(0);

            Ok(Project {
                id: r.get("id"),
                name: r.get("name"),
                project_code: r.get("project_code"),
                description: r.get("description"),
                owner: r.get("owner"),
                status: r.get("status"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
                deleted_at: r.get("deleted_at"),
                bom_count: Some(bom_count),
            })
        }
        None => Err(format!("项目 {} 不存在", project_id)),
    }
}

/// 更新项目
#[tauri::command]
pub async fn update_project(
    db: tauri::State<'_, DbPool>,
    project_id: String,
    name: Option<String>,
    description: Option<String>,
    owner: Option<String>,
) -> Result<Project, String> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 检查项目是否存在
    let existing = sqlx::query("SELECT id FROM projects WHERE id = ?")
        .bind(&project_id)
        .fetch_optional(db.as_ref())
        .await
        .map_err(|e| format!("查询失败: {}", e))?;

    if existing.is_none() {
        return Err(format!("项目 {} 不存在", project_id));
    }

    // 动态构建更新语句
    let mut updates = vec!["updated_at = ?".to_string()];
    if name.is_some() { updates.push("name = ?".to_string()); }
    if description.is_some() { updates.push("description = ?".to_string()); }
    if owner.is_some() { updates.push("owner = ?".to_string()); }

    let sql = format!("UPDATE projects SET {} WHERE id = ?", updates.join(", "));
    let mut query = sqlx::query(&sql).bind(&now);
    if let Some(ref n) = name { query = query.bind(n); }
    if let Some(ref d) = description { query = query.bind(d); }
    if let Some(ref o) = owner { query = query.bind(o); }
    query = query.bind(&project_id);

    query.execute(db.as_ref()).await.map_err(|e| format!("更新失败: {}", e))?;

    // 返回更新后的项目
    get_project(db, project_id).await
}

/// 归档项目
#[tauri::command]
pub async fn archive_project(
    db: tauri::State<'_, DbPool>,
    project_id: String,
) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    sqlx::query("UPDATE projects SET status = 'archived', updated_at = ? WHERE id = ?")
        .bind(&now)
        .bind(&project_id)
        .execute(db.as_ref())
        .await
        .map_err(|e| format!("归档失败: {}", e))?;
    Ok(())
}

/// 删除项目（软删除）
#[tauri::command]
pub async fn delete_project(
    db: tauri::State<'_, DbPool>,
    project_id: String,
    permanent: Option<bool>,
) -> Result<(), String> {
    let permanent = permanent.unwrap_or(false);
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    if permanent {
        sqlx::query("DELETE FROM projects WHERE id = ?")
            .bind(&project_id)
            .execute(db.as_ref())
            .await
            .map_err(|e| format!("删除失败: {}", e))?;
    } else {
        sqlx::query("UPDATE projects SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(&now)
            .bind(&project_id)
            .execute(db.as_ref())
            .await
            .map_err(|e| format!("删除失败: {}", e))?;
    }
    Ok(())
}