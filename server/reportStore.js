const fs = require('fs');
const path = require('path');

const REPORT_RETENTION_DAYS = 7;
const LEADERBOARD_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const VALID_REACTION_TYPES = ['like', 'upvote'];
const DEFAULT_PROFILE_NAME = 'Goose Watcher';
const DEFAULT_PROFILE_AVATAR = '🦢';
const CONTRIBUTION_WEIGHTS = {
  report: 5,
  comment: 2,
  reaction: 1
};

function createId(prefix = 'id') {
  const hasCrypto = typeof crypto !== 'undefined' && crypto.randomUUID;
  const unique = hasCrypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${unique}`;
}

function toIsoTimestamp(value, fallback = new Date().toISOString()) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

function normalizeAvatar(value) {
  const cleaned = normalizeText(value, 8);
  return cleaned || DEFAULT_PROFILE_AVATAR;
}

function normalizeProfile(raw) {
  const now = new Date().toISOString();
  const id = normalizeText(raw.id, 128);

  return {
    id,
    displayName: normalizeText(raw.displayName, 40) || DEFAULT_PROFILE_NAME,
    bio: normalizeText(raw.bio, 160),
    avatarEmoji: normalizeAvatar(raw.avatarEmoji),
    createdAt: toIsoTimestamp(raw.createdAt, now),
    updatedAt: toIsoTimestamp(raw.updatedAt, now)
  };
}

function normalizeComment(raw, fallbackTimestamp = new Date().toISOString()) {
  return {
    id: normalizeText(raw.id, 128) || createId('comment'),
    userId: normalizeText(raw.userId, 128),
    userName: normalizeText(raw.userName, 40) || DEFAULT_PROFILE_NAME,
    text: normalizeText(raw.text || raw.comment, 500),
    timestamp: toIsoTimestamp(raw.timestamp, fallbackTimestamp)
  };
}

function normalizeReactionEvent(raw, fallbackTimestamp = new Date().toISOString()) {
  if (typeof raw === 'string') {
    return {
      userId: normalizeText(raw, 128),
      timestamp: fallbackTimestamp
    };
  }

  return {
    userId: normalizeText(raw && raw.userId, 128),
    timestamp: toIsoTimestamp(raw && raw.timestamp, fallbackTimestamp)
  };
}

function dedupeReactionEvents(events) {
  const byUserId = new Map();

  events.forEach((event) => {
    if (!event.userId) {
      return;
    }

    const existing = byUserId.get(event.userId);
    if (!existing || new Date(event.timestamp).getTime() >= new Date(existing.timestamp).getTime()) {
      byUserId.set(event.userId, event);
    }
  });

  return Array.from(byUserId.values());
}

function normalizeReactions(raw, fallbackTimestamp) {
  const normalized = {
    like: [],
    upvote: []
  };

  VALID_REACTION_TYPES.forEach((reactionType) => {
    const source = raw && raw[reactionType];
    if (!Array.isArray(source)) {
      return;
    }

    normalized[reactionType] = dedupeReactionEvents(
      source.map((event) => normalizeReactionEvent(event, fallbackTimestamp))
    );
  });

  return normalized;
}

function normalizeReport(raw) {
  const safeTimestamp = toIsoTimestamp(raw.timestamp);

  return {
    id: normalizeText(raw.id, 128) || createId('report'),
    type: raw.type,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    description: normalizeText(raw.description, 2000),
    severity: normalizeText(raw.severity, 16) || 'medium',
    imageUrl: raw.imageUrl || raw.image_url || null,
    timestamp: safeTimestamp,
    authorId: normalizeText(raw.authorId || raw.author_id, 128),
    authorName: normalizeText(raw.authorName || raw.author_name, 40) || DEFAULT_PROFILE_NAME,
    comments: Array.isArray(raw.comments)
      ? raw.comments
          .map((comment) => normalizeComment(comment, safeTimestamp))
          .filter((comment) => comment.userId && comment.text)
      : [],
    reactions: normalizeReactions(raw.reactions, safeTimestamp)
  };
}

function toPublicReport(report, viewerId) {
  const comments = [...report.comments].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const reactions = {
    like: report.reactions.like.length,
    upvote: report.reactions.upvote.length
  };

  const viewerReactions = {
    like: Boolean(viewerId) && report.reactions.like.some((event) => event.userId === viewerId),
    upvote: Boolean(viewerId) && report.reactions.upvote.some((event) => event.userId === viewerId)
  };

  return {
    ...report,
    comments,
    commentCount: comments.length,
    reactions,
    viewerReactions
  };
}

function createContributionEntry(userId) {
  return {
    userId,
    reportCount: 0,
    commentCount: 0,
    reactionCount: 0,
    score: 0
  };
}

function recordContribution(contributions, userId, kind) {
  if (!userId) {
    return;
  }

  const entry = contributions.get(userId) || createContributionEntry(userId);
  if (kind === 'report') {
    entry.reportCount += 1;
  } else if (kind === 'comment') {
    entry.commentCount += 1;
  } else if (kind === 'reaction') {
    entry.reactionCount += 1;
  }
  entry.score += CONTRIBUTION_WEIGHTS[kind];
  contributions.set(userId, entry);
}

function finalizeLeaderboard(contributions, profilesById, fallbackNames, limit) {
  const sorted = Array.from(contributions.values())
    .map((entry) => {
      const profile = profilesById.get(entry.userId);
      const fallbackName = fallbackNames.get(entry.userId);
      return {
        ...entry,
        displayName: (profile && profile.displayName) || fallbackName || DEFAULT_PROFILE_NAME,
        avatarEmoji: (profile && profile.avatarEmoji) || DEFAULT_PROFILE_AVATAR,
        bio: (profile && profile.bio) || ''
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount;
      if (b.commentCount !== a.commentCount) return b.commentCount - a.commentCount;
      if (b.reactionCount !== a.reactionCount) return b.reactionCount - a.reactionCount;
      return a.displayName.localeCompare(b.displayName);
    })
    .slice(0, limit);

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
}

function computeFileLeaderboard(reports, profiles, limit = 10) {
  const cutoffMs = Date.now() - LEADERBOARD_WINDOW_DAYS * MS_PER_DAY;
  const contributions = new Map();
  const fallbackNames = new Map();
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  reports.forEach((report) => {
    const reportTs = new Date(report.timestamp).getTime();
    if (report.authorId && reportTs >= cutoffMs) {
      recordContribution(contributions, report.authorId, 'report');
      if (report.authorName) {
        fallbackNames.set(report.authorId, report.authorName);
      }
    }

    report.comments.forEach((comment) => {
      const commentTs = new Date(comment.timestamp).getTime();
      if (commentTs >= cutoffMs) {
        recordContribution(contributions, comment.userId, 'comment');
        if (comment.userName) {
          fallbackNames.set(comment.userId, comment.userName);
        }
      }
    });

    VALID_REACTION_TYPES.forEach((reactionType) => {
      report.reactions[reactionType].forEach((reaction) => {
        const reactionTs = new Date(reaction.timestamp).getTime();
        if (reactionTs >= cutoffMs) {
          recordContribution(contributions, reaction.userId, 'reaction');
        }
      });
    });
  });

  return finalizeLeaderboard(contributions, profilesById, fallbackNames, limit);
}

function createFileStore(dataDirectory) {
  const reportsFile = path.join(dataDirectory, 'reports.json');
  const profilesFile = path.join(dataDirectory, 'profiles.json');
  let reports = [];
  let profiles = [];

  function ensureDataDirectory() {
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }
  }

  function loadArrayFromFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error);
      return [];
    }
  }

  function saveArrayToFile(filePath, payload) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error(`Error saving ${filePath}:`, error);
    }
  }

  function saveReportsToFile(nextReports) {
    saveArrayToFile(reportsFile, nextReports);
  }

  function saveProfilesToFile(nextProfiles) {
    saveArrayToFile(profilesFile, nextProfiles);
  }

  function findProfileById(userId) {
    return profiles.find((profile) => profile.id === userId) || null;
  }

  function cleanupOldReports() {
    const cutoffMs = Date.now() - REPORT_RETENTION_DAYS * MS_PER_DAY;
    const beforeCount = reports.length;
    reports = reports.filter((report) => new Date(report.timestamp).getTime() > cutoffMs);
    const removedCount = beforeCount - reports.length;

    if (removedCount > 0) {
      saveReportsToFile(reports);
    }

    return removedCount;
  }

  return {
    mode: 'file',
    async init() {
      ensureDataDirectory();
      reports = loadArrayFromFile(reportsFile).map(normalizeReport);
      profiles = loadArrayFromFile(profilesFile)
        .map(normalizeProfile)
        .filter((profile) => profile.id);
      cleanupOldReports();
    },
    async cleanupOldReports() {
      return cleanupOldReports();
    },
    async getReports(type, options = {}) {
      cleanupOldReports();
      const viewerId = normalizeText(options.viewerId, 128);
      const filtered = type ? reports.filter((report) => report.type === type) : reports;
      return [...filtered]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map((report) => toPublicReport(report, viewerId));
    },
    async getReportById(id, options = {}) {
      cleanupOldReports();
      const viewerId = normalizeText(options.viewerId, 128);
      const report = reports.find((item) => item.id === id);
      return report ? toPublicReport(report, viewerId) : null;
    },
    async createReport(report) {
      cleanupOldReports();
      const normalized = normalizeReport(report);
      reports.push(normalized);
      saveReportsToFile(reports);
      return toPublicReport(normalized, normalized.authorId);
    },
    async getProfileById(userId) {
      const normalizedUserId = normalizeText(userId, 128);
      if (!normalizedUserId) {
        return null;
      }

      return findProfileById(normalizedUserId);
    },
    async upsertProfile(profileInput) {
      const normalized = normalizeProfile(profileInput);
      if (!normalized.id) {
        return null;
      }

      const existingIndex = profiles.findIndex((profile) => profile.id === normalized.id);
      const now = new Date().toISOString();

      if (existingIndex >= 0) {
        profiles[existingIndex] = {
          ...profiles[existingIndex],
          displayName: normalized.displayName,
          bio: normalized.bio,
          avatarEmoji: normalized.avatarEmoji,
          updatedAt: now
        };
      } else {
        profiles.push({
          ...normalized,
          createdAt: now,
          updatedAt: now
        });
      }

      saveProfilesToFile(profiles);
      return findProfileById(normalized.id);
    },
    async addComment(reportId, commentInput) {
      cleanupOldReports();
      const reportIndex = reports.findIndex((report) => report.id === reportId);
      if (reportIndex < 0) {
        return null;
      }

      const userId = normalizeText(commentInput.userId, 128);
      if (!userId) {
        return null;
      }

      const profile = findProfileById(userId);
      const fallbackName = normalizeText(commentInput.userName, 40);
      const userName = (profile && profile.displayName) || fallbackName || DEFAULT_PROFILE_NAME;

      const comment = normalizeComment({
        id: createId('comment'),
        userId,
        userName,
        text: commentInput.text,
        timestamp: new Date().toISOString()
      });

      if (!comment.text) {
        return null;
      }

      reports[reportIndex].comments.push(comment);
      saveReportsToFile(reports);
      return toPublicReport(reports[reportIndex], userId);
    },
    async toggleReaction(reportId, userIdInput, reactionTypeInput) {
      cleanupOldReports();
      const reactionType = normalizeText(reactionTypeInput, 16);
      const userId = normalizeText(userIdInput, 128);
      const reportIndex = reports.findIndex((report) => report.id === reportId);

      if (reportIndex < 0 || !userId || !VALID_REACTION_TYPES.includes(reactionType)) {
        return null;
      }

      const events = reports[reportIndex].reactions[reactionType];
      const existingIndex = events.findIndex((event) => event.userId === userId);

      if (existingIndex >= 0) {
        events.splice(existingIndex, 1);
      } else {
        events.push({
          userId,
          timestamp: new Date().toISOString()
        });
      }

      reports[reportIndex].reactions[reactionType] = dedupeReactionEvents(events);
      saveReportsToFile(reports);
      return toPublicReport(reports[reportIndex], userId);
    },
    async getWeeklyLeaderboard(limit = 10) {
      cleanupOldReports();
      return computeFileLeaderboard(reports, profiles, limit);
    },
    async close() {}
  };
}

function createPostgresStore(connectionString) {
  // Lazy-load so local file mode does not require pg to be installed.
  // eslint-disable-next-line global-require
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString,
    ssl:
      process.env.DATABASE_SSL === 'false'
        ? false
        : process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false
  });

  async function cleanupOldReports() {
    const result = await pool.query(
      `DELETE FROM reports WHERE timestamp < NOW() - INTERVAL '${REPORT_RETENTION_DAYS} days'`
    );
    return result.rowCount || 0;
  }

  async function queryReports(whereClause = '', params = [], viewerId = '') {
    const result = await pool.query(
      `
        SELECT
          r.id,
          r.type,
          r.latitude,
          r.longitude,
          r.description,
          r.severity,
          r.image_url,
          r.author_id,
          r.author_name,
          r.timestamp
        FROM reports r
        ${whereClause}
        ORDER BY r.timestamp DESC
      `,
      params
    );

    if (result.rows.length === 0) {
      return [];
    }

    const reportIds = result.rows.map((row) => row.id);

    const commentsResult = await pool.query(
      `
        SELECT
          id,
          report_id,
          user_id,
          user_name,
          comment,
          timestamp
        FROM report_comments
        WHERE report_id = ANY($1::text[])
        ORDER BY timestamp ASC
      `,
      [reportIds]
    );

    const reactionsResult = await pool.query(
      `
        SELECT
          report_id,
          user_id,
          reaction_type,
          timestamp
        FROM report_reactions
        WHERE report_id = ANY($1::text[])
      `,
      [reportIds]
    );

    const commentsByReportId = new Map();
    commentsResult.rows.forEach((row) => {
      const comments = commentsByReportId.get(row.report_id) || [];
      comments.push(
        normalizeComment({
          id: row.id,
          userId: row.user_id,
          userName: row.user_name,
          text: row.comment,
          timestamp: row.timestamp
        })
      );
      commentsByReportId.set(row.report_id, comments);
    });

    const reactionsByReportId = new Map();
    reactionsResult.rows.forEach((row) => {
      if (!VALID_REACTION_TYPES.includes(row.reaction_type)) {
        return;
      }

      const reactions = reactionsByReportId.get(row.report_id) || { like: [], upvote: [] };
      reactions[row.reaction_type].push(
        normalizeReactionEvent({
          userId: row.user_id,
          timestamp: row.timestamp
        })
      );
      reactionsByReportId.set(row.report_id, reactions);
    });

    return result.rows.map((row) =>
      toPublicReport(
        normalizeReport({
          ...row,
          comments: commentsByReportId.get(row.id) || [],
          reactions: reactionsByReportId.get(row.id) || { like: [], upvote: [] }
        }),
        viewerId
      )
    );
  }

  return {
    mode: 'postgres',
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('poop', 'aggressive')),
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          description TEXT DEFAULT '',
          severity TEXT DEFAULT 'medium',
          image_url TEXT,
          author_id TEXT,
          author_name TEXT DEFAULT '${DEFAULT_PROFILE_NAME}',
          timestamp TIMESTAMPTZ NOT NULL
        )
      `);

      await pool.query(`
        ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS author_id TEXT
      `);

      await pool.query(`
        ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '${DEFAULT_PROFILE_NAME}'
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reports_timestamp
        ON reports (timestamp DESC)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reports_type
        ON reports (type)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          bio TEXT DEFAULT '',
          avatar_emoji TEXT DEFAULT '${DEFAULT_PROFILE_AVATAR}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS report_comments (
          id TEXT PRIMARY KEY,
          report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          comment TEXT NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_report_comments_report_id
        ON report_comments (report_id)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_report_comments_timestamp
        ON report_comments (timestamp DESC)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS report_reactions (
          report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'upvote')),
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (report_id, user_id, reaction_type)
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_report_reactions_report_id
        ON report_reactions (report_id)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_report_reactions_timestamp
        ON report_reactions (timestamp DESC)
      `);

      await cleanupOldReports();
    },
    async cleanupOldReports() {
      return cleanupOldReports();
    },
    async getReports(type, options = {}) {
      await cleanupOldReports();
      const viewerId = normalizeText(options.viewerId, 128);

      if (!type) {
        return queryReports('', [], viewerId);
      }

      return queryReports('WHERE r.type = $1', [type], viewerId);
    },
    async getReportById(id, options = {}) {
      await cleanupOldReports();
      const viewerId = normalizeText(options.viewerId, 128);
      const reports = await queryReports('WHERE r.id = $1', [id], viewerId);
      return reports[0] || null;
    },
    async createReport(report) {
      await cleanupOldReports();

      const normalized = normalizeReport(report);
      const result = await pool.query(
        `
          INSERT INTO reports (
            id,
            type,
            latitude,
            longitude,
            description,
            severity,
            image_url,
            author_id,
            author_name,
            timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING
            id,
            type,
            latitude,
            longitude,
            description,
            severity,
            image_url,
            author_id,
            author_name,
            timestamp
        `,
        [
          normalized.id,
          normalized.type,
          normalized.latitude,
          normalized.longitude,
          normalized.description,
          normalized.severity,
          normalized.imageUrl,
          normalized.authorId || null,
          normalized.authorName,
          normalized.timestamp
        ]
      );

      return toPublicReport(normalizeReport(result.rows[0]), normalized.authorId);
    },
    async getProfileById(userId) {
      const normalizedUserId = normalizeText(userId, 128);
      if (!normalizedUserId) {
        return null;
      }

      const result = await pool.query(
        `
          SELECT
            id,
            display_name,
            bio,
            avatar_emoji,
            created_at,
            updated_at
          FROM profiles
          WHERE id = $1
        `,
        [normalizedUserId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return normalizeProfile({
        id: result.rows[0].id,
        displayName: result.rows[0].display_name,
        bio: result.rows[0].bio,
        avatarEmoji: result.rows[0].avatar_emoji,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      });
    },
    async upsertProfile(profileInput) {
      const normalized = normalizeProfile(profileInput);
      if (!normalized.id) {
        return null;
      }

      const result = await pool.query(
        `
          INSERT INTO profiles (
            id,
            display_name,
            bio,
            avatar_emoji,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (id)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            bio = EXCLUDED.bio,
            avatar_emoji = EXCLUDED.avatar_emoji,
            updated_at = NOW()
          RETURNING
            id,
            display_name,
            bio,
            avatar_emoji,
            created_at,
            updated_at
        `,
        [normalized.id, normalized.displayName, normalized.bio, normalized.avatarEmoji]
      );

      return normalizeProfile({
        id: result.rows[0].id,
        displayName: result.rows[0].display_name,
        bio: result.rows[0].bio,
        avatarEmoji: result.rows[0].avatar_emoji,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      });
    },
    async addComment(reportId, commentInput) {
      const report = await pool.query('SELECT id FROM reports WHERE id = $1', [reportId]);
      if (report.rows.length === 0) {
        return null;
      }

      const userId = normalizeText(commentInput.userId, 128);
      const text = normalizeText(commentInput.text, 500);
      const fallbackName = normalizeText(commentInput.userName, 40);

      if (!userId || !text) {
        return null;
      }

      const profile = await this.getProfileById(userId);
      const userName = (profile && profile.displayName) || fallbackName || DEFAULT_PROFILE_NAME;

      await pool.query(
        `
          INSERT INTO report_comments (
            id,
            report_id,
            user_id,
            user_name,
            comment,
            timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [createId('comment'), reportId, userId, userName, text, new Date().toISOString()]
      );

      return this.getReportById(reportId, { viewerId: userId });
    },
    async toggleReaction(reportId, userIdInput, reactionTypeInput) {
      const reactionType = normalizeText(reactionTypeInput, 16);
      const userId = normalizeText(userIdInput, 128);

      if (!userId || !VALID_REACTION_TYPES.includes(reactionType)) {
        return null;
      }

      const report = await pool.query('SELECT id FROM reports WHERE id = $1', [reportId]);
      if (report.rows.length === 0) {
        return null;
      }

      const existing = await pool.query(
        `
          SELECT 1
          FROM report_reactions
          WHERE report_id = $1 AND user_id = $2 AND reaction_type = $3
        `,
        [reportId, userId, reactionType]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `
            DELETE FROM report_reactions
            WHERE report_id = $1 AND user_id = $2 AND reaction_type = $3
          `,
          [reportId, userId, reactionType]
        );
      } else {
        await pool.query(
          `
            INSERT INTO report_reactions (
              report_id,
              user_id,
              reaction_type,
              timestamp
            ) VALUES ($1, $2, $3, $4)
          `,
          [reportId, userId, reactionType, new Date().toISOString()]
        );
      }

      return this.getReportById(reportId, { viewerId: userId });
    },
    async getWeeklyLeaderboard(limit = 10) {
      const safeLimit = Number.isFinite(Number(limit))
        ? Math.max(1, Math.min(Number(limit), 50))
        : 10;
      const cutoff = new Date(Date.now() - LEADERBOARD_WINDOW_DAYS * MS_PER_DAY).toISOString();

      const contributions = new Map();
      const fallbackNames = new Map();

      const reportsResult = await pool.query(
        `
          SELECT author_id AS user_id, author_name AS user_name
          FROM reports
          WHERE author_id IS NOT NULL
            AND author_id <> ''
            AND timestamp >= $1
        `,
        [cutoff]
      );

      reportsResult.rows.forEach((row) => {
        recordContribution(contributions, row.user_id, 'report');
        if (row.user_name) {
          fallbackNames.set(row.user_id, row.user_name);
        }
      });

      const commentsResult = await pool.query(
        `
          SELECT user_id, user_name
          FROM report_comments
          WHERE timestamp >= $1
        `,
        [cutoff]
      );

      commentsResult.rows.forEach((row) => {
        recordContribution(contributions, row.user_id, 'comment');
        if (row.user_name) {
          fallbackNames.set(row.user_id, row.user_name);
        }
      });

      const reactionsResult = await pool.query(
        `
          SELECT user_id
          FROM report_reactions
          WHERE timestamp >= $1
        `,
        [cutoff]
      );

      reactionsResult.rows.forEach((row) => {
        recordContribution(contributions, row.user_id, 'reaction');
      });

      if (contributions.size === 0) {
        return [];
      }

      const userIds = Array.from(contributions.keys());
      const profilesResult = await pool.query(
        `
          SELECT
            id,
            display_name,
            bio,
            avatar_emoji
          FROM profiles
          WHERE id = ANY($1::text[])
        `,
        [userIds]
      );

      const profilesById = new Map(
        profilesResult.rows.map((row) => [
          row.id,
          normalizeProfile({
            id: row.id,
            displayName: row.display_name,
            bio: row.bio,
            avatarEmoji: row.avatar_emoji
          })
        ])
      );

      return finalizeLeaderboard(contributions, profilesById, fallbackNames, safeLimit);
    },
    async close() {
      await pool.end();
    }
  };
}

function createReportStore() {
  const dataDirectory = process.env.REPORTS_DATA_DIR || path.join(__dirname, 'data');

  if (!process.env.DATABASE_URL) {
    return createFileStore(dataDirectory);
  }

  return createPostgresStore(process.env.DATABASE_URL);
}

module.exports = {
  createReportStore,
  REPORT_RETENTION_DAYS,
  LEADERBOARD_WINDOW_DAYS,
  VALID_REACTION_TYPES
};
