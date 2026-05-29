use serde::{Deserialize, Serialize};

/// 元器件
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Component {
    pub id: String,
    pub part_number: String,
    pub manufacturer: String,
    pub category: String,
    pub sub_category: String,
    pub description: String,
    pub package_type: String,
    pub specifications: String,
    pub datasheet_url: String,
    pub default_unit: String,
    pub is_active: bool,
    pub has_alternatives: Option<bool>,
    pub alternative_count: Option<i64>,
    pub used_in_boms: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建元器件请求
#[derive(Debug, Deserialize)]
pub struct CreateComponentRequest {
    pub part_number: String,
    #[serde(default)]
    pub manufacturer: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub sub_category: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub package_type: String,
    #[serde(default)]
    pub datasheet_url: String,
    #[serde(default = "default_unit")]
    pub default_unit: String,
}

/// 更新元器件请求
#[derive(Debug, Deserialize)]
pub struct UpdateComponentRequest {
    pub component_id: String,
    pub part_number: Option<String>,
    pub manufacturer: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub package_type: Option<String>,
    pub datasheet_url: Option<String>,
}

/// 替代料
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AlternativePart {
    pub id: String,
    pub original_component_id: String,
    pub alternative_component_id: String,
    pub alternative_component: Option<Component>,
    pub priority: i32,
    pub verification_status: String,
    pub notes: String,
    pub verified_by: Option<String>,
    pub verified_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 添加替代料请求
#[derive(Debug, Deserialize)]
pub struct AddAlternativeRequest {
    pub original_component_id: String,
    pub alternative_component_id: String,
    #[serde(default = "default_priority")]
    pub priority: i32,
    #[serde(default = "default_verification_status")]
    pub verification_status: String,
    #[serde(default)]
    pub notes: String,
}

/// 更新替代料请求
#[derive(Debug, Deserialize)]
pub struct UpdateAlternativeRequest {
    pub alternative_id: String,
    pub priority: Option<i32>,
    pub verification_status: Option<String>,
    pub notes: Option<String>,
    pub verified_by: Option<String>,
}

/// 元器件搜索参数
#[derive(Debug, Deserialize)]
pub struct ComponentSearchParams {
    pub keyword: Option<String>,
    pub category: Option<String>,
    pub manufacturer: Option<String>,
    pub has_alternatives: Option<bool>,
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_page_size")]
    pub page_size: i64,
}

fn default_unit() -> String { "PCS".to_string() }
fn default_priority() -> i32 { 1 }
fn default_verification_status() -> String { "unverified".to_string() }
fn default_page() -> i64 { 1 }
fn default_page_size() -> i64 { 20 }