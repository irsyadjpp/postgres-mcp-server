-- Insert sample users
INSERT INTO testschema.users (name, email, age) VALUES
('John Doe', 'john@example.com', 30),
('Jane Smith', 'jane@example.com', 25),
('Bob Wilson', 'bob@example.com', 35);

-- Insert sample categories
INSERT INTO testschema.categories (name, description) VALUES
('Technology', 'Posts about technology and programming'),
('Lifestyle', 'Posts about lifestyle and personal experiences'),
('Business', 'Posts about business and entrepreneurship');

-- Insert sample posts
INSERT INTO testschema.posts (user_id, category_id, title, content, published, view_count) VALUES
(1, 1, 'Getting Started with PostgreSQL', 'PostgreSQL is a powerful relational database...', TRUE, 150),
(1, 1, 'Advanced SQL Queries', 'Learn how to write complex SQL queries...', TRUE, 89),
(2, 2, 'My Daily Routine', 'Here is how I structure my daily routine...', TRUE, 245),
(2, 3, 'Starting a Business', 'Tips for starting your own business...', FALSE, 0),
(3, 1, 'Database Design Patterns', 'Common patterns in database design...', TRUE, 178);

-- Insert sample tags
INSERT INTO testschema.tags (name, color) VALUES
('postgresql', '#336791'),
('sql', '#0074D9'),
('database', '#2ECC40'),
('lifestyle', '#FF851B'),
('business', '#B10DC9'),
('tutorial', '#FFDC00');

-- Insert sample post-tag relationships
INSERT INTO testschema.post_tags (post_id, tag_id) VALUES
(1, 1), -- PostgreSQL post has postgresql tag
(1, 2), -- PostgreSQL post has sql tag
(1, 3), -- PostgreSQL post has database tag
(1, 6), -- PostgreSQL post has tutorial tag
(2, 2), -- Advanced SQL has sql tag
(2, 6), -- Advanced SQL has tutorial tag
(3, 4), -- Daily routine has lifestyle tag
(4, 5), -- Starting business has business tag
(5, 3), -- Database design has database tag
(5, 6); -- Database design has tutorial tag