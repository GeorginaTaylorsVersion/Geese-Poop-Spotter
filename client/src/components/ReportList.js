import React from 'react';
import './ReportList.css';

function ReportList({ reports }) {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return '#f56565';
      case 'medium':
        return '#ed8936';
      case 'low':
        return '#48bb78';
      default:
        return '#718096';
    }
  };

  return (
    <div className="report-list-container">
      <h3 className="list-title">Recent Reports ({reports.length})</h3>
      {reports.length === 0 ? (
        <div className="empty-state">
          <p>No reports yet. Be the first to report!</p>
        </div>
      ) : (
        <div className="reports-list">
          {reports
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map((report) => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <span className="report-type">
                    {report.type === 'aggressive' ? '⚠️ Aggressive' : '💩 Poop'}
                  </span>
                  <span
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(report.severity) }}
                  >
                    {report.severity}
                  </span>
                </div>
                {report.description && (
                  <p className="report-description">{report.description}</p>
                )}
                {report.imageUrl && (
                  <div className="report-image">
                    <img
                      src={report.imageUrl}
                      alt="Proof"
                    />
                  </div>
                )}
                <div className="report-footer">
                  <small className="report-time">{formatDate(report.timestamp)}</small>
                  <small className="report-location">
                    {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                  </small>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default ReportList;
