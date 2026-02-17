const fs = require('fs');
const path = require('path');

const REPORT_RETENTION_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeReport(raw) {
  const parsedTimestamp = new Date(raw.timestamp);
  const safeTimestamp = Number.isNaN(parsedTimestamp.getTime())
    ? new Date().toISOString()
    : parsedTimestamp.toISOString();

  return {
    id: raw.id,
    type: raw.type,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    description: raw.description || '',
    severity: raw.severity || 'medium',
    imageUrl: raw.imageUrl || raw.image_url || null,
    timestamp: safeTimestamp
  };
}

function createFileStore(dataDirectory) {
  const dataFile = path.join(dataDirectory, 'reports.json');
  let reports = [];

  function ensureDataDirectory() {
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }
  }

  function loadReportsFromFile() {
    try {
      if (!fs.existsSync(dataFile)) {
        return [];
      }

      const data = fs.readFileSync(dataFile, 'utf8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.map(normalizeReport) : [];
    } catch (error) {
      console.error('Error loading reports:', error);
      return [];
    }
  }

  function saveReportsToFile(nextReports) {
    try {
      fs.writeFileSync(dataFile, JSON.stringify(nextReports, null, 2));
    } catch (error) {
      console.error('Error saving reports:', error);
    }
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
      reports = loadReportsFromFile();
      cleanupOldReports();
    },
    async cleanupOldReports() {
      return cleanupOldReports();
    },
    async getReports(type) {
      cleanupOldReports();
      const filtered = type ? reports.filter((report) => report.type === type) : reports;
      return [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    async getReportById(id) {
      cleanupOldReports();
      return reports.find((report) => report.id === id) || null;
    },
    async createReport(report) {
      cleanupOldReports();
      const normalized = normalizeReport(report);
      reports.push(normalized);
      saveReportsToFile(reports);
      return normalized;
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

  async function queryReports(whereClause = '', params = []) {
    const result = await pool.query(
      `
        SELECT
          id,
          type,
          latitude,
          longitude,
          description,
          severity,
          image_url,
          timestamp
        FROM reports
        ${whereClause}
        ORDER BY timestamp DESC
      `,
      params
    );

    return result.rows.map(normalizeReport);
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
          timestamp TIMESTAMPTZ NOT NULL
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reports_timestamp
        ON reports (timestamp DESC)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reports_type
        ON reports (type)
      `);

      await cleanupOldReports();
    },
    async cleanupOldReports() {
      return cleanupOldReports();
    },
    async getReports(type) {
      await cleanupOldReports();

      if (!type) {
        return queryReports();
      }

      return queryReports('WHERE type = $1', [type]);
    },
    async getReportById(id) {
      await cleanupOldReports();
      const reports = await queryReports('WHERE id = $1', [id]);
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
            timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING
            id,
            type,
            latitude,
            longitude,
            description,
            severity,
            image_url,
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
          normalized.timestamp
        ]
      );

      return normalizeReport(result.rows[0]);
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
  REPORT_RETENTION_DAYS
};
