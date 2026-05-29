/**
 * BOM版本和节点管理Tauri命令
 */
use crate::db::DbPool;
use crate::models::bom::*;
use sqlx::Row;
use uuid::Uuid;

/// 创建BOM版本
#[tauri::command]
pub async fn create_bom_version(
    db: tauri::State<'_, DbPool>,
    project_id: String,
    name: String,
    version_number: Option<String>,
    description: Option<String>,
    source_version_id: Option<String>,
    created_by: String,
) -> Result<BomVersion, String> {
    if name.is_empty() { return Err("BOM名称不能为空".to_string()); }

    let id = Uuid::new_v4().to_string();
    let ver = version_number.unwrap_or_else(|| "v1.0".to_string());
    let desc = description.unwrap_or_default();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 检查唯一性
    let exists = sqlx::query("SELECT id FROM bom_versions WHERE project_id = ? AND name = ? AND version_number = ?")
        .bind(&project_id).bind(&name).bind(&ver)
        .fetch_optional(db.as_ref()).await.map_err(|e| e.to_string())?;
    if exists.is_some() { return Err("同一项目下BOM名称+版本号已存在".to_string()); }

    // 如果有源版本，复制节点
    if let Some(ref src_id) = source_version_id {
        let src_exists = sqlx::query("SELECT id FROM bom_versions WHERE id = ?")
            .bind(src_id).fetch_optional(db.as_ref()).await.map_err(|e| e.to_string())?;
        if src_exists.is_none() { return Err("派生来源版本不存在".to_string()); }
    }

    sqlx::query("INSERT INTO bom_versions (id, project_id, name, version_number, status, source_version_id, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)")
        .bind(&id).bind(&project_id).bind(&name).bind(&ver)
        .bind(&source_version_id).bind(&desc).bind(&created_by).bind(&now).bind(&now)
        .execute(db.as_ref()).await.map_err(|e| e.to_string())?;

    // 如果有源版本，复制所有节点
    if let Some(ref src_id) = source_version_id {
        let src_nodes = sqlx::query("SELECT * FROM bom_nodes WHERE bom_version_id = ?")
            .bind(src_id).fetch_all(db.as_ref()).await.map_err(|e| e.to_string())?;

        let mut id_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();

        for node in &src_nodes {
            let old_id: String = node.get("id");
            let new_id = Uuid::new_v4().to_string();
            id_map.insert(old_id.clone(), new_id.clone());

            let old_parent_id: Option<String> = node.get("parent_id");
            let new_parent_id = old_parent_id.and_then(|pid| id_map.get(&pid).cloned());

            sqlx::query("INSERT INTO bom_nodes (id, bom_version_id, parent_id, component_id, node_type, name, quantity, unit, reference_designator, level, sort_order, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                .bind(&new_id).bind(&id)
                .bind(&new_parent_id)
                .bind(node.get::<Option<String>, _>("component_id"))
                .bind(node.get::<String, _>("node_type"))
                .bind(node.get::<String, _>("name"))
                .bind(node.get::<i32, _>("quantity"))
                .bind(node.get::<String, _>("unit"))
                .bind(node.get::<Option<String>, _>("reference_designator"))
                .bind(node.get::<i32, _>("level"))
                .bind(node.get::<i32, _>("sort_order"))
                .bind(node.get::<Option<String>, _>("notes"))
                .bind(&now).bind(&now)
                .execute(db.as_ref()).await.map_err(|e| e.to_string())?;
        }
    }

    Ok(BomVersion {
        id, project_id, name, version_number: ver, status: "draft".to_string(),
        source_version_id, description: desc, created_by, released_at: None,
        created_at: now.clone(), updated_at: now, node_count: Some(0),
    })
}

/// 获取BOM版本列表
#[tauri::command]
pub async fn list_bom_versions(
    db: tauri::State<'_, DbPool>,
    project_id: String,
    status: Option<String>,
) -> Result<Vec<BomVersion>, String> {
    let sql = if status.is_some() {
        "SELECT * FROM bom_versions WHERE project_id = ? AND status = ? ORDER BY created_at DESC"
    } else {
        "SELECT * FROM bom_versions WHERE project_id = ? ORDER BY created_at DESC"
    };

    let mut query = sqlx::query(sql).bind(&project_id);
    if let Some(ref s) = status { query = query.bind(s); }

    let rows = query.fetch_all(db.as_ref()).await.map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|r| BomVersion {
        id: r.get("id"),
        project_id: r.get("project_id"),
        name: r.get("name"),
        version_number: r.get("version_number"),
        status: r.get("status"),
        source_version_id: r.get("source_version_id"),
        description: r.get("description"),
        created_by: r.get("created_by"),
        released_at: r.get("released_at"),
        created_at: r.get("created_at"),
        updated_at: r.get("updated_at"),
        node_count: None,
    }).collect())
}

/// 获取BOM版本详情
#[tauri::command]
pub async fn get_bom_version(
    db: tauri::State<'_, DbPool>,
    version_id: String,
) -> Result<BomVersion, String> {
    let r = sqlx::query("SELECT * FROM bom_versions WHERE id = ?")
        .bind(&version_id).fetch_optional(db.as_ref()).await.map_err(|e| e.to_string())?;

    match r {
        Some(r) => Ok(BomVersion {
            id: r.get("id"), project_id: r.get("project_id"), name: r.get("name"),
            version_number: r.get("version_number"), status: r.get("status"),
            source_version_id: r.get("source_version_id"), description: r.get("description"),
            created_by: r.get("created_by"), released_at: r.get("released_at"),
            created_at: r.get("created_at"), updated_at: r.get("updated_at"), node_count: None,
        }),
        None => Err(format!("BOM版本 {} 不存在", version_id)),
    }
}

/// 发布BOM版本
#[tauri::command]
pub async fn release_bom_version(
    db: tauri::State<'_, DbPool>,
    version_id: String,
) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    sqlx::query("UPDATE bom_versions SET status = 'released', released_at = ?, updated_at = ? WHERE id = ? AND status = 'draft'")
        .bind(&now).bind(&now).bind(&version_id)
        .execute(db.as_ref()).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// 获取BOM树
#[tauri::command]
pub async fn get_bom_tree(
    db: tauri::State<'_, DbPool>,
    version_id: String,
) -> Result<Option<BomNode>, String> {
    let rows = sqlx::query("SELECT * FROM bom_nodes WHERE bom_version_id = ? ORDER BY sort_order, created_at")
        .bind(&version_id).fetch_all(db.as_ref()).await.map_err(|e| e.to_string())?;

    if rows.is_empty() { return Ok(None); }

    let mut nodes: Vec<BomNode> = rows.iter().map(|r| BomNode {
        id: r.get("id"), bom_version_id: r.get("bom_version_id"),
        parent_id: r.get("parent_id"), component_id: r.get("component_id"),
        node_type: r.get("node_type"), name: r.get("name"),
        quantity: r.get("quantity"), unit: r.get("unit"),
        reference_designator: r.get("reference_designator"),
        level: r.get("level"), sort_order: r.get("sort_order"),
        notes: r.get("notes"), has_alternatives: Some(false),
        children: vec![], created_at: r.get("created_at"), updated_at: r.get("updated_at"),
    }).collect();

    // 检查替代料
    for node in &mut nodes {
        if let Some(ref comp_id) = node.component_id {
            let alt_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM alternative_parts WHERE original_component_id = ?")
                .bind(comp_id).fetch_one(db.as_ref()).await.unwrap_or(0);
            node.has_alternatives = Some(alt_count > 0);
        }
    }

    // 构建树
    let node_map: std::collections::HashMap<String, usize> = nodes.iter().enumerate().map(|(i, n)| (n.id.clone(), i)).collect();
    let mut root: Option<BomNode> = None;
    let mut child_ids: Vec<(String, String)> = vec![]; // (parent_id, child_id)

    for node in &nodes {
        if let Some(ref parent_id) = node.parent_id {
            child_ids.push((parent_id.clone(), node.id.clone()));
        }
    }

    // 移动子节点到父节点
    for (parent_id, child_id) in &child_ids {
        if let (Some(&p_idx), Some(&c_idx)) = (node_map.get(parent_id), node_map.get(child_id)) {
            // 需要借用分离
        }
    }

    // 简化：使用单独的children收集
    let mut node_list: Vec<Option<BomNode>> = nodes.into_iter().map(Some).collect();
    let mut children_map: std::collections::HashMap<String, Vec<BomNode>> = std::collections::HashMap::new();

    for i in 0..node_list.len() {
        if let Some(ref node) = node_list[i] {
            if let Some(ref pid) = node.parent_id {
                if let Some(n) = node_list[i].take() {
                    children_map.entry(pid.clone()).or_default().push(n);
                }
            }
        }
    }

    // 递归构建树
    fn build_tree(
        node: &mut BomNode,
        children_map: &std::collections::HashMap<String, Vec<BomNode>>,
    ) {
        if let Some(children) = children_map.get(&node.id) {
            node.children = children.clone();
            for child in &mut node.children {
                build_tree(child, children_map);
            }
        }
    }

    // 找到根节点
    for item in &mut node_list {
        if let Some(ref mut node) = item {
            if node.parent_id.is_none() {
                build_tree(node, &children_map);
                root = Some(node.clone());
                break;
            }
        }
    }

    Ok(root)
}

/// 创建BOM节点
#[tauri::command]
pub async fn create_bom_node(
    db: tauri::State<'_, DbPool>,
    version_id: String,
    parent_id: Option<String>,
    node_type: String,
    name: String,
    quantity: i32,
    unit: Option<String>,
    component_id: Option<String>,
    reference_designator: Option<String>,
    notes: Option<String>,
) -> Result<BomNode, String> {
    if name.is_empty() { return Err("节点名称不能为空".to_string()); }
    if quantity <= 0 { return Err("数量必须大于0".to_string()); }
    if node_type != "assembly" && node_type != "component" { return Err("节点类型不正确".to_string()); }
    if node_type == "component" && component_id.is_none() {
        return Err("元器件类型节点必须提供component_id".to_string());
    }

    // 检查版本状态
    let version = sqlx::query("SELECT status FROM bom_versions WHERE id = ?")
        .bind(&version_id).fetch_one(db.as_ref()).await.map_err(|e| e.to_string())?;
    let status: String = version.get("status");
    if status != "draft" { return Err("该版本已发布，不可修改".to_string()); }

    // 计算层级
    let (level, parent_ver_id) = if let Some(ref pid) = parent_id {
        let parent = sqlx::query("SELECT level, bom_version_id FROM bom_nodes WHERE id = ?")
            .bind(pid).fetch_one(db.as_ref()).await.map_err(|e| e.to_string())?;
        let plevel: i32 = parent.get("level");
        if plevel >= 10 { return Err("已达到最大层级深度(10级)".to_string()); }
        (plevel + 1, parent.get::<String, _>("bom_version_id"))
    } else {
        (0, version_id.clone())
    };

    // 检查同名
    let dup = if let Some(ref pid) = parent_id {
        sqlx::query("SELECT id FROM bom_nodes WHERE bom_version_id = ? AND parent_id = ? AND name = ?")
            .bind(&version_id).bind(pid).bind(&name)
            .fetch_optional(db.as_ref()).await.map_err(|e| e.to_string())?
    } else {
        sqlx::query("SELECT id FROM bom_nodes WHERE bom_version_id = ? AND parent_id IS NULL AND name = ?")
            .bind(&version_id).bind(&name)
            .fetch_optional(db.as_ref()).await.map_err(|e| e.to_string())?
    };
    if dup.is_some() { return Err("同一父节点下已存在同名节点".to_string()); }

    // 计算排序
    let max_order: i32 = if let Some(ref pid) = parent_id {
        sqlx::query_scalar("SELECT COALESCE(MAX(sort_order), 0) FROM bom_nodes WHERE bom_version_id = ? AND parent_id = ?")
            .bind(&version_id).bind(pid).fetch_one(db.as_ref()).await.unwrap_or(0)
    } else {
        sqlx::query_scalar("SELECT COALESCE(MAX(sort_order), 0) FROM bom_nodes WHERE bom_version_id = ? AND parent_id IS NULL")
            .bind(&version_id).fetch_one(db.as_ref()).await.unwrap_or(0)
    };

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let unit = unit.unwrap_or_else(|| "PCS".to_string());
    let ref_des = reference_designator.unwrap_or_default();
    let note = notes.unwrap_or_default();

    sqlx::query("INSERT INTO bom_nodes (id, bom_version_id, parent_id, component_id, node_type, name, quantity, unit, reference_designator, level, sort_order, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&id).bind(&version_id).bind(&parent_id).bind(&component_id)
        .bind(&node_type).bind(&name).bind(quantity).bind(&unit)
        .bind(&ref_des).bind(level).bind(max_order + 1).bind(&note).bind(&now).bind(&now)
        .execute(db.as_ref()).await.map_err(|e| e.to_string())?;

    Ok(BomNode {
        id, bom_version_id: version_id, parent_id, component_id, node_type, name,
        quantity, unit, reference_designator: Some(ref_des), level,
        sort_order: max_order + 1, notes: Some(note), has_alternatives: Some(false),
        children: vec![], created_at: now.clone(), updated_at: now,
    })
}

/// 更新BOM节点
#[tauri::command]
pub async fn update_bom_node(
    db: tauri::State<'_, DbPool>,
    node_id: String,
    name: Option<String>,
    quantity: Option<i32>,
    unit: Option<String>,
    reference_designator: Option<String>,
    notes: Option<String>,
) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let mut updates = vec!["updated_at = ?".to_string()];
    if name.is_some() { updates.push("name = ?".to_string()); }
    if quantity.is_some() { updates.push("quantity = ?".to_string()); }
    if unit.is_some() { updates.push("unit = ?".to_string()); }
    if reference_designator.is_some() { updates.push("reference_designator = ?".to_string()); }
    if notes.is_some() { updates.push("notes = ?".to_string()); }

    let sql = format!("UPDATE bom_nodes SET {} WHERE id = ?", updates.join(", "));
    let mut query = sqlx::query(&sql).bind(&now);
    if let Some(ref n) = name { query = query.bind(n); }
    if let Some(q) = quantity { query = query.bind(q); }
    if let Some(ref u) = unit { query = query.bind(u); }
    if let Some(ref r) = reference_designator { query = query.bind(r); }
    if let Some(ref nt) = notes { query = query.bind(nt); }
    query = query.bind(&node_id);

    query.execute(db.as_ref()).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// 删除BOM节点（级联删除子节点）
#[tauri::command]
pub async fn delete_bom_node(
    db: tauri::State<'_, DbPool>,
    node_id: String,
) -> Result<serde_json::Value, String> {
    // 统计要删除的节点数
    let count: i64 = sqlx::query_scalar(
        "WITH RECURSIVE descendants(id) AS (SELECT ? UNION ALL SELECT n.id FROM bom_nodes n JOIN descendants d ON n.parent_id = d.id) SELECT COUNT(*) FROM descendants"
    )
    .bind(&node_id).fetch_one(db.as_ref()).await.unwrap_or(1);

    // 级联删除
    sqlx::query(
        "WITH RECURSIVE descendants(id) AS (SELECT ? UNION ALL SELECT n.id FROM bom_nodes n JOIN descendants d ON n.parent_id = d.id) DELETE FROM bom_nodes WHERE id IN (SELECT id FROM descendants)"
    )
    .bind(&node_id).execute(db.as_ref()).await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "deletedNodeId": node_id,
        "deletedCount": count
    }))
}

/// 移动BOM节点
#[tauri::command]
pub async fn move_bom_node(
    db: tauri::State<'_, DbPool>,
    node_id: String,
    new_parent_id: Option<String>,
    new_sort_order: Option<i32>,
) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 计算新层级
    let new_level = if let Some(ref pid) = new_parent_id {
        let parent = sqlx::query("SELECT level FROM bom_nodes WHERE id = ?")
            .bind(pid).fetch_one(db.as_ref()).await.map_err(|e| e.to_string())?;
        let plevel: i32 = parent.get("level");
        if plevel >= 10 { return Err("移动后层级超过10级".to_string()); }
        plevel + 1
    } else {
        0
    };

    let order = new_sort_order.unwrap_or(0);

    sqlx::query("UPDATE bom_nodes SET parent_id = ?, level = ?, sort_order = ?, updated_at = ? WHERE id = ?")
        .bind(&new_parent_id).bind(new_level).bind(order).bind(&now).bind(&node_id)
        .execute(db.as_ref()).await.map_err(|e| e.to_string())?;

    Ok(())
}

/// 对比BOM版本
#[tauri::command]
pub async fn compare_bom_versions(
    db: tauri::State<'_, DbPool>,
    source_version_id: String,
    target_version_id: String,
) -> Result<BomCompareResult, String> {
    if source_version_id == target_version_id {
        return Err("请选择不同的版本进行对比".to_string());
    }

    // 获取两个版本的信息
    let src = get_bom_version(db.clone(), source_version_id.clone()).await?;
    let tgt = get_bom_version(db.clone(), target_version_id.clone()).await?;

    // 获取两个版本的节点
    let src_nodes = sqlx::query("SELECT id, name, node_type, quantity FROM bom_nodes WHERE bom_version_id = ?")
        .bind(&source_version_id).fetch_all(db.as_ref()).await.map_err(|e| e.to_string())?;
    let tgt_nodes = sqlx::query("SELECT id, name, node_type, quantity FROM bom_nodes WHERE bom_version_id = ?")
        .bind(&target_version_id).fetch_all(db.as_ref()).await.map_err(|e| e.to_string())?;

    let src_map: std::collections::HashMap<String, (String, i32)> = src_nodes.iter().map(|r| {
        let name: String = r.get("name");
        let qty: i32 = r.get("quantity");
        (name.clone(), (r.get("id"), qty))
    }).collect();

    let tgt_map: std::collections::HashMap<String, (String, i32)> = tgt_nodes.iter().map(|r| {
        let name: String = r.get("name");
        let qty: i32 = r.get("quantity");
        (name.clone(), (r.get("id"), qty))
    }).collect();

    let mut differences = vec![];
    let (mut added, mut removed, mut modified) = (0, 0, 0);

    // 检查新增和修改
    for (name, (tid, tqty)) in &tgt_map {
        if let Some((sid, sqty)) = src_map.get(name) {
            if tqty != sqty {
                modified += 1;
                differences.push(BomDifference {
                    diff_type: "modified".to_string(),
                    node_id: tid.clone(),
                    name: name.clone(),
                    details: None,
                    changes: Some(vec![FieldChange {
                        field: "quantity".to_string(),
                        old_value: sqty.to_string(),
                        new_value: tqty.to_string(),
                    }]),
                });
            }
        } else {
            added += 1;
            differences.push(BomDifference {
                diff_type: "added".to_string(),
                node_id: tid.clone(),
                name: name.clone(),
                details: Some("新增节点".to_string()),
                changes: None,
            });
        }
    }

    // 检查删除
    for (name, (sid, _)) in &src_map {
        if !tgt_map.contains_key(name) {
            removed += 1;
            differences.push(BomDifference {
                diff_type: "removed".to_string(),
                node_id: sid.clone(),
                name: name.clone(),
                details: Some("删除节点".to_string()),
                changes: None,
            });
        }
    }

    Ok(BomCompareResult {
        source_version: BomVersionRef { id: src.id, version_number: src.version_number },
        target_version: BomVersionRef { id: tgt.id, version_number: tgt.version_number },
        differences,
        summary: CompareSummary { added, removed, modified, total_changes: added + removed + modified },
    })
}

/// 获取变更历史
#[tauri::command]
pub async fn get_change_history(
    db: tauri::State<'_, DbPool>,
    bom_version_id: String,
    node_id: Option<String>,
    change_type: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<crate::errors::PaginatedResponse<ChangeHistory>, String> {
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let mut where_clauses = vec!["bom_version_id = ?".to_string()];
    if node_id.is_some() { where_clauses.push("node_id = ?".to_string()); }
    if change_type.is_some() { where_clauses.push("change_type = ?".to_string()); }
    let where_sql = where_clauses.join(" AND ");

    let count_sql = format!("SELECT COUNT(*) FROM change_history WHERE {}", where_sql);
    let mut count_q = sqlx::query(&count_sql).bind(&bom_version_id);
    if let Some(ref nid) = node_id { count_q = count_q.bind(nid); }
    if let Some(ref ct) = change_type { count_q = count_q.bind(ct); }
    let total: i64 = count_q.fetch_one(db.as_ref()).await.map(|r| r.get(0)).unwrap_or(0);

    let query_sql = format!("SELECT * FROM change_history WHERE {} ORDER BY created_at DESC LIMIT ? OFFSET ?", where_sql);
    let mut query = sqlx::query(&query_sql).bind(&bom_version_id);
    if let Some(ref nid) = node_id { query = query.bind(nid); }
    if let Some(ref ct) = change_type { query = query.bind(ct); }
    query = query.bind(page_size).bind(offset);

    let rows = query.fetch_all(db.as_ref()).await.map_err(|e| e.to_string())?;
    let items: Vec<ChangeHistory> = rows.iter().map(|r| ChangeHistory {
        id: r.get("id"), bom_version_id: r.get("bom_version_id"),
        node_id: r.get("node_id"), change_type: r.get("change_type"),
        field_name: r.get("field_name"), old_value: r.get("old_value"),
        new_value: r.get("new_value"), change_summary: r.get("change_summary"),
        changed_by: r.get("changed_by"), created_at: r.get("created_at"),
    }).collect();

    Ok(crate::errors::PaginatedResponse { items, total, page, page_size, total_pages: (total + page_size - 1) / page_size })
}