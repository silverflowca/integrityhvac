-- Create roles table for custom role management
CREATE TABLE IF NOT EXISTS integrityhvac.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO integrityhvac.roles (name, description) VALUES
    ('admin', 'Full system access with user management capabilities'),
    ('staff', 'Regular staff member with standard access'),
    ('customer', 'Customer account with limited access'),
    ('contractor', 'External contractor with project-specific access'),
    ('consultant', 'Consultant with advisory access'),
    ('other', 'Other role type')
ON CONFLICT (name) DO NOTHING;

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_roles_name ON integrityhvac.roles(name);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION integrityhvac.update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_updated_at_trigger
    BEFORE UPDATE ON integrityhvac.roles
    FOR EACH ROW
    EXECUTE FUNCTION integrityhvac.update_roles_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON integrityhvac.roles TO anon, authenticated;
GRANT UPDATE, DELETE ON integrityhvac.roles TO authenticated;
