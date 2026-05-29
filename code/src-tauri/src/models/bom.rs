use serde::{Deserialize, Serialize};

/// BOM版本
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BomVersion {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub version_number: String,
    pub status: String,
    pub source_version_id: Option<String>,
    pub description: String,
    pub created_by: String,
    pub released_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_count: Option<i64>,
}

/// BOM节点
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BomNode {
    pub id: String,
    pub bom_version_id: String,
    pub parent_id: Option<String>,
    pub component_id: Option<String>,
    pub node_type: String,
    pub name: String,
    pub quantity: i32,
    pub unit: String,
    pub reference_designator: Option<String>,
    pub level: i32,
    pub sort_order: i32,
    pub notes: Option<String>,
    pub has_alternatives: Option<bool>,
    pub children: Vec<BomNode>,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建BOM版本请求
#[derive(Debug, Deserialize)]
pub struct CreateBomVersionRequest {
    pub project_id: String,
    pub name: String,
    #[serde(default = "default_version")]
    pub version_number: String,
    #[serde(default)]
    pub description: String,
    pub source_version_id: Option<String>,
    pub created_by: String,
}

/// 创建BOM节点请求
#[derive(Debug, Deserialize)]
pub struct CreateBomNodeRequest {
    pub version_id: String,
    pub parent_id: Option<String>,
    pub node_type: String,
    pub name: String,
    #[serde(default = "default_quantity")]
    pub quantity: i32,
    #[serde(default = "default_unit")]
    pub unit: String,
    pub component_id: Option<String>,
    #[serde(default)]
    pub reference_designator: String,
    #[serde(default)]
    pub notes: String,
}

/// 更新BOM节点请求
#[derive(Debug, Deserialize)]
pub struct UpdateBomNodeRequest {
    pub node_id: String,
    pub name: Option<String>,
    pub quantity: Option<i32>,
    pub unit: Option<String>,
    pub reference_designator: Option<String>,
    pub notes: Option<String>,
}

/// 移动BOM节点请求
#[derive(Debug, Deserialize)]
pub struct MoveBomNodeRequest {
    pub node_id: String,
    pub new_parent_id: Option<String>,
    pub new_sort_order: Option<i32>,
}

/// 变更历史
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChangeHistory {
    pub id: String,
    pub bom_version_id: String,
    pub node_id: Option<String>,
    pub change_type: String,
    pub field_name: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub change_summary: String,
    pub changed_by: String,
    pub created_at: String,
}

/// BOM版本对比差异
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BomDifference {
    pub diff_type: String, // added, removed, modified
    pub node_id: String,
    pub name: String,
    pub details: Option<String>,
    pub changes: Option<Vec<FieldChange>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FieldChange {
    pub field: String,
    pub old_value: String,
    pub new_value: String,
}

/// BOM版本对比结果
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BomCompareResult {
    pub source_version: BomVersionRef,
    pub target_version: BomVersionRef,
    pub differences: Vec<BomDifference>,
    pub summary: CompareSummary,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BomVersionRef {
    pub id: String,
    pub version_number: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompareSummary {
    pub added: i32,
    pub removed: i32,
    pub modified: i32,
    pub total_changes: i32,
}

fn default_version() -> String { "v1.0".to_string() }
fn default_quantity() -> i32 { 1 }
fn default_unit() -> String { "PCS".to_string() }