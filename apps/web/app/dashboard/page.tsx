"use client";
import React, { useState } from 'react';
import Container from '../../components/Container';
import Button from '../../components/Button';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Candidate = {
  id: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  linkedinUrl?: string;
  summary?: string;
  score?: number;
  schools?: string;
  skills?: string;
  experience?: string;
  profilePhoto?: string;
  source?: string;
};

type AuthState = {
  isAuthenticated: boolean;
  email?: string;
  error?: string;
};
export default function DashboardPage() {
  const [prompt, setPrompt] = useState('Find SWE contacts at Amazon in Seattle');
  const [results, setResults] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<string>('');
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [dataSource, setDataSource] = useState<'csv' | 'csv-generated' | 'mock' | 'mock-fallback' | null>(null);
  
  // LinkedIn Authentication State
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false });
  const [authLoading, setAuthLoading] = useState(false);

  // LinkedIn OAuth Authentication
  const authenticateLinkedIn = async () => {
    setAuthLoading(true);
    
    try {
      // Use mock authentication for development
      const res = await fetch(`${API_URL}/linkedin/auth/mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setAuth({ 
          isAuthenticated: true, 
          email: data.user.email,
          error: undefined 
        });
      } else {
        setAuth({ 
          isAuthenticated: false, 
          error: data.error || 'Authentication failed' 
        });
      }
    } catch (error) {
      setAuth({ 
        isAuthenticated: false, 
        error: 'Network error. Please try again.' 
      });
    } finally {
      setAuthLoading(false);
    }
  };

  // Check authentication status on component mount
  React.useEffect(() => {
    // Check if user is already authenticated (from localStorage or session)
    const savedAuth = localStorage.getItem('linkedin_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        setAuth(authData);
      } catch (e) {
        localStorage.removeItem('linkedin_auth');
      }
    }
  }, []);

  // Save auth state to localStorage
  React.useEffect(() => {
    if (auth.isAuthenticated) {
      localStorage.setItem('linkedin_auth', JSON.stringify(auth));
    } else {
      localStorage.removeItem('linkedin_auth');
    }
  }, [auth]);

  const runSearch = async () => {
    setLoading(true);
    setResults([]); // Clear previous results
    setDataSource(null); // Clear previous data source
    console.log(`🔍 Searching for: "${prompt}"`);
    
    try {
      const res = await fetch(`${API_URL}/search/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setResults(data.results || []);
        setDataSource(data.source || 'mock');
        
        // Show success message for generated CSV
        if (data.source === 'csv-generated') {
          console.log(`✅ Generated new CSV with ${data.totalProfiles} profiles: ${data.csvFile}`);
        } else if (data.source === 'csv-generated-fallback') {
          console.log(`⚠️ Used fallback search: ${data.notice}`);
          console.log(`✅ Generated CSV with ${data.totalProfiles} profiles: ${data.csvFile}`);
        } else if (data.source === 'csv') {
          console.log(`📁 Using existing CSV data`);
        } else if (data.source === 'mock-fallback') {
          console.warn(`⚠️ LinkedIn scraping failed, using mock data. Error: ${data.error}`);
        }
        
        console.log(`📊 Found ${data.results?.length || 0} profiles from source: ${data.source}`);
        
        if (data.results?.length === 0) {
          alert('No profiles found. This might be due to LinkedIn authentication issues or no matching profiles.');
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Search error:', errorData);
        
        // Show user-friendly error message
        if (res.status === 500) {
          alert(`LinkedIn extraction failed. This could be due to:\n• LinkedIn rate limiting\n• Network issues\n• Invalid search parameters\n\nPlease try again in a few minutes.`);
        } else {
          alert(`Search failed: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const draftMessage = async (candidate: Candidate, channel: 'linkedin'|'email' = 'linkedin') => {
    setSelected(candidate);
    const res = await fetch(`${API_URL}/messages/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate, tone: 'warm', channel })
    });
    const data = await res.json();
    setDraft(data.body);
  };

  const sendEmail = async (candidate: Candidate) => {
    const res = await fetch(`${API_URL}/send/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: candidate.email || 'test@example.com', subject: 'Quick intro', text: draft || 'Hello' })
    });
    const data = await res.json();
    alert(`Send status: ${data.status}`);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(draft);
  };

  return (
    <section className="pt-16 pb-24">
      <Container>
        {/* LinkedIn Authentication Section */}
        {!auth.isAuthenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-xl bg-white/5 border border-white/10 p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Connect to LinkedIn</h2>
            <p className="text-white/70 mb-6">
              Connect your LinkedIn account to search for real contacts. You'll be redirected to LinkedIn's secure login page.
            </p>
            
            {auth.error && (
              <div className="mb-4 p-3 rounded-md bg-red-500/20 border border-red-500/30 text-red-200">
                {auth.error}
              </div>
            )}
            
            <Button 
              onClick={authenticateLinkedIn} 
              disabled={authLoading}
              className="min-w-[180px] bg-[#0077B5] hover:bg-[#005885] text-white"
            >
              {authLoading ? 'Connecting...' : '🔗 Connect with LinkedIn'}
            </Button>
            
            <p className="text-xs text-white/50 mt-3">
              💡 This will redirect you to LinkedIn's official login page for secure authentication.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl bg-green-500/20 border border-green-500/30 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 font-medium">✅ LinkedIn Connected</p>
                <p className="text-green-200/70 text-sm">Signed in as {auth.email}</p>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setAuth({ isAuthenticated: false })}
                className="text-green-200 hover:bg-green-500/20"
              >
                Sign Out
              </Button>
            </div>
          </motion.div>
        )}

        {/* Search Section */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm text-white/70">Your search intent</label>
            <input
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-600"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Find SWE contacts at Amazon in Seattle"
            />
          </div>
          <Button 
            onClick={runSearch} 
            className="h-10 min-w-[140px]"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Searching LinkedIn...
              </div>
            ) : 'Search LinkedIn'}
          </Button>
        </div>

        {/* Loading Status */}
        {loading && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
              <div className="w-6 h-6 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin"></div>
              <div>
                <div className="text-blue-200 font-medium">Searching LinkedIn with StaffSpy...</div>
                <div className="text-blue-300/70 text-sm mt-1">
                  Extracting fresh profiles for: "{prompt}"
                </div>
                <div className="text-blue-300/50 text-xs mt-1">This may take 30-60 seconds</div>
              </div>
            </div>
          </div>
        )}

        {/* Results Status */}
        {results.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-white/70">
              Found {results.length} profiles
              {dataSource === 'csv' || dataSource === 'csv-generated' ? (
                <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-300 rounded-md text-xs">
                  📊 Real LinkedIn Data (Fresh)
                </span>
              ) : dataSource === 'csv-generated-fallback' ? (
                <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-md text-xs">
                  ⚠️ Real Data (Location Fallback)
                </span>
              ) : dataSource === 'mock-fallback' ? (
                <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-md text-xs">
                  ⚠️ Mock Data (LinkedIn Failed)
                </span>
              ) : (
                <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-300 rounded-md text-xs">
                  🎭 Mock Data
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <AnimatePresence>
            {results.map((r, idx) => {
              // Parse schools data if it's JSON string
              let schoolInfo = '';
              try {
                if (r.schools && r.schools.startsWith('[')) {
                  const schools = JSON.parse(r.schools);
                  schoolInfo = schools.map((s: any) => s.school || s.degree || s).join(', ');
                } else {
                  schoolInfo = r.schools || '';
                }
              } catch (e) {
                schoolInfo = r.schools || '';
              }

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Profile Photo */}
                    {r.profilePhoto ? (
                      <img 
                        src={r.profilePhoto} 
                        alt={r.name}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {r.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-lg">{r.name}</div>
                          <div className="text-sm text-white/80 font-medium">
                            {r.title} {r.company ? `@ ${r.company}` : ''}
                          </div>
                          {schoolInfo && (
                            <div className="text-xs text-blue-300 mt-1 flex items-center gap-1">
                              🎓 {schoolInfo.length > 50 ? schoolInfo.substring(0, 50) + '...' : schoolInfo}
                            </div>
                          )}
                          {r.skills && (
                            <div className="text-xs text-purple-300 mt-1 flex items-center gap-1">
                              💼 {r.skills.length > 40 ? r.skills.substring(0, 40) + '...' : r.skills}
                            </div>
                          )}
                          {r.email && (
                            <div className="text-xs text-green-300 mt-1 flex items-center gap-1">
                              ✉️ {r.email}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-white/50">Relevance</div>
                          <div className="text-sm font-bold text-green-400">
                            {Math.round((r.score || 0) * 100)}%
                          </div>
                        </div>
                      </div>
                      
                      {r.summary && (
                        <p className="text-sm text-white/70 mt-2 line-clamp-2 leading-relaxed">
                          {r.summary.length > 120 ? r.summary.substring(0, 120) + '...' : r.summary}
                        </p>
                      )}
                      
                      <div className="mt-3 flex gap-2">
                        <Button 
                          variant="secondary" 
                          onClick={() => draftMessage(r, 'linkedin')}
                          className="text-xs px-3 py-1"
                        >
                          Draft LinkedIn
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => draftMessage(r, 'email')}
                          className="text-xs px-3 py-1"
                        >
                          Draft Email
                        </Button>
                        {r.linkedinUrl && (
                          <Button 
                            variant="ghost" 
                            onClick={() => window.open(r.linkedinUrl, '_blank')}
                            className="text-xs px-3 py-1"
                          >
                            View Profile
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-10 rounded-xl bg-white/5 border border-white/10 p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Draft to {selected.name}</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={copyToClipboard}>Copy</Button>
                  <Button onClick={() => sendEmail(selected!)}>Send Email</Button>
                </div>
              </div>
              <textarea
                className="mt-3 w-full min-h-[180px] bg-black/30 border border-white/10 rounded-md p-3 outline-none focus:ring-2 focus:ring-brand-600"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </section>
  );
}
