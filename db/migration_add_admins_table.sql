-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user (password: password123)
INSERT INTO admins (id, email, password_hash, display_name) VALUES
('99999999-9999-9999-9999-999999999999', 'admin@example.com', '$2a$10$RV1yFBFcHJbWuAhJp3w9DuZ3dokyb4w5uulijerVuUG0n9tDxWcy6', 'システム管理者')
ON CONFLICT (email) DO NOTHING;
