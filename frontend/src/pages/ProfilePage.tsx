import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Award, Calendar, CheckCircle2, Code, Clock, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import './ProfilePage.css';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  bio?: string;
  createdAt: string;
  stats: {
    problemsSolved: number;
    totalSubmissions: number;
    successRate: number;
  };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const submissionActivity = [
    { day: 'Mon', submissions: 4 },
    { day: 'Tue', submissions: 7 },
    { day: 'Wed', submissions: 2 },
    { day: 'Thu', submissions: 8 },
    { day: 'Fri', submissions: 5 },
    { day: 'Sat', submissions: 12 },
    { day: 'Sun', submissions: 3 },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setTimeout(() => {
          const mockProfile: UserProfile = {
            id: user?.id || 'u123',
            name: user?.displayName || 'AKSHAT ARYAN',
            email: user?.email || 'akshat.aryan@codeforge.io',
            role: user?.role || 'LEAD ARCHITECT',
            bio: 'Building high-performance multi-language compilers, AST parsers, and Gemini AI analysis engines.',
            createdAt: '2023-05-12T00:00:00Z',
            stats: {
              problemsSolved: 243,
              totalSubmissions: 310,
              successRate: 99.3
            }
          };
          setProfile(mockProfile);
          setEditName(mockProfile.name);
          setEditBio(mockProfile.bio || '');
          setLoading(false);
        }, 400);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      setSaveLoading(true);
      await new Promise(resolve => setTimeout(resolve, 400));
      if (profile) {
        setProfile({
          ...profile,
          name: editName,
          bio: editBio
        });
      }
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (error || !profile) {
    return <div className="profile-error">{error || 'Profile not found'}</div>;
  }

  const initials = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="light-profile-page page-enter">
      {/* --------------------------------------------------------------------
          Header Card (§3.5 / Part 4)
          -------------------------------------------------------------------- */}
      <div className="profile-header-card">
        <div className="profile-avatar-circle">
          {initials}
        </div>

        <div className="profile-details-col">
          {isEditing ? (
            <div className="profile-edit-form">
              <input 
                type="text" 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                className="profile-edit-input"
                placeholder="Your Name"
              />
              <textarea 
                value={editBio} 
                onChange={e => setEditBio(e.target.value)} 
                className="profile-edit-textarea"
                placeholder="Write a short bio about yourself..."
              />
              <div className="profile-edit-actions">
                <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={saveLoading}>
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)} disabled={saveLoading}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="profile-name-row">
                <h1 className="profile-heading-name">{profile.name}</h1>
                <span className="badge-role-student">{profile.role.toUpperCase()}</span>
              </div>
              <p className="profile-bio-text">{profile.bio || "No bio provided."}</p>
              
              <div className="profile-meta-row">
                <span className="profile-meta-item"><Mail size={15} /> {profile.email}</span>
                <span className="profile-meta-item"><Calendar size={15} /> Member since {new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
              
              <button className="btn btn-secondary btn-sm profile-edit-btn" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            </>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------
          Two Side-by-Side Cards (Statistics & Activity)
          -------------------------------------------------------------------- */}
      <div className="profile-two-col-grid">
        {/* Left: Statistics with nested well cards (§3.5) */}
        <div className="profile-section-card">
          <div className="section-card-title-row">
            <Award size={18} className="text-emerald" />
            <h2 className="section-card-title">Statistics</h2>
          </div>

          <div className="nested-wells-grid">
            <div className="stat-well-card">
              <div className="well-icon-circle emerald">
                <CheckCircle2 size={16} />
              </div>
              <div className="well-stat-mono">{profile.stats.problemsSolved}</div>
              <div className="well-stat-label">Problems Solved</div>
            </div>

            <div className="stat-well-card">
              <div className="well-icon-circle sky">
                <Code size={16} />
              </div>
              <div className="well-stat-mono">{profile.stats.totalSubmissions}</div>
              <div className="well-stat-label">Total Submissions</div>
            </div>

            <div className="stat-well-card">
              <div className="well-icon-circle amber">
                <Zap size={16} />
              </div>
              <div className="well-stat-mono">{profile.stats.successRate}%</div>
              <div className="well-stat-label">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Right: Activity Last 7 Days (§3.6) */}
        <div className="profile-section-card">
          <div className="section-card-title-row">
            <Clock size={18} className="text-sky" />
            <h2 className="section-card-title">Activity (Last 7 Days)</h2>
          </div>

          <div className="profile-bar-chart-container">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={submissionActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" vertical={false} />
                <XAxis dataKey="day" stroke="#98A2B3" fontSize={12} tickLine={false} axisLine={{ stroke: '#E4E7EC' }} />
                <YAxis stroke="#98A2B3" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip 
                  cursor={{ fill: '#F5ECE3' }}
                  contentStyle={{ 
                    backgroundColor: '#FAF4EE', 
                    border: '1px solid #C8B6A6', 
                    borderRadius: '8px', 
                    color: '#2D231E',
                    fontSize: '12px',
                    boxShadow: '0 2px 8px rgba(70,50,40,0.12)'
                  }}
                />
                <Bar dataKey="submissions" fill="#0284C7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
