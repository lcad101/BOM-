// SQL Schema definitions for BOM system
// Contains CREATE TABLE statements for all 7 tables

pub const PROJECTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    project_code TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    owner TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    CHECK (status IN ('active', 'archived', 'deleted'))
);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
"#;

pub const BOM_VERSIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS bom_versions (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version_number TEXT NOT NULL DEFAULT 'v1.0',
    status TEXT NOT NULL DEFAULT 'draft',
    source_version_id TEXT,
    description TEXT DEFAULT '',
    created_by TEXT NOT NULL,
    released_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (source_version_id) REFERENCES bom_versions(id) ON DELETE SET NULL,
    UNIQUE (project_id, name, version_number),
    CHECK (status IN ('draft', 'released', 'archived'))
);
CREATE INDEX IF NOT EXISTS idx_bom_versions_project ON bom_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_versions_status ON bom_versions(status);
"#;

pub const BOM_NODES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS bom_nodes (
    id TEXT PRIMARY KEY NOT NULL,
    bom_version_id TEXT NOT NULL,
    parent_id TEXT,
    component_id TEXT,
    node_type TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'PCS',
    reference_designator TEXT DEFAULT '',
    level INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_version_id) REFERENCES bom_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES bom_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE SET NULL,
    UNIQUE (bom_version_id, parent_id, name),
    CHECK (level <= 10),
    CHECK (node_type IN ('assembly', 'component')),
    CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS idx_bom_nodes_version ON bom_nodes(bom_version_id);
CREATE INDEX IF NOT EXISTS idx_bom_nodes_parent ON bom_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_bom_nodes_component ON bom_nodes(component_id);
"#;

pub const COMPONENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY NOT NULL,
    part_number TEXT NOT NULL,
    manufacturer TEXT DEFAULT '',
    category TEXT DEFAULT '',
    sub_category TEXT DEFAULT '',
    description TEXT DEFAULT '',
    package_type TEXT DEFAULT '',
    specifications TEXT DEFAULT '{}',
    datasheet_url TEXT DEFAULT '',
    default_unit TEXT NOT NULL DEFAULT 'PCS',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (part_number, manufacturer)
);
CREATE INDEX IF NOT EXISTS idx_components_part_number ON components(part_number);
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category);
"#;

pub const ALTERNATIVE_PARTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS alternative_parts (
    id TEXT PRIMARY KEY NOT NULL,
    original_component_id TEXT NOT NULL,
    alternative_component_id TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    verification_status TEXT NOT NULL DEFAULT 'unverified',
    notes TEXT DEFAULT '',
    verified_by TEXT DEFAULT '',
    verified_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_component_id) REFERENCES components(id) ON DELETE CASCADE,
    FOREIGN KEY (alternative_component_id) REFERENCES components(id) ON DELETE CASCADE,
    UNIQUE (original_component_id, alternative_component_id),
    CHECK (original_component_id != alternative_component_id),
    CHECK (verification_status IN ('unverified', 'verifying', 'verified', 'not_recommended'))
);
CREATE INDEX IF NOT EXISTS idx_alternative_parts_original ON alternative_parts(original_component_id);
"#;

pub const CHANGE_HISTORY_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS change_history (
    id TEXT PRIMARY KEY NOT NULL,
    bom_version_id TEXT NOT NULL,
    node_id TEXT,
    change_type TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    change_summary TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_version_id) REFERENCES bom_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES bom_nodes(id) ON DELETE SET NULL,
    CHECK (change_type IN ('create', 'update', 'delete', 'move', 'alternative_add', 'alternative_remove'))
);
CREATE INDEX IF NOT EXISTS idx_change_history_version ON change_history(bom_version_id);
CREATE INDEX IF NOT EXISTS idx_change_history_node ON change_history(node_id);
"#;

pub const SUPPLIERS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT DEFAULT '',
    contact_email TEXT DEFAULT '',
    contact_phone TEXT DEFAULT '',
    website TEXT DEFAULT '',
    lead_time_days INTEGER,
    notes TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
"#;

pub const COMPONENT_SUPPLIERS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS component_suppliers (
    id TEXT PRIMARY KEY NOT NULL,
    component_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    supplier_part_number TEXT DEFAULT '',
    unit_price REAL,
    currency TEXT NOT NULL DEFAULT 'CNY',
    moq INTEGER,
    lead_time_days INTEGER,
    is_preferred BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    UNIQUE (component_id, supplier_id)
);
CREATE INDEX IF NOT EXISTS idx_component_suppliers_component ON component_suppliers(component_id);
CREATE INDEX IF NOT EXISTS idx_component_suppliers_supplier ON component_suppliers(supplier_id);
"#;

pub async fn init_schema(pool: &crate::db::DbPool) -> Result<(), sqlx::Error> {
    // Create all tables in order to respect foreign key constraints
    sqlx::raw_sql(PROJECTS_TABLE).execute(pool.as_ref()).await?;
    sqlx::raw_sql(BOM_VERSIONS_TABLE).execute(pool.as_ref()).await?;
    sqlx::raw_sql(COMPONENTS_TABLE).execute(pool.as_ref()).await?;
    sqlx::raw_sql(BOM_NODES_TABLE).execute(pool.as_ref()).await?;
    sqlx::raw_sql(ALTERNATIVE_PARTS_TABLE).execute(pool.as_ref()).await?;
    sqlx::raw_sql(CHANGE_HISTORY_TABLE).execute(pool.as_ref()).await?;
    sqlx::raw_sql(SUPPLIERS_TABLE).execute(pool.as_ref()).await?;
    sqlx::raw_sql(COMPONENT_SUPPLIERS_TABLE).execute(pool.as_ref()).await?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_constants_not_empty() {
        assert!(!PROJECTS_TABLE.is_empty());
        assert!(!BOM_VERSIONS_TABLE.is_empty());
        assert!(!COMPONENTS_TABLE.is_empty());
        assert!(!BOM_NODES_TABLE.is_empty());
    }
}
