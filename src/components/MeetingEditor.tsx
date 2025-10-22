import React, { useState, useEffect, useRef } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const TEMPLATE_SECTIONS = {
  professional: {
    name: 'Professional Meeting Notes',
    sections: [
      { id: 'meetingDetails', label: 'Meeting Details', placeholder: 'Date:\nTime:\nLocation/Platform:\nAttendees:\nNote-taker:' },
      { id: 'executiveSummary', label: 'Executive Summary', placeholder: '(Complete after meeting)' },
      { id: 'meetingObjectives', label: 'Meeting Objectives', placeholder: 'Primary purpose:\nKey agenda items:' },
      { id: 'discussionNotes', label: 'Discussion Notes', placeholder: 'Topic 1:\nTopic 2:\nTopic 3:' },
      { id: 'decisionsMade', label: 'Decisions Made', placeholder: '- \n- ' },
      { id: 'actionItems', label: 'Action Items', placeholder: 'Task:\nOwner:\nDue Date:\nStatus:' },
      { id: 'parkingLot', label: 'Parking Lot', placeholder: 'Items to revisit later' },
      { id: 'nextMeeting', label: 'Next Meeting', placeholder: 'Date:\nFocus:' },
    ]
  },
  academic: {
    name: 'Academic Lecture Notes',
    sections: [
      { id: 'courseInfo', label: 'Course Information', placeholder: 'Course, Date, Lecture #, Topic...' },
      { id: 'lectureSummary', label: 'Lecture Summary', placeholder: 'Overview of the lecture...' },
      { id: 'keyConcepts', label: 'Key Concepts', placeholder: 'Main concepts covered...' },
      { id: 'detailedNotes', label: 'Detailed Notes', placeholder: 'In-depth notes...' },
      { id: 'examplesStudies', label: 'Examples/Case Studies', placeholder: '- ' },
      { id: 'questions', label: 'Questions & Clarifications Needed', placeholder: 'Clarifications needed...' },
      { id: 'studyPriorities', label: 'Study Priorities', placeholder: 'What to review/practice' },
      { id: 'relatedMaterials', label: 'Related Materials', placeholder: 'Readings, assignments...' },
    ]
  },
  'study-group': {
    name: 'Study Group/Collaboration Session',
    sections: [
      { id: 'sessionDetails', label: 'Session Details', placeholder: 'Date:\nDuration:\nParticipants:\nLocation:' },
      { id: 'sessionSummary', label: 'Session Summary', placeholder: '(Complete after session)' },
      { id: 'sessionGoals', label: 'Session Goals', placeholder: '- \n- ' },
      { id: 'topicsCovered', label: 'Topics Covered', placeholder: 'Topic 1:\nTopic 2:\nTopic 3:' },
      { id: 'keyInsights', label: 'Key Insights & Breakthroughs', placeholder: '- ' },
      { id: 'problemSolving', label: 'Problem-Solving Work', placeholder: 'Problem:\nApproach:\nSolution:' },
      { id: 'unresolvedQuestions', label: 'Unresolved Questions', placeholder: '- ' },
      { id: 'individualActions', label: 'Individual Action Items', placeholder: 'Person:\nTask:\nDeadline:' },
      { id: 'resources', label: 'Resources to Share', placeholder: '- ' },
      { id: 'nextSession', label: 'Next Session', placeholder: 'Date:\nFocus areas:\nPreparation needed:' },
    ]
  }
};

export const MeetingEditor: React.FC = () => {
  const navigate = useNavigate();
  const store = useMeetingStore();
  const [recording, setRecording] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isBillable, setIsBillable] = useState(true);
  const [templateType, setTemplateType] = useState('professional');
  const [user, setUser] = useState<any>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [audioRecorded, setAudioRecorded] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [templateData, setTemplateData] = useState<{ [key: string]: string }>({});
  const [userNotes, setUserNotes] = useState('');
  const [showExtractedSections, setShowExtractedSections] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'actions' | 'template' | 'export'>('template');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveChoices, setSaveChoices] = useState({
    saveTranscript: true,
    saveNotes: true,
    deleteAudio: true,
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (store.currentMeeting?.template_type) {
      let templateToUse = store.currentMeeting.template_type;
      
      const templateMap: { [key: string]: string } = {
        'daily-standup': 'professional',
        '1-on-1': 'professional',
        'client-meeting': 'professional',
        'team-meeting': 'professional',
        'sales-call': 'professional',
      };
      
      if (templateMap[templateToUse]) {
        templateToUse = templateMap[templateToUse];
      }
      
      setTemplateType(templateToUse);
      initializeTemplate(templateToUse);
      
      // Check if this is a saved meeting with extracted data
      if (store.currentMeeting?.notes && store.currentMeeting.notes.trim().length > 0) {
        setShowExtractedSections(true);
      }
    } else {
      setTemplateType('professional');
      initializeTemplate('professional');
    }
  }, [store.currentMeeting?.id, store.currentMeeting?.template_type]);

  const initializeTemplate = (type: string) => {
    const template = TEMPLATE_SECTIONS[type as keyof typeof TEMPLATE_SECTIONS];
    if (template) {
      const initialized: { [key: string]: string } = {};
      template.sections.forEach((section) => {
        initialized[section.id] = '';
      });
      setTemplateData(initialized);
    }
  };

  const handleTemplateChange = (type: string) => {
    setTemplateType(type);
    initializeTemplate(type);
  };

  const updateSectionData = (sectionId: string, value: string) => {
    setTemplateData(prev => ({
      ...prev,
      [sectionId]: value
    }));
  };

  useEffect(() => {
    store.updateMeeting({ 
      duration_minutes: Math.floor(timeElapsed / 60) 
    });
  }, [timeElapsed]);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onerror = (event: any) => {
        alert(`Recording error: ${event.error}`);
      };

      mediaRecorder.onstop = () => {
        setAudioRecorded(true);
      };

      mediaRecorder.start(1000);
      setRecording(true);
    } catch (error) {
      alert('Please allow microphone access');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
    }
  };

  const deleteAudio = () => {
    audioChunksRef.current = [];
    setUploadedFile(null);
    setAudioRecorded(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    alert('Audio deleted');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      setUploadedFile(file);
      setAudioRecorded(true);
      alert(`File selected: ${file.name}`);
    } else {
      alert('Please select an audio or video file');
    }
  };

  const handleExtractDetailsAfterTranscribe = async () => {
    try {
      setTranscribing(true);
      const fileToTranscribe = uploadedFile || 
        (audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: 'audio/webm' }) : null);

      if (!fileToTranscribe) {
        alert('No audio recorded or file selected.');
        setTranscribing(false);
        return;
      }

      const transcriptionStartTime = Date.now();
      setTranscriptionProgress('Transcribing audio...');

      const filename = uploadedFile ? uploadedFile.name : 'meeting.webm';
      const formData = new FormData();
      formData.append('audio', fileToTranscribe, filename);

      const progressInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - transcriptionStartTime) / 1000);
        setTranscriptionProgress(`Transcribing... (${formatDuration(elapsed)})`);
      }, 1000);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Transcription failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Transcription failed');
      }

      store.updateMeeting({ transcript: result.transcript });
      const actualTime = Math.round((Date.now() - transcriptionStartTime) / 1000);
      setTimeElapsed(actualTime);
      
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await new Promise(resolve => setTimeout(resolve, 300));
      await extractDetailsWithTranscript(result.transcript);

    } catch (error) {
      setTranscriptionProgress('');
      alert(`Failed: ${(error as Error).message}`);
    } finally {
      setTranscribing(false);
    }
  };

  const extractDetailsWithTranscript = async (transcript: string) => {
    try {
      setTranscribing(true);
      setTranscriptionProgress('Extracting template details...');

      const template = TEMPLATE_SECTIONS[templateType as keyof typeof TEMPLATE_SECTIONS];
      if (!template) throw new Error('Invalid template type');

      const sectionsList = template.sections.map(s => s.id).join('\n- ');

      const prompt = `Extract all relevant details from this transcript and fill in these sections: - ${sectionsList}\n\nTRANSCRIPT:\n${transcript}\n\nReturn ONLY JSON with these keys filled in (leave empty if not applicable): ${JSON.stringify(Object.fromEntries(template.sections.map(s => [s.id, ''])))}`;

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: prompt, style: 'professional' }),
      });

      if (!response.ok) throw new Error('Failed to extract details');

      const data = await response.json() as any;
      const responseText = data.summary;

      let extractedData: any = {};
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          extractedData = JSON.parse(responseText);
        }
      } catch (parseError) {
        alert('Could not parse AI response.');
        return;
      }

      // Auto-generate summary based on template type
      const summaryKey = templateType === 'professional' ? 'executiveSummary' : 
                         templateType === 'academic' ? 'lectureSummary' : 'sessionSummary';
      
      if (!extractedData[summaryKey]) {
        setTranscriptionProgress('Generating AI summary...');
        const summaryPrompt = `Create a concise ${templateType} summary (2-3 sentences) of this meeting transcript:\n\n${transcript}`;
        
        const summaryResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/generate-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: summaryPrompt, style: 'professional' }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          extractedData[summaryKey] = summaryData.summary;
        }
      }

      setTemplateData(prev => ({ ...prev, ...extractedData }));
      setTranscriptionProgress('');
      setActiveTab('template');
      setShowExtractedSections(true);
      alert('Notes extracted successfully!');
    } catch (error) {
      setTranscriptionProgress('');
      alert(`Failed to extract details: ${(error as Error).message}`);
    } finally {
      setTranscribing(false);
    }
  };

  const handleExtractFromTranscript = async () => {
    if (!store.currentMeeting?.transcript) {
      alert('No transcript available.');
      return;
    }
    await extractDetailsWithTranscript(store.currentMeeting.transcript);
  };

  const extractActions = async () => {
    if (!store.currentMeeting?.transcript) {
      alert('No transcript available. Extract details first.');
      return;
    }

    try {
      setTranscribing(true);
      setTranscriptionProgress('Extracting action items...');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/extract-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: store.currentMeeting.transcript }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to extract actions');
      }

      const result = await response.json();
      
      if (result.success && result.actions && Array.isArray(result.actions)) {
        const actions = result.actions.map((action: any) => ({
          id: uuidv4(),
          action_text: action.action_text || 'No description',
          assignee: action.assignee || 'Unassigned',
          due_date: action.due_date || '',
          speaker: action.speaker || '',
          completed: false,
        }));

        store.setActions(actions);
        setTranscriptionProgress('');
        alert(`Extracted ${actions.length} action items!`);
      } else if (result.actions && result.actions.length === 0) {
        alert('No action items found in transcript');
        setTranscriptionProgress('');
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      setTranscriptionProgress('');
      alert(`Failed to extract actions: ${(error as Error).message}`);
    } finally {
      setTranscribing(false);
    }
  };

  const exportPDF = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: store.currentMeeting?.title || 'Meeting',
          transcript: store.currentMeeting?.transcript || '',
          notes: getFormattedNotes() || '',
          actions: store.actions || [],
        }),
      });

      if (!response.ok) throw new Error('PDF export failed');
      const data = await response.json();
      
      const fileResponse = await fetch(`${process.env.REACT_APP_API_URL}${data.url}`);
      const blob = await fileResponse.blob();
      
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      alert('PDF downloaded!');
    } catch (error) {
      alert(`Export failed: ${(error as Error).message}`);
    }
  };

  const exportWord = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/export-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: store.currentMeeting?.title || 'Meeting',
          transcript: store.currentMeeting?.transcript || '',
          notes: getFormattedNotes() || '',
          actions: store.actions || [],
        }),
      });

      if (!response.ok) throw new Error('Word export failed');
      const data = await response.json();
      
      const fileResponse = await fetch(`${process.env.REACT_APP_API_URL}${data.url}`);
      const blob = await fileResponse.blob();
      
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      alert('Word document downloaded!');
    } catch (error) {
      alert(`Export failed: ${(error as Error).message}`);
    }
  };

  const sendEmail = async () => {
    try {
      const subject = `Meeting Notes: ${store.currentMeeting?.title || 'Meeting'}`;
      let body = `Meeting: ${store.currentMeeting?.title}\n\n`;

      // Add user's manual notes
      if (userNotes && userNotes.trim().length > 0) {
        body += `YOUR NOTES:\n${userNotes}\n\n`;
      }

      if (store.currentMeeting?.transcript) {
        body += `TRANSCRIPT:\n${store.currentMeeting.transcript}\n\n`;
      }
      
      const template = TEMPLATE_SECTIONS[templateType as keyof typeof TEMPLATE_SECTIONS];
      if (template) {
        const hasExtractedData = template.sections.some(section => 
          templateData[section.id] && templateData[section.id].trim().length > 0
        );
        
        if (hasExtractedData) {
          body += `EXTRACTED MEETING DETAILS:\n\n`;
          template.sections.forEach((section) => {
            const value = templateData[section.id];
            if (value && value.trim().length > 0) {
              body += `${section.label}:\n${value}\n\n`;
            }
          });
        }
      }
      
      if (store.actions.length > 0) {
        body += `ACTION ITEMS:\n`;
        store.actions.forEach((action) => {
          body += `- ${action.action_text} (Assignee: ${action.assignee}, Due: ${action.due_date || 'Not set'})\n`;
        });
      }

      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;

      setTimeout(() => {
        alert('Email client opened!');
      }, 500);
    } catch (error) {
      alert(`Email preparation failed: ${(error as Error).message}`);
    }
  };

  const createShareLink = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/create-share-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: store.currentMeeting?.id }),
      });

      if (!response.ok) throw new Error('Failed to create share link');
      const data = await response.json();

      try {
        await navigator.clipboard.writeText(data.shareLink);
        alert(`Share link copied!\n\nExpires in 7 days:\n${data.shareLink}`);
      } catch (clipboardError) {
        alert(`Share link:\n\n${data.shareLink}`);
      }
    } catch (error) {
      alert(`Failed: ${(error as Error).message}`);
    }
  };

  const handleSave = async () => {
    if (!user || !store.currentMeeting) return;

    try {
      setSaveStatus('Saving...');

      const dataToSave: any = {
        id: store.currentMeeting.id,
        user_id: user.id,
        title: store.currentMeeting.title || 'Untitled Meeting',
        template_type: templateType,
        speaker_tags: store.currentMeeting.speaker_tags || {},
        duration_minutes: Math.floor(timeElapsed / 60),
        is_billable: isBillable,
        updated_at: new Date().toISOString(),
      };

      if (saveChoices.saveTranscript) {
        dataToSave.transcript = store.currentMeeting.transcript || '';
      }
      if (saveChoices.saveNotes) {
        dataToSave.notes = getFormattedNotes() || '';
      }

      const { error } = await supabase
        .from('meetings')
        .upsert(dataToSave, { onConflict: 'id' })
        .select();

      if (error) throw error;

      if (saveChoices.deleteAudio) {
        audioChunksRef.current = [];
        setAudioRecorded(false);
      }

      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus('Error saving');
    }
  };

  const getFormattedNotes = () => {
    let formattedNotes = '';
    
    // Add user's manual notes first
    if (userNotes && userNotes.trim().length > 0) {
      formattedNotes += `USER NOTES:\n${userNotes}\n\n`;
    }
    
    // Add extracted template data with readable labels
    const template = TEMPLATE_SECTIONS[templateType as keyof typeof TEMPLATE_SECTIONS];
    if (template) {
      const extractedData = template.sections
        .filter(section => templateData[section.id] && templateData[section.id].trim().length > 0)
        .map(section => `${section.label}:\n${templateData[section.id]}`)
        .join('\n\n');
      
      if (extractedData) {
        formattedNotes += `EXTRACTED DETAILS:\n\n${extractedData}`;
      }
    }
    
    return formattedNotes;
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDuration = (totalSeconds: number): string => {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
  };

  const currentTemplate = TEMPLATE_SECTIONS[templateType as keyof typeof TEMPLATE_SECTIONS];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <div style={{ padding: window.innerWidth < 768 ? '1rem' : '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: window.innerWidth < 768 ? '1rem' : '1.5rem', flexWrap: window.innerWidth < 768 ? 'wrap' : 'nowrap', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', fontSize: window.innerWidth < 768 ? '0.875rem' : '1rem' }}
          >
            ← Dashboard
          </button>
          
          <div style={{ textAlign: 'right', flex: window.innerWidth < 768 ? '1 1 100%' : 'none', marginTop: window.innerWidth < 768 ? '1rem' : '0' }}>
            <div style={{ fontSize: window.innerWidth < 768 ? '2rem' : '3rem', fontWeight: 'bold', color: 'white', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
              {formatTime(timeElapsed)}
            </div>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              {Math.floor(timeElapsed / 60)} minutes
            </div>
          </div>
        </div>

        <input
          type="text"
          placeholder="Untitled Meeting"
          value={store.currentMeeting?.title || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => store.updateMeeting({ title: e.target.value })}
          style={{ fontSize: window.innerWidth < 768 ? '1.5rem' : '2.5rem', fontWeight: 'bold', border: 'none', background: 'transparent', color: 'white', paddingBottom: '0.5rem', width: '100%', outline: 'none', marginBottom: '1.5rem', borderBottom: '2px solid rgba(255,255,255,0.3)' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: window.innerWidth < 768 ? 'stretch' : 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: '1' }}>
            <button 
              onClick={recording ? stopRecording : startRecording} 
              style={{ padding: '0.75rem 1.5rem', background: recording ? '#ef4444' : 'white', color: recording ? 'white' : '#667eea', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>{recording ? '⏹️' : '🎤'}</span>
              {recording ? 'Stop Recording' : 'Record'}
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>📁</span> Upload Audio
            </button>
            <input ref={fileInputRef} type="file" accept="audio/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} />

            {audioRecorded && !recording && (
              <button
                onClick={handleExtractDetailsAfterTranscribe}
                disabled={transcribing}
                style={{ padding: '0.75rem 1.5rem', background: transcribing ? '#9ca3af' : 'white', color: '#667eea', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: transcribing ? 'not-allowed' : 'pointer', opacity: transcribing ? 0.6 : 1 }}
              >
                {transcribing ? '⏳ Processing...' : '🎙️ Transcribe & Extract'}
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowPrivacyDialog(true)} 
            style={{ padding: '0.75rem 1.5rem', background: 'white', color: '#667eea', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>💾</span> Save Meeting
          </button>
        </div>

        {transcriptionProgress && (
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem', marginTop: '1rem', fontStyle: 'italic' }}>
            {transcriptionProgress}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0 2rem' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('template')}
            style={{
              padding: '1rem 0.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'template' ? '4px solid white' : '4px solid transparent',
              color: activeTab === 'template' ? 'white' : 'rgba(255,255,255,0.6)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            📝 Notes
          </button>

          {store.currentMeeting?.transcript && (
            <button
              onClick={() => setActiveTab('transcript')}
              style={{
                padding: '1rem 0.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'transcript' ? '4px solid white' : '4px solid transparent',
                color: activeTab === 'transcript' ? 'white' : 'rgba(255,255,255,0.6)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              📄 Transcript
            </button>
          )}

          {store.actions.length > 0 && (
            <button
              onClick={() => setActiveTab('actions')}
              style={{
                padding: '1rem 0.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'actions' ? '4px solid white' : '4px solid transparent',
                color: activeTab === 'actions' ? 'white' : 'rgba(255,255,255,0.6)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              ✅ Actions ({store.actions.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab('export')}
            style={{
              padding: '1rem 0.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'export' ? '4px solid white' : '4px solid transparent',
              color: activeTab === 'export' ? 'white' : 'rgba(255,255,255,0.6)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            📤 Export
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

          {activeTab === 'template' && currentTemplate && (
            <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                  Notes
                </h2>
                {store.currentMeeting?.transcript && store.currentMeeting.transcript.trim().length > 0 && !showExtractedSections && (
                  <button
                    onClick={handleExtractFromTranscript}
                    disabled={transcribing}
                    style={{ padding: '0.75rem 1.5rem', background: transcribing ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: transcribing ? 'not-allowed' : 'pointer', opacity: transcribing ? 0.6 : 1 }}
                  >
                    {transcribing ? '⏳ Extracting...' : '🎯 Extract Details from Transcript'}
                  </button>
                )}
              </div>
              
              {/* User's Manual Notes - Always Visible */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151', fontSize: '1.125rem' }}>
                  Your Notes
                </label>
                <textarea
                  value={userNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserNotes(e.target.value)}
                  placeholder="Take notes during the meeting... (e.g., key points, decisions, important discussions)"
                  style={{ width: '100%', minHeight: '200px', padding: '1rem', border: '2px solid #6366f1', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Extracted Template Sections - Only show after extraction */}
              {showExtractedSections && (
                <>
                  <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '2rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
                      Extracted {currentTemplate.name}
                    </h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                    {currentTemplate.sections.map((section) => (
                      <div key={section.id}>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                          {section.label}
                        </label>
                        <textarea
                          value={templateData[section.id] || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSectionData(section.id, e.target.value)}
                          placeholder={section.placeholder}
                          style={{ width: '100%', minHeight: '150px', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'transcript' && store.currentMeeting?.transcript && (
            <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>Transcript</h2>
              <textarea
                value={store.currentMeeting.transcript}
                readOnly
                style={{ width: '100%', minHeight: '600px', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', fontFamily: 'monospace', background: '#f9fafb', color: '#6b7280', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {activeTab === 'actions' && (
            <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>Action Items</h2>
                {store.currentMeeting?.transcript && (
                  <button
                    onClick={extractActions}
                    disabled={transcribing}
                    style={{ padding: '0.75rem 1.5rem', background: transcribing ? '#9ca3af' : '#6366f1', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: transcribing ? 'not-allowed' : 'pointer', opacity: transcribing ? 0.6 : 1 }}
                  >
                    {transcribing ? 'Extracting...' : 'Extract Actions'}
                  </button>
                )}
              </div>
              {store.actions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {store.actions.map((action) => (
                    <div
                      key={action.id}
                      style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '0.5rem', borderLeft: '4px solid #f59e0b' }}
                    >
                      <p style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>{action.action_text}</p>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        👤 {action.assignee} | 📅 {action.due_date || 'No due date'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280' }}>No action items extracted yet</p>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1f2937' }}>Export & Share Options</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '1rem', fontSize: '1.125rem', color: '#1f2937' }}>Download</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                      onClick={exportPDF} 
                      style={{ padding: '0.75rem 1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <span>⬇️</span> PDF Export
                    </button>
                    <button 
                      onClick={exportWord} 
                      style={{ padding: '0.75rem 1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <span>⬇️</span> Word Document
                    </button>
                  </div>
                </div>
                <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '1rem', fontSize: '1.125rem', color: '#1f2937' }}>Share</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                      onClick={createShareLink} 
                      style={{ padding: '0.75rem 1rem', background: '#0891b2', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <span>🔗</span> Create Share Link
                    </button>
                  </div>
                </div>
                <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '1rem', fontSize: '1.125rem', color: '#1f2937' }}>Email</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                      onClick={sendEmail} 
                      style={{ padding: '0.75rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <span>✉️</span> Send via Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Save Dialog */}
      {showPrivacyDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '2rem', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#1f2937' }}>Save Meeting</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Choose what gets saved to your account. Your audio is never saved to our servers.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saveChoices.saveTranscript}
                  onChange={(e) => setSaveChoices({ ...saveChoices, saveTranscript: e.target.checked })}
                  style={{ width: '1.25rem', height: '1.25rem', marginTop: '0.25rem', cursor: 'pointer' }}
                />
                <div>
                  <p style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>Save Transcript</p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Keep the AI-generated transcript for reference</p>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saveChoices.saveNotes}
                  onChange={(e) => setSaveChoices({ ...saveChoices, saveNotes: e.target.checked })}
                  style={{ width: '1.25rem', height: '1.25rem', marginTop: '0.25rem', cursor: 'pointer' }}
                />
                <div>
                  <p style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>Save Notes</p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Keep your template notes and extracted details</p>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saveChoices.deleteAudio}
                  onChange={(e) => setSaveChoices({ ...saveChoices, deleteAudio: e.target.checked })}
                  style={{ width: '1.25rem', height: '1.25rem', marginTop: '0.25rem', cursor: 'pointer' }}
                />
                <div>
                  <p style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>Delete Audio File</p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Remove raw audio from your device after saving</p>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPrivacyDialog(false)}
                style={{ padding: '0.75rem 1.5rem', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSave();
                  setShowPrivacyDialog(false);
                }}
                style={{ padding: '0.75rem 1.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
              >
                Save Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};