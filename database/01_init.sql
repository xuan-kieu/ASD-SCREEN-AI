CREATE DATABASE ASD_Screening;
GO
USE ASD_Screening;
GO

-- 1. USERS
CREATE TABLE users (
    id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    username      NVARCHAR(50)  UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    email         NVARCHAR(100) UNIQUE,
    phone         NVARCHAR(20)  UNIQUE,
    full_name     NVARCHAR(100) NOT NULL,
    role          NVARCHAR(20)  NOT NULL
                  CONSTRAINT CK_User_Role
                  CHECK (role IN ('parent','teacher','specialist','admin')),
    is_active     BIT           DEFAULT 1,
    created_at    DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at    DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 2. CHILDREN
CREATE TABLE children (
    id               UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    full_name        NVARCHAR(100) NOT NULL,
    birth_date       DATE          NOT NULL,
    gender           NVARCHAR(10)  CHECK (gender IN ('male','female','other')),
    region           NVARCHAR(50),
    primary_language NVARCHAR(50)  DEFAULT 'vi',
    notes            NVARCHAR(MAX),
    parent_id        UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL,
    created_by       UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id),
    created_at       DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at       DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 3. CHILD_GUARDIANS
CREATE TABLE child_guardians (
    child_id           UNIQUEIDENTIFIER FOREIGN KEY REFERENCES children(id) ON DELETE CASCADE,
    user_id            UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
    relationship       NVARCHAR(50),
    is_primary         BIT DEFAULT 0,
    assigned_at        DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    professional_notes NVARCHAR(MAX),
    PRIMARY KEY (child_id, user_id)
);
GO

-- 4. PASSWORD_RESETS
CREATE TABLE password_resets (
    id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id    UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
    token      NVARCHAR(255)   NOT NULL,
    expires_at DATETIMEOFFSET  NOT NULL,
    used       BIT             DEFAULT 0,
    created_at DATETIMEOFFSET  DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 5. AGE_GROUPS
CREATE TABLE age_groups (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    name       NVARCHAR(50) NOT NULL,
    min_months INT NOT NULL,
    max_months INT NOT NULL
);
GO

-- 6. SKILLS
CREATE TABLE skills (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    code        NVARCHAR(20) UNIQUE,
    name        NVARCHAR(100) NOT NULL,
    domain      NVARCHAR(30) NOT NULL
                CHECK (domain IN ('social','communication','cognitive','motor')),
    description NVARCHAR(MAX),
    weight      DECIMAL(3,2) DEFAULT 1.0
);
GO

-- 7. GAMES
CREATE TABLE games (
    id                      INT IDENTITY(1,1) PRIMARY KEY,
    code                    NVARCHAR(20) UNIQUE NOT NULL,
    name                    NVARCHAR(100) NOT NULL,
    description             NVARCHAR(MAX),
    instructions            NVARCHAR(MAX),
    min_age_months          INT NOT NULL,
    max_age_months          INT NOT NULL,
    target_duration_seconds INT,
    media_url               NVARCHAR(MAX),
    is_gateway              BIT DEFAULT 0,
    created_at              DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 8. GAME_SKILLS
CREATE TABLE game_skills (
    game_id    INT FOREIGN KEY REFERENCES games(id) ON DELETE CASCADE,
    skill_id   INT FOREIGN KEY REFERENCES skills(id) ON DELETE CASCADE,
    weight     DECIMAL(3,2) DEFAULT 1.0,
    skill_type NVARCHAR(10) CHECK (skill_type IN ('primary','secondary')),
    PRIMARY KEY (game_id, skill_id)
);
GO

-- 9. ASSESSMENTS
CREATE TABLE assessments (
    id                 UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    child_id           UNIQUEIDENTIFIER FOREIGN KEY REFERENCES children(id) ON DELETE CASCADE,
    started_by         UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id),
    started_at         DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    completed_at       DATETIMEOFFSET,
    status             NVARCHAR(20) DEFAULT 'in_progress'
                       CHECK (status IN ('scheduled','in_progress','completed','abandoned')),
    adaptive_flow      NVARCHAR(MAX),
    overall_risk_score DECIMAL(5,2),
    risk_level         NVARCHAR(20)
                       CHECK (risk_level IN (N'RẤT CAO',N'CAO',N'TRUNG BÌNH',N'THẤP')),
    report_json        NVARCHAR(MAX),
    created_at         DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at         DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 10. GAME_SESSIONS
CREATE TABLE game_sessions (
    id             UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    assessment_id  UNIQUEIDENTIFIER FOREIGN KEY REFERENCES assessments(id) ON DELETE CASCADE,
    game_id        INT FOREIGN KEY REFERENCES games(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    started_at     DATETIMEOFFSET,
    ended_at       DATETIMEOFFSET,
    status         NVARCHAR(20) DEFAULT 'completed'
                   CHECK (status IN ('completed','interrupted','skipped')),
    raw_data_json  NVARCHAR(MAX),
    result_scores  NVARCHAR(MAX),
    created_at     DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT unique_assessment_game_order UNIQUE (assessment_id, sequence_order)
);
GO

-- 11. GAME_SESSION_METRICS
CREATE TABLE game_session_metrics (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    game_session_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES game_sessions(id) ON DELETE CASCADE,
    metric_key      NVARCHAR(50) NOT NULL,
    metric_value    DECIMAL(10,3),
    unit            NVARCHAR(20),
    captured_at     DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 12. MEDIA_FILES
CREATE TABLE media_files (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    game_session_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES game_sessions(id) ON DELETE CASCADE,
    file_type       NVARCHAR(10) CHECK (file_type IN ('video','audio')),
    file_path       NVARCHAR(MAX) NOT NULL,
    uploaded_at     DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 13. NORMS
CREATE TABLE norms (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    skill_id     INT FOREIGN KEY REFERENCES skills(id) ON DELETE CASCADE,
    age_group_id INT FOREIGN KEY REFERENCES age_groups(id) ON DELETE CASCADE,
    mean         DECIMAL(6,3) NOT NULL,
    std_dev      DECIMAL(6,3) NOT NULL,
    sample_size  INT,
    updated_at   DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 14. QUICK_NOTES
CREATE TABLE quick_notes (
    id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    child_id   UNIQUEIDENTIFIER FOREIGN KEY REFERENCES children(id) ON DELETE CASCADE,
    created_by UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id),
    note_type  NVARCHAR(20) CHECK (note_type IN ('progress','behavior','other')),
    content    NVARCHAR(MAX) NOT NULL,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 15. DAILY_REPORTS
CREATE TABLE daily_reports (
    id             UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    child_id       UNIQUEIDENTIFIER FOREIGN KEY REFERENCES children(id) ON DELETE CASCADE,
    report_date    DATE NOT NULL,
    summary        NVARCHAR(MAX),
    mood           NVARCHAR(20),
    sleep_quality  NVARCHAR(20),
    eating_quality NVARCHAR(20),
    activities     NVARCHAR(MAX),
    notes          NVARCHAR(MAX),
    created_by     UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id),
    sent_to_parent BIT DEFAULT 0,
    created_at     DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at     DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 16. MESSAGES
CREATE TABLE messages (
    id           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    from_user_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id),
    to_user_id   UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id),
    child_id     UNIQUEIDENTIFIER FOREIGN KEY REFERENCES children(id) ON DELETE CASCADE,
    content      NVARCHAR(MAX) NOT NULL,
    is_read      BIT DEFAULT 0,
    created_at   DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    read_at      DATETIMEOFFSET
);
GO

-- 17. INTERVENTION_PLANS
CREATE TABLE intervention_plans (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    child_id        UNIQUEIDENTIFIER FOREIGN KEY REFERENCES children(id) ON DELETE CASCADE,
    specialist_id   UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id),
    start_date      DATE NOT NULL,
    end_date        DATE,
    goals_json      NVARCHAR(MAX),
    activities_json NVARCHAR(MAX),
    status          NVARCHAR(20) DEFAULT 'active',
    created_at      DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at      DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- ── INDEXES ──────────────────────────────────────────────
CREATE INDEX idx_children_parent        ON children(parent_id);
CREATE INDEX idx_assessments_child      ON assessments(child_id);
CREATE INDEX idx_game_sessions_assess   ON game_sessions(assessment_id);
CREATE INDEX idx_password_resets_token  ON password_resets(token);
CREATE INDEX idx_messages_unread        ON messages(to_user_id) WHERE is_read = 0;
GO

-- ── TRIGGERS ─────────────────────────────────────────────
CREATE TRIGGER trg_Users_UpdatedAt ON users AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE users SET updated_at = SYSDATETIMEOFFSET()
    FROM inserted WHERE users.id = inserted.id;
END;
GO

CREATE TRIGGER trg_Children_UpdatedAt ON children AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE children SET updated_at = SYSDATETIMEOFFSET()
    FROM inserted WHERE children.id = inserted.id;
END;
GO

CREATE TRIGGER trg_CheckParentRole ON children AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted i
        JOIN users u ON i.parent_id = u.id
        WHERE u.role NOT IN ('parent','admin')
    )
    BEGIN
        RAISERROR(N'Người giám hộ phải có role parent hoặc admin.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO

-- ── SEED DATA ─────────────────────────────────────────────
INSERT INTO age_groups (name, min_months, max_months) VALUES
(N'12-18 tháng', 12, 18),
(N'18-24 tháng', 18, 24),
(N'2-3 tuổi',    24, 36),
(N'3-5 tuổi',    36, 60);
GO

INSERT INTO skills (code, name, domain, weight) VALUES
('joint_attention', N'Chú ý chia sẻ',       'social',        0.25),
('imitation',       N'Bắt chước',            'social',        0.20),
('nonverbal_comm',  N'Giao tiếp không lời',  'communication', 0.20),
('name_response',   N'Phản ứng với tên',     'social',        0.15),
('pretend_play',    N'Chơi giả vờ',          'cognitive',     0.10),
('emotion_recog',   N'Nhận diện cảm xúc',   'social',        0.10),
('turn_taking',     N'Luân phiên',           'social',        0.08),
('receptive_lang',  N'Ngôn ngữ tiếp nhận',  'communication', 0.07);
GO

INSERT INTO games (code, name, min_age_months, max_age_months, target_duration_seconds, is_gateway) VALUES
('G1.1', N'Bong Bóng Biết Bay',    12, 18, 120, 1),
('G1.2', N'Vỗ Tay Vui Nhộn',       12, 18, 120, 1),
('G1.3', N'Bé Ơi Quay Lại Nào',    12, 18, 120, 1),
('G1.4', N'Ú Òa Kỳ Diệu',          12, 18, 120, 0),
('G2.1', N'Chỉ Tay Tinh Mắt',      18, 24, 180, 0),
('G2.2', N'Xây Tháp Cao',           18, 24, 180, 0),
('G2.3', N'Tiếng Kêu Của Ai',       18, 24, 120, 0),
('G2.4', N'Cho Búp Bê Ăn',          18, 24, 180, 0),
('G3.1', N'Về Đúng Nhà Nào',        24, 36, 180, 0),
('G3.2', N'Cảm Xúc Gì Đây',         24, 36, 180, 0),
('G3.3', N'Đến Lượt Con Rồi',        24, 36, 180, 0),
('G3.4', N'Tìm Hình Ghép Cặp',      24, 36, 180, 0),
('G4.1', N'Vì Sao Thế Nhỉ',         36, 60, 240, 0),
('G4.2', N'Sắp Xếp Câu Chuyện',    36, 60, 240, 0),
('G4.3', N'Cửa Hàng Tí Hon',        36, 60, 240, 0),
('G4.4', N'Làm Theo Chỉ Dẫn',       36, 60, 180, 0);
GO

-- Tài khoản admin mặc định  (password gốc: Admin@123456)
INSERT INTO users (username, password_hash, email, phone, full_name, role) VALUES
('admin',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLxcqZMNFXGMGe6',
 'admin@asdscreen.com', '0901234567',
 N'Quản trị viên hệ thống', 'admin');
GO

