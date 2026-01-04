
import React, { useState, useEffect, useRef } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import { polishNotes, generateExpansions, extractCategory, transcribeAudio } from './services/geminiService';
import { Button } from './components/Button';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { EmailModal } from './components/EmailModal';
import { AppStatus } from './types';

const SUPABASE_URL: string = "https://ejveqhjtbuphmlrrjyev.supabase.co"; 
const SUPABASE_ANON_KEY: string = "sb_publishable_DVQAvIkmWrsk0JQNf56fPw_xzj4waCe"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const STORAGE_KEY = 'polisher_default_email';

const App: React.FC = () => {
  // User & Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // App Functional State
  const [rawNotes, setRawNotes] = useState('');
  const [polishedContent, setPolishedContent] = useState('');
  const [expansionContent, setExpansionContent] = useState('');
  const [category, setCategory] = useState('General');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  
  const [defaultEmail, setDefaultEmail] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSettingNewDefault, setIsSettingNewDefault] = useState(false);
  
  // Named Email state variables as requested for the workshop
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [isEmailSuccess, setIsEmailSuccess] = useState(false);
  
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState(false);

  // Voice Recording & Transcription State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeRequestIdRef = useRef<number>(0);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchHistory(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchHistory(session.user.id);
      else setHistory([]);
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setDefaultEmail(saved);

    return () => subscription.unsubscribe();
  }, []);

  const fetchHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from('polished_ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error && data) setHistory(data);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) return;
    setIsAuthLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email: authEmail,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      alert("Check your email for the login link!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  /**
   * handleSendEmail - Standalone named function for email distribution
   */
  const handleSendEmail = async (email: string, save: boolean) => {
    setIsEmailSending(true);
    if (save) {
      localStorage.setItem(STORAGE_KEY, email);
      setDefaultEmail(email);
    }

    try {
      const lines = polishedContent.split('\n');
      const titleLine = lines.find(l => l.startsWith('# ')) || 'Polished Project Outline';
      const cleanTitle = titleLine.replace('# ', '').trim();

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY,
          subject: `✨ Polished Idea: ${cleanTitle}`,
          from_name: "Idea Polisher AI",
          message: `Your project is ready!\n\n${polishedContent}\n\n---\n🚀 EXPANSION OPPORTUNITIES\n${expansionContent}`,
          to_email: email
        }),
      });

      if (!response.ok) throw new Error("Email submission failed.");

      setIsEmailSuccess(true);
      setTimeout(() => {
        setIsEmailModalOpen(false);
        setIsEmailSuccess(false);
      }, 2500);
    } catch (err) {
      console.error(err);
      alert("Email failed to send. Please check your connection.");
    } finally {
      setIsEmailSending(false);
      setIsSettingNewDefault(false);
    }
  };

  const stopActiveRecorder = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const cancelAllProcessing = () => {
    activeRequestIdRef.current += 1;
    stopActiveRecorder();
    setIsTranscribing(false);
    if (status === AppStatus.POLISHING) setStatus(AppStatus.IDLE);
    setError(null);
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      const requestId = activeRequestIdRef.current;

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          setIsTranscribing(false);
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setIsTranscribing(true);
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          if (activeRequestIdRef.current !== requestId) return;
          const base64Audio = (reader.result as string).split(',')[1];
          try {
            const transcript = await transcribeAudio(base64Audio, mimeType);
            if (activeRequestIdRef.current === requestId) {
              if (transcript) {
                setRawNotes(prev => (prev ? prev.trim() + " " + transcript : transcript));
              } else {
                setError("No voice detected. Please try speaking closer to the microphone.");
              }
              setIsTranscribing(false);
            }
          } catch (err: any) {
            if (activeRequestIdRef.current === requestId) {
              setIsTranscribing(false);
              setError(err.message || "Failed to process audio.");
            }
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access denied.");
    }
  };

  const handleStopRecording = () => {
    stopActiveRecorder();
  };

  const handlePolish = async () => {
    if (!rawNotes.trim()) return;
    const requestId = ++activeRequestIdRef.current;
    setStatus(AppStatus.POLISHING);
    setError(null);

    try {
      const result = await polishNotes(rawNotes);
      if (activeRequestIdRef.current !== requestId) return;

      const [expansions, cat] = await Promise.all([
        generateExpansions(result),
        extractCategory(result)
      ]);
      
      if (activeRequestIdRef.current !== requestId) return;

      setPolishedContent(result);
      setExpansionContent(expansions);
      setCategory(cat);
      setStatus(AppStatus.SUCCESS);

      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      if (activeRequestIdRef.current === requestId) {
        setError(err.message || 'The polisher encountered an issue. Please try again.');
        setStatus(AppStatus.ERROR);
      }
    }
  };

  const handleArchive = async () => {
    if (!user) {
      setError("Please login to save ideas to the cloud.");
      return;
    }

    setIsArchiving(true);
    const lines = polishedContent.split('\n');
    const titleLine = lines.find(l => l.startsWith('# ')) || 'Untitled Project';
    const cleanTitle = titleLine.replace('# ', '').trim();
    
    const payload = {
      user_id: user.id,
      title: cleanTitle,
      original_notes: rawNotes,
      polished_outline: polishedContent,
      expansion_ideas: expansionContent,
      recipient_email: defaultEmail || user.email,
      category: category,
      archive_id: `POL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    };

    try {
      const { error: dbError } = await supabase.from('polished_ideas').insert([payload]);
      if (dbError) throw dbError;
      
      setArchiveSuccess(true);
      fetchHistory(user.id);
      setTimeout(() => setArchiveSuccess(false), 3000);
    } catch (err: any) {
      setError("Archiving failed: " + (err.message || "Network error"));
    } finally {
      setIsArchiving(false);
    }
  };

  const handleReset = () => {
    cancelAllProcessing();
    setRawNotes('');
    setPolishedContent('');
    setExpansionContent('');
    setStatus(AppStatus.IDLE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadFromHistory = (item: any) => {
    setRawNotes(item.original_notes);
    setPolishedContent(item.polished_outline);
    setExpansionContent(item.expansion_ideas);
    setCategory(item.category);
    setStatus(AppStatus.SUCCESS);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-[#d8f3dc]">
      <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => { setIsEmailModalOpen(false); setIsSettingNewDefault(false); }}
        defaultEmail={isSettingNewDefault ? null : defaultEmail}
        onConfirm={handleSendEmail}
        isSending={isEmailSending}
        isSuccess={isEmailSuccess}
      />

      {/* History Slide-over */}
      {showHistory && (
        <div className="fixed inset-0 z-[60] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800 uppercase tracking-tight">Your History</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {history.length === 0 ? (
                <p className="text-slate-400 text-sm italic text-center py-10">No projects saved yet.</p>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => loadFromHistory(item)}
                    className="p-4 rounded-2xl border border-slate-100 hover:border-[#52b788] hover:bg-[#f7fffa] cursor-pointer transition-all group"
                  >
                    <div className="text-[10px] font-bold text-[#52b788] mb-1 uppercase tracking-widest">{item.category}</div>
                    <h4 className="font-bold text-slate-800 line-clamp-1 group-hover:text-[#1b4332]">{item.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-2">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <header className="bg-white/80 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="w-8 h-8 bg-[#1b4332] rounded-lg flex items-center justify-center text-white shadow-md">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Idea Polisher</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowHistory(true)}
                  className="px-3 py-1.5 text-xs font-bold text-[#1b4332] bg-[#d8f3dc] rounded-full hover:bg-[#b7e4c7] transition-colors"
                >
                  History ({history.length})
                </button>
                <button 
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="flex items-center gap-2">
                <input 
                  type="email" 
                  placeholder="Your email..." 
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-full w-32 focus:w-48 transition-all outline-none focus:border-[#52b788]"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                />
                <button 
                  type="submit" 
                  disabled={isAuthLoading}
                  className="text-xs font-bold bg-[#1b4332] text-white px-3 py-1.5 rounded-full hover:bg-[#081c15] disabled:opacity-50"
                >
                  {isAuthLoading ? '...' : 'Login'}
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-12">
        {status !== AppStatus.SUCCESS && (
          <>
            <div className="text-center mb-12 animate-in fade-in duration-700">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                From <span className="text-[#1b4332]">Messy Thoughts</span> to <br/> <span className="text-[#52b788] underline decoration-[#b7e4c7] underline-offset-8">Perfect Outlines</span>.
              </h2>
            </div>
            <section className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
              <div className="p-6 md:p-10">
                <textarea
                  className="w-full h-64 md:h-80 p-8 bg-[#fbfaf5]/50 rounded-2xl border-2 border-slate-100 focus:border-[#52b788] focus:bg-white outline-none transition-all text-slate-700 text-lg"
                  placeholder="Click the mic to speak or paste your notes here..."
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                />
                <div className="absolute right-10 top-10 flex flex-col items-center gap-3">
                  <button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={isTranscribing}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                      isRecording ? 'bg-rose-500 animate-pulse scale-110' : 'bg-[#1b4332] hover:bg-[#2d6a4f] hover:scale-105'
                    } text-white disabled:opacity-50`}
                  >
                    {isTranscribing ? (
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : isRecording ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><rect x="5" y="5" width="10" height="10" rx="1" /></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" /></svg>
                    )}
                  </button>
                  {isRecording && <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">Recording</span>}
                </div>
                <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-10">
                  <p className="text-slate-400 text-sm font-medium">Capture the chaos, let AI create the clarity.</p>
                  <Button onClick={handlePolish} isLoading={status === AppStatus.POLISHING} size="large" className="w-full md:w-auto min-w-[320px]">
                    Polish My Idea
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}

        {error && (
          <div className="mt-8 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-center font-medium">
            {error}
            <button onClick={() => setError(null)} className="ml-3 underline opacity-60">Dismiss</button>
          </div>
        )}

        {status === AppStatus.SUCCESS && (
          <div id="result-section" className="mt-8 space-y-8 animate-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 md:p-6 bg-[#fbfaf5] border-b border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="text-[#1b4332] font-bold uppercase tracking-wider text-xs">Draft Finalized</div>
                  <span className="bg-[#1b4332]/10 text-[#1b4332] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">{category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleArchive} isLoading={isArchiving} className="py-2 px-4 text-xs">
                    {archiveSuccess ? '✓ Saved' : user ? 'Cloud Sync' : 'Login to Sync'}
                  </Button>
                  <Button variant="secondary" onClick={() => setIsEmailModalOpen(true)} className="py-2 px-4 text-xs">Email Me</Button>
                  <Button variant="outline" onClick={handleReset} className="py-2 px-4 text-xs">New Idea</Button>
                </div>
              </div>
              <div className="p-8 md:p-12">
                <MarkdownRenderer content={polishedContent} variant="emerald" />
              </div>
            </div>
            {expansionContent && (
              <div className="bg-[#f0f9ff] rounded-3xl border-2 border-[#bae6fd] p-8 md:p-10 shadow-lg animate-in fade-in zoom-in duration-500 delay-300">
                <h3 className="text-xl font-bold text-[#0369a1] mb-6 flex items-center gap-3">
                  <span>🚀</span> Expansion Strategy
                </h3>
                <MarkdownRenderer content={expansionContent} variant="sky" />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
