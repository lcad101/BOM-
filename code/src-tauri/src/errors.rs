/**
 * 统一错误定义
 */
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("业务错误: {0}")]
    Business(String),

    #[error("校验错误: {0}")]
    Validation(String),

    #[error("资源不存在: {0}")]
    NotFound(String),

    #[error("资源重复: {0}")]
    Duplicate(String),

    #[error("数据库错误: {0}")]
    Database(#[from] sqlx::Error),

    #[error("文件操作错误: {0}")]
    Filesystem(#[from] std::io::Error),

    #[error("内部错误: {0}")]
    Internal(String),
}

// 为Tauri命令实现序列化
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// 统一成功响应格式
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: T,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data,
            message: None,
        }
    }

    pub fn success_with_message(data: T, message: impl Into<String>) -> Self {
        Self {
            success: true,
            data,
            message: Some(message.into()),
        }
    }
}

/// 分页响应
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}