-- Create roles table
CREATE TABLE IF NOT EXISTS integrityhvac.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_roles_name ON integrityhvac.roles(name);

-- Insert default roles
INSERT INTO integrityhvac.roles (name, description) VALUES
    ('admin', 'Full system access with user management capabilities'),
    ('staff', 'Regular staff member with standard access'),
    ('customer', 'Customer account with limited access'),
    ('contractor', 'External contractor with project-specific access'),
    ('consultant', 'Consultant with advisory access'),
    ('other', 'Other role type')
ON CONFLICT (name) DO NOTHING;
