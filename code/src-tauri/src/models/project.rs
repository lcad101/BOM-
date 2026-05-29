use serde::{Deserialize, Serialize};
use chrono::NaiveDateTime;

/// 项目数据模型
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub project_code: String,
    pub description: String,
    pub owner: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bom_count: Option<i64>,
}

/// 创建项目请求
#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub project_code: String,
    #[serde(default)]
    pub description: String,
    pub owner: String,
}

/// 更新项目请求
#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    pub project_id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub owner: Option<String>,
}

/// 项目查询参数
#[derive(Debug, Deserialize)]
pub struct ProjectQueryParams {
    pub status: Option<String>,
    pub keyword: Option<String>,
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_page_size")]
    pub page_size: i64,
    #[serde(default = "default_sort_by")]
    pub sort_by: String,
    #[serde(default = "default_sort_order")]
    pub sort_order: String,
}

fn default_page() -> i64 { 1 }
fn default_page_size() -> i64 { 20 }
fn default_sort_by() -> String { "updated_at".to_string() }
fn default_sort_order() -> String { "desc".to_string() }