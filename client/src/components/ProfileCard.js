import React, { useEffect, useState } from 'react';
import { PROFILE_AVATAR_OPTIONS } from '../utils/profile';
import './ProfileCard.css';

function ProfileCard({ profile, onSave, isSaving, error }) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🦢');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!profile) {
      return;
    }
    setDisplayName(profile.displayName || '');
    setBio(profile.bio || '');
    setAvatarEmoji(profile.avatarEmoji || '🦢');
  }, [profile]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveMessage('');

    const nextProfile = {
      displayName: displayName.trim(),
      bio: bio.trim(),
      avatarEmoji
    };

    const success = await onSave(nextProfile);
    if (success) {
      setSaveMessage('Profile saved.');
    }
  };

  if (!profile) {
    return (
      <section className="profile-card">
        <h3>Your Profile</h3>
        <p className="profile-muted">Loading profile...</p>
      </section>
    );
  }

  return (
    <section className="profile-card">
      <div className="profile-title-row">
        <h3>Your Profile</h3>
        <span className="profile-preview-emoji">{avatarEmoji}</span>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        <label htmlFor="displayName">Display Name</label>
        <input
          id="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={40}
          required
        />

        <label htmlFor="avatarEmoji">Avatar</label>
        <select
          id="avatarEmoji"
          value={avatarEmoji}
          onChange={(event) => setAvatarEmoji(event.target.value)}
        >
          {PROFILE_AVATAR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={2}
          maxLength={160}
          placeholder="Share your geese-safety strategy..."
        />

        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {error && <p className="profile-error">{error}</p>}
      {!error && saveMessage && <p className="profile-success">{saveMessage}</p>}
      <p className="profile-user-id">ID: {profile.id}</p>
    </section>
  );
}

export default ProfileCard;
