-- Add tags column to posts table for department hashtags
ALTER TABLE posts ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create index for tag queries
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
