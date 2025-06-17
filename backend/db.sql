-- =====================================
-- TASKCRAFT MVP DATABASE SCHEMA & SEED
-- =====================================

-- Table: user
CREATE TABLE IF NOT EXISTS "user" (
    user_id VARCHAR(255) PRIMARY KEY, -- Unique string ID assigned from NodeJS
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Table: user_profile
CREATE TABLE IF NOT EXISTS user_profile (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES "user"(user_id) ON DELETE CASCADE,
    full_name TEXT,
    dark_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    timezone_offset INTEGER NOT NULL DEFAULT 0,
    notif_in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notif_push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: workspace
CREATE TABLE IF NOT EXISTS workspace (
    workspace_id SERIAL PRIMARY KEY,
    workspace_name TEXT NOT NULL,
    created_by_user_id VARCHAR(255) NOT NULL REFERENCES "user"(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_personal BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: user_workspace (join table for memberships + roles)
CREATE TABLE IF NOT EXISTS user_workspace (
    user_id VARCHAR(255) NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK(role IN ('owner', 'admin', 'member')),
    invited_at TIMESTAMP WITHOUT TIME ZONE,
    accepted_at TIMESTAMP WITHOUT TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, workspace_id)
);

-- Table: task_list
CREATE TABLE IF NOT EXISTS task_list (
    task_list_id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspace(workspace_id) ON DELETE SET NULL,
    user_id VARCHAR(255) REFERENCES "user"(user_id) ON DELETE SET NULL,
    list_name TEXT NOT NULL,
    position_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_task_list_owner CHECK (
        (workspace_id IS NOT NULL AND user_id IS NULL) OR
        (workspace_id IS NULL AND user_id IS NOT NULL)
    )
);

-- Table: task
CREATE TABLE IF NOT EXISTS task (
    task_id SERIAL PRIMARY KEY,
    task_list_id INTEGER NOT NULL REFERENCES task_list(task_list_id) ON DELETE CASCADE,
    parent_task_id INTEGER REFERENCES task(task_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority VARCHAR(10) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    due_datetime TIMESTAMP WITHOUT TIME ZONE,
    estimated_effort_mins INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    created_by_user_id VARCHAR(255) NOT NULL REFERENCES "user"(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    position_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    recurring_pattern TEXT, -- JSON or string encoded recurrence pattern, nullable
    recurrence_end_date TIMESTAMP WITHOUT TIME ZONE,
    recurrence_count INTEGER
);

-- Table: task_assignment (many-to-many between task and user)
CREATE TABLE IF NOT EXISTS task_assignment (
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

-- Table: tag
CREATE TABLE IF NOT EXISTS tag (
    tag_id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspace(workspace_id) ON DELETE SET NULL,
    user_id VARCHAR(255) REFERENCES "user"(user_id) ON DELETE SET NULL,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT tag_scope_ck CHECK (
        (workspace_id IS NOT NULL AND user_id IS NULL) OR
        (workspace_id IS NULL AND user_id IS NOT NULL)
    )
);

-- Table: task_tag (join table between task and tag)
CREATE TABLE IF NOT EXISTS task_tag (
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tag(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- Table: task_reminder
CREATE TABLE IF NOT EXISTS task_reminder (
    reminder_id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    reminder_datetime TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    reminder_type VARCHAR(10) NOT NULL CHECK (reminder_type IN ('in-app', 'push', 'email')),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Table: task_comment (threaded comments)
CREATE TABLE IF NOT EXISTS task_comment (
    comment_id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES "user"(user_id) ON DELETE RESTRICT,
    parent_comment_id INTEGER REFERENCES task_comment(comment_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: activity_log
CREATE TABLE IF NOT EXISTS activity_log (
    activity_id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspace(workspace_id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES task(task_id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL REFERENCES "user"(user_id) ON DELETE RESTRICT,
    activity_type TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: notification
CREATE TABLE IF NOT EXISTS notification (
    notification_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    related_task_id INTEGER REFERENCES task(task_id) ON DELETE SET NULL,
    notification_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: undo_log (for undoable destructive actions)
CREATE TABLE IF NOT EXISTS undo_log (
    undo_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    data_snapshot TEXT NOT NULL, -- JSON string snapshot
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL -- used to expire after 10 sec on app side
);

-- Table: user_setting (redundant with user_profile but per spec)
CREATE TABLE IF NOT EXISTS user_setting (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES "user"(user_id) ON DELETE CASCADE,
    dark_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    timezone_offset INTEGER NOT NULL DEFAULT 0,
    notif_in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notif_push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- ==================
-- INDEXES & CONSTRAINTS
-- ==================
CREATE INDEX IF NOT EXISTS idx_task_list_workspace_id ON task_list(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_list_user_id ON task_list(user_id);
CREATE INDEX IF NOT EXISTS idx_task_task_list_id ON task(task_list_id);
CREATE INDEX IF NOT EXISTS idx_task_parent_task_id ON task(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_created_by_user_id ON task(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignment_user_id ON task_assignment(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_workspace_id ON tag(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tag_user_id ON tag(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comment_task_id ON task_comment(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comment_user_id ON task_comment(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_task_id ON activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_related_task_id ON notification(related_task_id);
CREATE INDEX IF NOT EXISTS idx_undo_log_user_id ON undo_log(user_id);

-- ==================
-- SEED DATA
-- ==================

-- For timestamps, use fixed UTC timestamps in ISO format

-- USERS
INSERT INTO "user"(user_id, email, password_hash, created_at, updated_at, is_active) VALUES
('user_001', 'alice@example.com', 'hashed_pw_alice_123', '2024-05-01 12:00:00', '2024-05-10 15:00:00', TRUE),
('user_002', 'bob@example.com', 'hashed_pw_bob_456', '2024-05-02 13:12:10', '2024-05-12 16:20:30', TRUE),
('user_003', 'carol@example.com', 'hashed_pw_carol_789', '2024-05-03 14:25:00', '2024-05-13 17:22:40', TRUE),
('user_004', 'dave@example.com', 'hashed_pw_dave_abc', '2024-05-04 15:40:00', '2024-05-14 18:10:50', TRUE);

-- USER_PROFILES
INSERT INTO user_profile(user_id, full_name, dark_mode_enabled, timezone_offset, notif_in_app_enabled, notif_push_enabled, created_at, updated_at) VALUES
('user_001', 'Alice Anderson', TRUE, -300, TRUE, TRUE, '2024-05-01 12:05:00', '2024-05-10 15:05:00'),
('user_002', 'Bob Brown', FALSE, 60, TRUE, FALSE, '2024-05-02 13:15:00', '2024-05-12 16:25:00'),
('user_003', NULL, FALSE, 0, FALSE, TRUE, '2024-05-03 14:30:00', '2024-05-13 17:25:00'),
('user_004', 'Dave Davidson', TRUE, 120, TRUE, TRUE, '2024-05-04 15:42:00', '2024-05-14 18:15:00');

-- USER_SETTING (mostly duplicate settings, but per spec)
INSERT INTO user_setting(user_id, dark_mode_enabled, timezone_offset, notif_in_app_enabled, notif_push_enabled, created_at, updated_at) VALUES
('user_001', TRUE, -300, TRUE, TRUE, '2024-05-01 12:06:00', '2024-05-10 15:06:00'),
('user_002', FALSE, 60, TRUE, FALSE, '2024-05-02 13:16:00', '2024-05-12 16:26:00'),
('user_003', FALSE, 0, FALSE, TRUE, '2024-05-03 14:31:00', '2024-05-13 17:26:00'),
('user_004', TRUE, 120, TRUE, TRUE, '2024-05-04 15:43:00', '2024-05-14 18:16:00');

-- WORKSPACES
INSERT INTO workspace(workspace_id, workspace_name, created_by_user_id, created_at, updated_at, is_personal) VALUES
(1, 'Personal Workspace Alice', 'user_001', '2024-05-01 12:10:00', '2024-05-10 15:10:00', TRUE),
(2, 'Project Phoenix', 'user_002', '2024-05-02 13:20:00', '2024-05-12 16:30:00', FALSE),
(3, 'Dev Team Workspace', 'user_003', '2024-05-03 14:35:00', '2024-05-13 17:35:00', FALSE);

-- USER_WORKSPACE MEMBERSHIPS
INSERT INTO user_workspace(user_id, workspace_id, role, invited_at, accepted_at, is_active) VALUES
('user_001', 1, 'owner', '2024-05-01 12:11:00', '2024-05-01 12:12:00', TRUE),
('user_002', 2, 'owner', '2024-05-02 13:21:00', '2024-05-02 13:22:00', TRUE),
('user_003', 3, 'owner', '2024-05-03 14:36:00', '2024-05-03 14:37:00', TRUE),
('user_004', 3, 'member', '2024-05-05 10:00:00', '2024-05-06 09:00:00', TRUE),
('user_002', 3, 'admin', '2024-05-05 10:30:00', '2024-05-06 10:00:00', TRUE);

-- TASK_LISTS
INSERT INTO task_list(task_list_id, workspace_id, user_id, list_name, position_order, created_at, updated_at, is_active) VALUES
(1, NULL, 'user_001', 'Alice Personal ToDos', 0, '2024-05-01 12:15:00', '2024-05-10 15:15:00', TRUE),
(2, 2, NULL, 'Phoenix Backlog', 0, '2024-05-02 13:40:00', '2024-05-12 16:40:00', TRUE),
(3, 2, NULL, 'Phoenix Sprint', 1, '2024-05-02 13:45:00', '2024-05-12 16:45:00', TRUE),
(4, 3, NULL, 'Dev Team Tasks', 0, '2024-05-03 14:40:00', '2024-05-13 17:40:00', TRUE);

-- TASKS (including some subtasks with parent_task_id)
INSERT INTO task(task_id, task_list_id, parent_task_id, title, description, priority, due_datetime, estimated_effort_mins, status, created_by_user_id, created_at, updated_at, is_completed, position_order, is_active, recurring_pattern, recurrence_end_date, recurrence_count) VALUES
(1, 1, NULL, 'Buy office supplies', 'Order pens, papers, and staples', 'Medium', '2024-06-01 09:00:00', 30, 'Pending', 'user_001', '2024-05-01 12:20:00', '2024-05-10 15:20:00', FALSE, 0, TRUE, NULL, NULL, NULL),
(2, 1, 1, 'Order pens', 'Order blue and black pens', 'Low', NULL, 10, 'Pending', 'user_001', '2024-05-01 12:21:00', '2024-05-10 15:21:00', FALSE, 0, TRUE, NULL, NULL, NULL),
(3, 2, NULL, 'Define UI mockups', 'Create initial UI mock-ups for Phoenix project', 'High', '2024-05-15 17:00:00', 240, 'In Progress', 'user_002', '2024-05-02 14:00:00', '2024-05-12 16:50:00', FALSE, 0, TRUE, NULL, NULL, NULL),
(4, 2, NULL, 'Setup database schema', 'Design and deploy database schema for Phoenix', 'High', '2024-05-18 17:00:00', 300, 'Pending', 'user_002', '2024-05-02 14:15:00', '2024-05-12 16:55:00', FALSE, 1, TRUE, '{"type":"weekly","interval":1}', '2024-06-30 00:00:00', NULL),
(5, 4, NULL, 'Fix login bug', 'Resolve authentication failure on login', 'Medium', '2024-05-10 12:00:00', 120, 'Pending', 'user_003', '2024-05-03 15:00:00', '2024-05-13 17:50:00', FALSE, 0, TRUE, NULL, NULL, NULL);

-- TASK_ASSIGNMENTS (multi-user assignments where applicable)
INSERT INTO task_assignment(task_id, user_id) VALUES
(1, 'user_001'),
(2, 'user_001'),
(3, 'user_002'),
(3, 'user_004'),
(4, 'user_002'),
(5, 'user_003'),
(5, 'user_004');

-- TAGS (personal and workspace scoped)
INSERT INTO tag(tag_id, workspace_id, user_id, tag_name, created_at, updated_at, is_active) VALUES
(1, NULL, 'user_001', 'urgent', '2024-05-01 12:30:00', '2024-05-10 15:30:00', TRUE),
(2, 2, NULL, 'ui', '2024-05-02 14:10:00', '2024-05-12 17:00:00', TRUE),
(3, 3, NULL, 'bug', '2024-05-03 15:05:00', '2024-05-13 18:00:00', TRUE),
(4, NULL, 'user_003', 'later', '2024-05-03 15:20:00', '2024-05-13 18:05:00', TRUE);

-- TASK_TAG (link tasks to tags)
INSERT INTO task_tag(task_id, tag_id) VALUES
(1,1),
(3,2),
(5,3),
(1,4);

-- TASK_REMINDERS
INSERT INTO task_reminder(reminder_id, task_id, reminder_datetime, reminder_type, created_at, is_active) VALUES
(1, 3, '2024-05-14 09:00:00', 'in-app', '2024-05-02 14:30:00', TRUE),
(2, 4, '2024-05-17 10:00:00', 'push', '2024-05-02 14:35:00', TRUE),
(3, 1, '2024-05-31 08:00:00', 'email', '2024-05-01 12:35:00', TRUE);

-- TASK_COMMENTS (threaded comments sample)
INSERT INTO task_comment(comment_id, task_id, user_id, parent_comment_id, content, created_at, updated_at, is_deleted) VALUES
(1, 3, 'user_002', NULL, 'Initial UI mockups posted for review.', '2024-05-05 10:00:00', '2024-05-05 10:00:00', FALSE),
(2, 3, 'user_004', 1, 'Looks good, but can we add dark mode?', '2024-05-05 10:10:00', NULL, FALSE),
(3, 3, 'user_002', 2, 'Yes, working on that now.', '2024-05-05 10:20:00', NULL, FALSE),
(4, 5, 'user_003', NULL, 'Login bug confirmed, debugging now.', '2024-05-06 09:30:00', NULL, FALSE);

-- ACTIVITY_LOG (key events)
INSERT INTO activity_log(activity_id, workspace_id, task_id, user_id, activity_type, details, created_at) VALUES
(1, 2, 3, 'user_002', 'task_created', '{"title":"Define UI mockups"}', '2024-05-02 14:00:00'),
(2, 2, 3, 'user_004', 'comment_added', '{"comment_id":1}', '2024-05-05 10:00:00'),
(3, 3, 5, 'user_003', 'task_created', '{"title":"Fix login bug"}', '2024-05-03 15:00:00'),
(4, NULL, 1, 'user_001', 'task_created', '{"title":"Buy office supplies"}', '2024-05-01 12:20:00');

-- NOTIFICATIONS
INSERT INTO notification(notification_id, user_id, related_task_id, notification_type, content, is_read, created_at) VALUES
(1, 'user_001', 1, 'reminder', 'Reminder: Buy office supplies due soon.', FALSE, '2024-05-31 08:01:00'),
(2, 'user_004', 3, 'comment', 'Bob Brown added a comment on UI mockups.', FALSE, '2024-05-05 10:00:00'),
(3, 'user_003', 5, 'status_change', 'Login bug status changed to Pending.', TRUE, '2024-05-06 10:00:00');

-- UNDO_LOG (example undo for delete action)
INSERT INTO undo_log(undo_id, user_id, entity_type, entity_id, operation, data_snapshot, created_at) VALUES
(1, 'user_001', 'task', '1', 'delete', '{"task_id":1,"title":"Buy office supplies","is_active":false}', '2024-05-10 15:50:00');

-- === END OF SCRIPT ===