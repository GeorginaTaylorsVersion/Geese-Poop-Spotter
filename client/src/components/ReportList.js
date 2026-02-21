import React, { useMemo, useState } from 'react';
import './ReportList.css';

function ReportList({
  reports,
  apiBaseUrl,
  currentUserId,
  currentUserName,
  onReportChange,
  onContribution
}) {
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [actionError, setActionError] = useState('');
  const [pendingReaction, setPendingReaction] = useState('');
  const [pendingCommentReportId, setPendingCommentReportId] = useState('');

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [reports]
  );

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

  const handleReaction = async (reportId, reactionType) => {
    if (!currentUserId || !apiBaseUrl) {
      return;
    }

    setActionError('');
    const pendingKey = `${reportId}:${reactionType}`;
    setPendingReaction(pendingKey);

    try {
      const response = await fetch(`${apiBaseUrl}/reports/${reportId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          reactionType
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update reaction');
      }

      onReportChange(data);
      if (onContribution) {
        onContribution();
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
      setActionError('Could not save reaction. Please try again.');
    } finally {
      setPendingReaction('');
    }
  };

  const handleCommentSubmit = async (reportId) => {
    if (!currentUserId || !apiBaseUrl) {
      return;
    }

    const draft = (commentDrafts[reportId] || '').trim();
    if (!draft) {
      return;
    }

    setActionError('');
    setPendingCommentReportId(reportId);

    try {
      const response = await fetch(`${apiBaseUrl}/reports/${reportId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          userName: currentUserName,
          text: draft
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to post comment');
      }

      onReportChange(data);
      setCommentDrafts((previousDrafts) => ({
        ...previousDrafts,
        [reportId]: ''
      }));
      if (onContribution) {
        onContribution();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      setActionError('Could not post comment. Please try again.');
    } finally {
      setPendingCommentReportId('');
    }
  };

  const toggleComments = (reportId) => {
    setExpandedComments((previousState) => ({
      ...previousState,
      [reportId]: !previousState[reportId]
    }));
  };

  return (
    <div className="report-list-container">
      <h3 className="list-title">Recent Reports ({reports.length})</h3>
      {actionError && <p className="report-action-error">{actionError}</p>}
      {reports.length === 0 ? (
        <div className="empty-state">
          <p>No reports yet. Be the first to report!</p>
        </div>
      ) : (
        <div className="reports-list">
          {sortedReports.map((report) => (
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
                <p className="report-author">By {report.authorName || 'Goose Watcher'}</p>
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

                <div className="report-social-bar">
                  <button
                    type="button"
                    className={`social-btn ${
                      report.viewerReactions && report.viewerReactions.like ? 'active' : ''
                    }`}
                    onClick={() => handleReaction(report.id, 'like')}
                    disabled={pendingReaction === `${report.id}:like`}
                  >
                    👍 {report.reactions ? report.reactions.like : 0}
                  </button>
                  <button
                    type="button"
                    className={`social-btn ${
                      report.viewerReactions && report.viewerReactions.upvote ? 'active' : ''
                    }`}
                    onClick={() => handleReaction(report.id, 'upvote')}
                    disabled={pendingReaction === `${report.id}:upvote`}
                  >
                    ⬆️ {report.reactions ? report.reactions.upvote : 0}
                  </button>
                  <button
                    type="button"
                    className={`social-btn comment-toggle ${
                      expandedComments[report.id] ? 'active' : ''
                    }`}
                    onClick={() => toggleComments(report.id)}
                  >
                    💬 {report.commentCount || 0}
                  </button>
                </div>

                {expandedComments[report.id] && (
                  <div className="comments-section">
                    <div className="comments-list">
                      {!report.comments || report.comments.length === 0 ? (
                        <p className="comments-empty">No comments yet.</p>
                      ) : (
                        report.comments.map((comment) => (
                          <div key={comment.id} className="comment-row">
                            <div className="comment-meta">
                              <strong>{comment.userName}</strong>
                              <span>{formatDate(comment.timestamp)}</span>
                            </div>
                            <p>{comment.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="comment-compose">
                      <textarea
                        value={commentDrafts[report.id] || ''}
                        onChange={(event) =>
                          setCommentDrafts((previousDrafts) => ({
                            ...previousDrafts,
                            [report.id]: event.target.value
                          }))
                        }
                        maxLength={500}
                        placeholder="Add a comment..."
                      />
                      <button
                        type="button"
                        onClick={() => handleCommentSubmit(report.id)}
                        disabled={
                          pendingCommentReportId === report.id ||
                          !(commentDrafts[report.id] || '').trim()
                        }
                      >
                        {pendingCommentReportId === report.id ? 'Posting...' : 'Post'}
                      </button>
                    </div>
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
