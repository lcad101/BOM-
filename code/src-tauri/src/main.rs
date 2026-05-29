/**
 * BOMMaster 应用入口
 */
mod commands;
mod db;
mod errors;
mod models;

use db::DbPool;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 初始化数据库
            let app_dir = app.path().app_data_dir().expect("无法获取应用数据目录");
            std::fs::create_dir_all(&app_dir).expect("无法创建应用数据目录");
            let db_path = app_dir.join("bom-master.db");
            let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

            // 异步初始化
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match db::init_pool(&db_url).await {
                    Ok(pool) => {
                        // 初始化数据库表
                        if let Err(e) = db::schema::init_schema(&pool).await {
                            eprintln!("数据库表初始化失败: {}", e);
                        } else {
                            println!("数据库初始化成功: {}", db_path.display());
                        }
                        // 将数据库连接池注入到Tauri状态管理
                        handle.manage(pool);
                    }
                    Err(e) => {
                        eprintln!("数据库连接池初始化失败: {}", e);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 项目管理
            commands::project::create_project,
            commands::project::list_projects,
            commands::project::get_project,
            commands::project::update_project,
            commands::project::archive_project,
            commands::project::delete_project,
            // BOM版本管理
            commands::bom::create_bom_version,
            commands::bom::list_bom_versions,
            commands::bom::get_bom_version,
            commands::bom::release_bom_version,
            // BOM节点管理
            commands::bom::get_bom_tree,
            commands::bom::create_bom_node,
            commands::bom::update_bom_node,
            commands::bom::delete_bom_node,
            commands::bom::move_bom_node,
            // BOM对比和历史
            commands::bom::compare_bom_versions,
            commands::bom::get_change_history,
            // 元器件管理
            commands::component::create_component,
            commands::component::search_components,
            commands::component::get_component,
            commands::component::update_component,
            // 替代料管理
            commands::component::list_alternative_parts,
            commands::component::add_alternative_part,
            commands::component::remove_alternative_part,
        ])
        .run(tauri::generate_context!())
        .expect("运行BOMMaster应用时发生错误");
}