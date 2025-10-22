import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useMeetingStore } from '../store/meetingStore';
import { v4 as uuidv4 } from 'uuid';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const store = useMeetingStore();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await loadMeetings(user.id);
      }
    };
    getUser();
  }, []);

  const loadMeetings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleNewMeeting = (templateType: string) => {
    const newMeeting = {
      id: uuidv4(),
      title: '',
      transcript: '',
      notes: '',
      actions: [],
      duration_minutes: 0,
      is_billable: true,
      template_type: templateType,
      speaker_tags: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    store.setCurrentMeeting(newMeeting);
    store.setActions([]);
    navigate('/editor');
  };

  const handleOpenMeeting = (meeting: any) => {
    store.setCurrentMeeting(meeting);
    navigate('/editor');
  };

  const handleDeleteMeeting = async (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this meeting?')) {
      try {
        const { error } = await supabase
          .from('meetings')
          .delete()
          .eq('id', meetingId);

        if (error) throw error;
        
        if (user) {
          await loadMeetings(user.id);
        }
      } catch (error) {
        alert('Failed to delete meeting');
      }
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (templateType: string) => {
    switch(templateType) {
      case 'professional': return 'border-blue-500';
      case 'academic': return 'border-purple-500';
      case 'study-group': return 'border-green-500';
      default: return 'border-gray-500';
    }
  };

  const getTemplateLabel = (templateType: string) => {
    switch(templateType) {
      case 'professional': return 'Professional';
      case 'academic': return 'Academic';
      case 'study-group': return 'Study Group';
      default: return 'Professional';
    }
  };

  const recentMeetings = meetings.slice(0, 3);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <div style={{ padding: window.innerWidth < 768 ? '2rem 1rem' : '3rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: window.innerWidth < 768 ? '1 1 100%' : '1' }}>
            <h1 style={{ fontSize: window.innerWidth < 768 ? '2rem' : '3rem', fontWeight: 'bold', color: 'white', marginBottom: '0.75rem' }}>Meeting Manager</h1>
            <p style={{ fontSize: window.innerWidth < 768 ? '1rem' : '1.25rem', color: 'rgba(255,255,255,0.9)' }}>Record, transcribe, and organize your meetings with AI-powered insights</p>
          </div>
          <button
            onClick={handleLogout}
            style={{ padding: '0.875rem 1.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '1rem' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: window.innerWidth < 768 ? '0 1rem 2rem' : '0 2rem 2rem' }}>
        {/* Start New Meeting Section */}
        <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: window.innerWidth < 768 ? '1.5rem' : '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: window.innerWidth < 768 ? '1.5rem' : '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem' }}>Start New Meeting</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <button 
              onClick={() => handleNewMeeting('professional')}
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: '0.75rem', padding: '2rem', color: 'white', border: 'none', cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>+</div>
              <h3 style={{ fontSize: '1.375rem', fontWeight: '600', marginBottom: '0.5rem', color: 'white' }}>Professional Meeting</h3>
              <p style={{ color: 'white', fontSize: '1rem', opacity: 0.95 }}>Business discussions & decisions</p>
            </button>

            <button 
              onClick={() => handleNewMeeting('academic')}
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)', borderRadius: '0.75rem', padding: '2rem', color: 'white', border: 'none', cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📄</div>
              <h3 style={{ fontSize: '1.375rem', fontWeight: '600', marginBottom: '0.5rem', color: 'white' }}>Academic Lecture</h3>
              <p style={{ color: 'white', fontSize: '1rem', opacity: 0.95 }}>Class notes & key concepts</p>
            </button>

            <button 
              onClick={() => handleNewMeeting('study-group')}
              style={{ background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', borderRadius: '0.75rem', padding: '2rem', color: 'white', border: 'none', cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✓</div>
              <h3 style={{ fontSize: '1.375rem', fontWeight: '600', marginBottom: '0.5rem', color: 'white' }}>Study Session</h3>
              <p style={{ color: 'white', fontSize: '1rem', opacity: 0.95 }}>Collaborative learning</p>
            </button>
          </div>
        </div>

        {/* Recent Meetings */}
        <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: window.innerWidth < 768 ? '1.5rem' : '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: window.innerWidth < 768 ? '1.5rem' : '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem' }}>Recent Meetings</h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading meetings...</div>
          ) : meetings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              No meetings yet. Start your first meeting above!
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {recentMeetings.map((meeting) => {
                  const borderColor = meeting.template_type === 'professional' ? '#3b82f6' : 
                                     meeting.template_type === 'academic' ? '#a855f7' : '#10b981';
                  return (
                    <button
                      key={meeting.id}
                      onClick={() => handleOpenMeeting(meeting)}
                      style={{ 
                        background: 'white', 
                        borderLeft: `4px solid ${borderColor}`, 
                        borderRadius: '0.5rem', 
                        padding: '1.5rem', 
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', 
                        cursor: 'pointer', 
                        textAlign: 'left',
                        border: '1px solid #e5e7eb',
                        borderLeftWidth: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', flex: 1 }}>{meeting.title || 'Untitled Meeting'}</h3>
                        {meeting.is_billable && (
                          <span style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: '#d1fae5', color: '#065f46', fontSize: '0.75rem', borderRadius: '9999px', fontWeight: '500' }}>
                            Billable
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '0.5rem' }}>⏱️</span>
                          {formatDuration(meeting.duration_minutes || 0)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '0.5rem' }}>📄</span>
                          {getTemplateLabel(meeting.template_type)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem' }}>
                          {formatDate(meeting.updated_at)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* All Meetings Table */}
              {meetings.length > 3 && (
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>All Meetings</h3>
                  <div style={{ overflowX: 'auto', display: window.innerWidth < 768 ? 'block' : 'block' }}>
                    {window.innerWidth < 768 ? (
                      // Mobile Card View
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {meetings.slice(3).map((meeting) => {
                          const borderColor = meeting.template_type === 'professional' ? '#3b82f6' : 
                                             meeting.template_type === 'academic' ? '#a855f7' : '#10b981';
                          return (
                            <div
                              key={meeting.id}
                              onClick={() => handleOpenMeeting(meeting)}
                              style={{ 
                                background: 'white', 
                                borderLeft: `4px solid ${borderColor}`, 
                                borderRadius: '0.5rem', 
                                padding: '1rem', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                border: '1px solid #e5e7eb',
                                borderLeftWidth: '4px'
                              }}
                            >
                              <h4 style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                                {meeting.title || 'Untitled Meeting'}
                              </h4>
                              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                {formatDate(meeting.updated_at)}
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                ⏱️ {formatDuration(meeting.duration_minutes || 0)} • {getTemplateLabel(meeting.template_type)}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                                {meeting.is_billable && (
                                  <span style={{ padding: '0.25rem 0.5rem', background: '#d1fae5', color: '#065f46', fontSize: '0.75rem', borderRadius: '9999px', fontWeight: '500' }}>
                                    Billable
                                  </span>
                                )}
                                <button
                                  onClick={(e) => handleDeleteMeeting(meeting.id, e)}
                                  style={{ padding: '0.5rem 0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', marginLeft: 'auto' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Desktop Table View
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Title</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Duration</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Type</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Status</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {meetings.slice(3).map((meeting) => {
                          const borderColor = meeting.template_type === 'professional' ? '#3b82f6' : 
                                             meeting.template_type === 'academic' ? '#a855f7' : '#10b981';
                          return (
                            <tr 
                              key={meeting.id}
                              onClick={() => handleOpenMeeting(meeting)}
                              style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <div style={{ width: '4px', height: '2rem', background: borderColor, borderRadius: '2px', marginRight: '0.75rem' }}></div>
                                  <span style={{ fontWeight: '500', color: '#1f2937' }}>{meeting.title || 'Untitled Meeting'}</span>
                                </div>
                              </td>
                              <td style={{ padding: '1rem', color: '#6b7280' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <span style={{ marginRight: '0.5rem' }}>⏱️</span>
                                  {formatDuration(meeting.duration_minutes || 0)}
                                </div>
                              </td>
                              <td style={{ padding: '1rem', color: '#6b7280' }}>{getTemplateLabel(meeting.template_type)}</td>
                              <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>{formatDate(meeting.updated_at)}</td>
                              <td style={{ padding: '1rem' }}>
                                {meeting.is_billable && (
                                  <span style={{ padding: '0.25rem 0.5rem', background: '#d1fae5', color: '#065f46', fontSize: '0.75rem', borderRadius: '9999px', fontWeight: '500' }}>
                                    Billable
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'right' }}>
                                <button
                                  onClick={(e) => handleDeleteMeeting(meeting.id, e)}
                                  style={{ padding: '0.5rem 0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Privacy Notice */}
        <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ background: '#e0e7ff', borderRadius: '0.5rem', padding: '0.75rem', marginRight: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🔒</span>
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>Privacy-First Design</h3>
              <p style={{ color: '#6b7280' }}>
                Your audio recordings are processed locally and never stored on our servers. Only transcripts and notes you choose to save are stored securely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};