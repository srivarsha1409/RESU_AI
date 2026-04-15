import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Upload, Target, Briefcase, MessageSquare, CheckCircle, AlertCircle, Info, TrendingUp, Award, FileText, User, Mail, Phone, LogOut } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

const API_BASE = 'http://127.0.0.1:8000';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  // User data
  const [user, setUser] = useState({});
  
  // Resume data
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);

  const [guidance, setGuidance] = useState(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [guidanceError, setGuidanceError] = useState(null);
  const [refCompany, setRefCompany] = useState('');
  const [refRole, setRefRole] = useState('');
  const [refLinkedInNote, setRefLinkedInNote] = useState('');
  const [refReferralDM, setRefReferralDM] = useState('');
  
  // AI Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [chatting, setChatting] = useState(false);

  const email = localStorage.getItem("email");

  const fetchGuidance = async () => {
    if (!resumeData?.data || guidanceLoading) return;

    setGuidanceLoading(true);
    setGuidanceError(null);

    try {
      const res = await fetch(`${API_BASE}/guidance/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resume_data: resumeData.data }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to generate guidance");
      }

      setGuidance(data.guidance || {});
    } catch (err) {
      console.error("Guidance error:", err);
      setGuidanceError(err.message || "Failed to generate guidance");
      setGuidance(null);
    } finally {
      setGuidanceLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'guidance' && resumeData?.data && !guidance && !guidanceLoading) {
      fetchGuidance();
    }
  };

  // Fetch user info and hydrate resume data (so role tab works after reload)
  useEffect(() => {
    const fetchUserData = async () => {
      const storedEmail = localStorage.getItem("email");
      if (!storedEmail) return;

      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/user/info/${storedEmail}`);
        const data = await res.json();
        const userDoc = data.user || {};
        setUser(userDoc);
      } catch (err) {
        console.error("User fetch error:", err);
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Auto-fetch guidance when Guidance tab is active and resumeData becomes available
  useEffect(() => {
    if (activeTab === 'guidance' && resumeData?.data && !guidance && !guidanceLoading) {
      fetchGuidance();
    }
  }, [activeTab, resumeData, guidance, guidanceLoading]);

  // Coding profiles removed from user portal

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setError(null);
      uploadResume(file);
    } else {
      setError('Please select a valid PDF file');
    }
  };

  const uploadResume = async (file) => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/user/upload_resume`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        setResumeData({
          ats_score: result.ats_score,
          word_count: result.word_count,
          data: result.structured_info,
          ats_breakdown: result.ats_breakdown,
          detected_role: result.detected_role || null,
          suggested_skills: result.suggested_skills || [],
        });

      } else {
        setError(result.error || 'Failed to upload resume');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralMessages = () => {
    if (!resumeData?.data) return;

    const name = resumeData.data.name || 'I';
    const shortName = name.split(' ')[0];
    const emailId = resumeData.data.email || '';
    const mainSkills = (resumeData.data.skills?.technical || []).slice(0, 4).join(', ');
    const company = refCompany || 'your company';
    const role = refRole || 'a suitable role';

    const linkedInNote = `Hi, I'm ${shortName}, a fresher with skills in ${mainSkills || 'software development'}. I came across openings for ${role} at ${company} and would love to connect and learn more about your experience there.`;

    const referralDMLines = [
      `Hi,`,
      '',
      `I'm ${name}, currently looking for ${role} opportunities at ${company}. Based on my background in ${mainSkills || 'software development'}, I believe I could be a good fit.`,
      '',
      'If you are comfortable, could you please review my profile and let me know if a referral is possible?',
    ];

    if (emailId) {
      referralDMLines.push('', `You can also reach me at ${emailId}.`);
    }

    referralDMLines.push('', 'Thank you for your time.', 'Regards,', name);

    const referralDM = referralDMLines.join('\n');

    setRefLinkedInNote(linkedInNote);
    setRefReferralDM(referralDM);
  };

  const sendMessage = async () => {
    if (!userMessage.trim() || !resumeData) return;

    const newMessage = { role: 'user', content: userMessage };
    setChatMessages([...chatMessages, newMessage]);
    setUserMessage('');
    setChatting(true);

    try {
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          resume_data: resumeData.data || {}
        })
      });

      const data = await response.json();
      const aiResponse = {
        role: 'assistant',
        content: data.response
      };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error('AI error:', err);
      const errorResponse = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setChatMessages(prev => [...prev, errorResponse]);
    } finally {
      setChatting(false);
    }
  };

const handleLogout = async () => {
  try {
    const res = await fetch("http://localhost:8000/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    // Try to parse JSON safely
    let json = {};
    try {
      json = await res.json();
    } catch {
      json = {};
    }

    if (!res.ok) {
      console.error("Logout failed:", json);
      throw new Error(json?.detail || "Logout failed");
    }

    // ✅ Backend confirmed logout
    localStorage.clear();
    sessionStorage.clear();

    // Optional: soft clear client-side cookies (won’t affect HttpOnly)
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // ✅ Redirect only after backend confirms success
    navigate("/login");
  } catch (err) {
    console.error("Logout error:", err);
    alert("Logout failed — please try again.");
  }
};


  const getATSRecommendations = () => {
    if (!resumeData) return [];
    
    const score = resumeData.ats_score || 0;
    const recommendations = [];

    if (score < 50) {
      recommendations.push({
        type: 'critical',
        message: 'Add more technical keywords and skills relevant to your target role',
        icon: AlertCircle,
        color: 'red'
      });
      recommendations.push({
        type: 'critical',
        message: 'Include quantifiable achievements and metrics in your experience',
        icon: AlertCircle,
        color: 'red'
      });
      recommendations.push({
        type: 'critical',
        message: 'Expand your skills section with more relevant technologies',
        icon: AlertCircle,
        color: 'red'
      });
    } else if (score < 75) {
      recommendations.push({
        type: 'warning',
        message: 'Consider adding more industry-specific certifications',
        icon: Info,
        color: 'yellow'
      });
      recommendations.push({
        type: 'warning',
        message: 'Include more detailed project descriptions with outcomes',
        icon: Info,
        color: 'yellow'
      });
      recommendations.push({
        type: 'success',
        message: 'Good foundation - focus on quantifying your impact',
        icon: CheckCircle,
        color: 'green'
      });
    } else {
      recommendations.push({
        type: 'success',
        message: 'Excellent ATS compatibility! Your resume is well-optimized',
        icon: CheckCircle,
        color: 'green'
      });
      recommendations.push({
        type: 'success',
        message: 'Strong keyword presence and clear structure',
        icon: CheckCircle,
        color: 'green'
      });
      recommendations.push({
        type: 'info',
        message: 'Keep updating with new skills and achievements regularly',
        icon: Info,
        color: 'blue'
      });
    }

    return recommendations;
  };

  const getRoleRecommendations = () => {
    if (!resumeData?.data) return [];
    
    const skills = resumeData?.data?.skills?.technical || [];
    const roles = [];

    if (skills.some(s => s.toLowerCase().includes('react') || s.toLowerCase().includes('angular') || s.toLowerCase().includes('vue'))) {
      roles.push({
        title: 'Frontend Developer',
        match: 85,
        description: 'Your frontend framework expertise makes you a strong candidate',
        skills: ['React', 'JavaScript', 'CSS', 'HTML']
      });
    }

    if (skills.some(s => s.toLowerCase().includes('python') || s.toLowerCase().includes('java') || s.toLowerCase().includes('node'))) {
      roles.push({
        title: 'Backend Developer',
        match: 80,
        description: 'Strong backend programming skills identified',
        skills: ['Python', 'Java', 'Node.js', 'APIs']
      });
    }

    if (skills.some(s => s.toLowerCase().includes('react') || s.toLowerCase().includes('node')) && 
        skills.some(s => s.toLowerCase().includes('mongodb') || s.toLowerCase().includes('sql'))) {
      roles.push({
        title: 'Full Stack Developer',
        match: 90,
        description: 'Complete stack proficiency detected',
        skills: ['Full Stack', 'MERN', 'Database', 'APIs']
      });
    }

    if (skills.some(s => s.toLowerCase().includes('ml') || s.toLowerCase().includes('ai') || s.toLowerCase().includes('tensorflow'))) {
      roles.push({
        title: 'Machine Learning Engineer',
        match: 75,
        description: 'ML/AI skills present in your profile',
        skills: ['Python', 'TensorFlow', 'ML', 'Data Science']
      });
    }

    if (skills.some(s => s.toLowerCase().includes('devops') || s.toLowerCase().includes('docker') || s.toLowerCase().includes('kubernetes'))) {
      roles.push({
        title: 'DevOps Engineer',
        match: 78,
        description: 'DevOps and infrastructure skills identified',
        skills: ['Docker', 'Kubernetes', 'CI/CD', 'Cloud']
      });
    }

    if (roles.length === 0) {
      roles.push({
        title: 'Software Developer',
        match: 70,
        description: 'General software development role based on your technical background',
        skills: ['Programming', 'Problem Solving', 'Software Development']
      });
    }

    return roles.sort((a, b) => b.match - a.match);
  };

const getSuggestedSkills = () => {
  if (!resumeData?.suggested_skills) return [];
  return resumeData.suggested_skills.map(s => s.trim());
};


  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userName={resumeData?.data?.name || 'User'}
        onLogout={handleLogout}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content */}
      <div style={{
        marginLeft: isCollapsed ? '80px' : '260px',
        minHeight: '100vh',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Header */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e0f2fe',
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div>
            <h1 style={{
              color: '#1e293b',
              fontSize: '28px',
              fontWeight: '700',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              Welcome, {resumeData?.data?.name || 'User'}!
            </h1>
            <p style={{
              color: '#64748b',
              fontSize: '14px',
              margin: '4px 0 0 0'
            }}>
              Your AI-powered career dashboard
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '30px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
          {/* Error Alert */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <AlertCircle style={{ color: '#dc2626', marginTop: '2px' }} size={20} />
              <div style={{ flex: 1 }}>
                <p style={{ color: '#991b1b', fontWeight: '600', margin: '0 0 4px 0' }}>Error</p>
                <p style={{ color: '#7f1d1d', fontSize: '14px', margin: 0 }}>{error}</p>
              </div>
            </div>
          )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e0f2fe',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <MessageSquare size={24} style={{ color: '#0ea5e9' }} />
              Referral Message Helper
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '14px',
              marginBottom: '24px'
            }}>
              Generate a LinkedIn connection note and referral request message using your resume details.
            </p>

            {!resumeData?.data && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <p style={{
                  color: '#92400e',
                  fontSize: '14px',
                  margin: 0
                }}>
                  Please upload your resume first in the <span style={{ fontWeight: '600' }}>Resume Analysis</span> tab to use this feature.
                </p>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Company
                </label>
                <input
                  type="text"
                  value={refCompany}
                  onChange={(e) => setRefCompany(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#1f2937',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease'
                  }}
                  placeholder="e.g., Google, Infosys"
                  onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Target Role
                </label>
                <input
                  type="text"
                  value={refRole}
                  onChange={(e) => setRefRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#1f2937',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease'
                  }}
                  placeholder="e.g., Software Engineer, Data Analyst"
                  onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            <button
              onClick={generateReferralMessages}
              disabled={!resumeData?.data}
              style={{
                padding: '12px 24px',
                background: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: resumeData?.data ? 'pointer' : 'not-allowed',
                opacity: resumeData?.data ? 1 : 0.5,
                transition: 'all 0.2s ease',
                marginBottom: '24px'
              }}
              onMouseEnter={(e) => {
                if (resumeData?.data) {
                  e.target.style.background = '#0284c7';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (resumeData?.data) {
                  e.target.style.background = '#0ea5e9';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              Generate Messages
            </button>

            {(refLinkedInNote || refReferralDM) && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #e0f2fe'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '12px'
                  }}>
                    LinkedIn Connection Note
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#475569',
                    lineHeight: '1.6',
                    margin: 0,
                    whiteSpace: 'pre-line'
                  }}>
                    {refLinkedInNote}
                  </p>
                </div>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #e0f2fe'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '12px'
                  }}>
                    Referral Request DM
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#475569',
                    lineHeight: '1.6',
                    margin: 0,
                    whiteSpace: 'pre-line'
                  }}>
                    {refReferralDM}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resume Analysis Tab */}
        {activeTab === 'analysis' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e0f2fe',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <FileText size={24} style={{ color: '#0ea5e9' }} />
                Resume Analysis Overview
              </h2>

              {/* Upload Section */}
              <div style={{
                border: '2px dashed #0ea5e9',
                borderRadius: '12px',
                padding: '32px',
                marginBottom: '24px',
                textAlign: 'center',
                transition: 'border-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.borderColor = '#0284c7'}
              onMouseLeave={(e) => e.target.style.borderColor = '#0ea5e9'}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="resume-upload"
                />
                <label htmlFor="resume-upload" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '64px',
                      height: '64px',
                      background: '#e0f2fe',
                      borderRadius: '50%',
                      marginBottom: '8px'
                    }}>
                      <Upload size={32} style={{ color: '#0ea5e9' }} />
                    </div>
                    <div style={{ color: '#64748b' }}>
                      {resumeFile ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}>
                          <FileText size={20} style={{ color: '#0ea5e9' }} />
                          <span style={{ fontWeight: '500', color: '#1e293b' }}>{resumeFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <p style={{
                            fontSize: '18px',
                            fontWeight: '500',
                            color: '#1e293b',
                            margin: '0 0 4px 0'
                          }}>
                            Click to upload your resume
                          </p>
                          <p style={{
                            fontSize: '14px',
                            opacity: 0.75,
                            margin: 0
                          }}>
                            PDF files only (Max 10MB)
                          </p>
                        </>
                      )}
                    </div>
                    {loading && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '12px'
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid rgba(14, 165, 233, 0.3)',
                          borderTop: '2px solid #0ea5e9',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        <span style={{
                          color: '#64748b',
                          fontSize: '14px'
                        }}>
                          Analyzing your resume...
                        </span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {resumeData ? (
                <>
                  {/* Quick Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #0ea5e9'
                    }}>
                      <p style={{
                        color: '#0c4a6e',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        ATS Score
                      </p>
                      <p style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#0284c7',
                        margin: '0 0 4px 0'
                      }}>
                        {resumeData.ats_score || 0}
                      </p>
                      <p style={{
                        color: '#64748b',
                        fontSize: '12px',
                        margin: 0
                      }}>
                        out of 100
                      </p>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #fbbf24'
                    }}>
                      <p style={{
                        color: '#92400e',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        Word Count
                      </p>
                      <p style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#d97706',
                        margin: '0 0 4px 0'
                      }}>
                        {resumeData.word_count || 0}
                      </p>
                      <p style={{
                        color: '#64748b',
                        fontSize: '12px',
                        margin: 0
                      }}>
                        words
                      </p>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #3b82f6'
                    }}>
                      <p style={{
                        color: '#1e3a8a',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        Technical Skills
                      </p>
                      <p style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#2563eb',
                        margin: '0 0 4px 0'
                      }}>
                        {resumeData.data?.skills?.technical?.length || 0}
                      </p>
                      <p style={{
                        color: '#64748b',
                        fontSize: '12px',
                        margin: 0
                      }}>
                        skills identified
                      </p>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #22c55e'
                    }}>
                      <p style={{
                        color: '#14532d',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        Languages
                      </p>
                      <p style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#16a34a',
                        margin: '0 0 4px 0'
                      }}>
                        {resumeData.data?.languages?.length || 0}
                      </p>
                      <p style={{
                        color: '#64748b',
                        fontSize: '12px',
                        margin: 0
                      }}>
                        languages
                      </p>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #6366f1'
                    }}>
                      <p style={{
                        color: '#312e81',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        Areas of Interest
                      </p>
                      <p style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#4f46e5',
                        margin: '0 0 4px 0'
                      }}>
                        {resumeData.data?.skills?.area_of_interest?.length || 0}
                      </p>
                      <p style={{
                        color: '#64748b',
                        fontSize: '12px',
                        margin: 0
                      }}>
                        interests identified
                      </p>
                    </div>
                  </div>

                  {/* Personal Information */}
                  {resumeData.data && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: '24px'
                    }}>
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid #e0f2fe'
                      }}>
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <User size={20} style={{ color: '#0ea5e9' }} />
                          Personal Information
                        </h3>
                        {resumeData?.data?.name && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px'
                          }}>
                            <User size={16} style={{ color: '#0ea5e9' }} />
                            <span style={{
                              color: '#1e293b',
                              fontSize: '14px'
                            }}>
                              {resumeData?.data?.name}
                            </span>
                          </div>
                        )}
                        {resumeData?.data?.email && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px'
                          }}>
                            <Mail size={16} style={{ color: '#0ea5e9' }} />
                            <span style={{
                              color: '#475569',
                              fontSize: '14px'
                            }}>
                              {resumeData?.data?.email}
                            </span>
                          </div>
                        )}
                        {resumeData?.data?.phone && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <Phone size={16} style={{ color: '#0ea5e9' }} />
                            <span style={{
                              color: '#475569',
                              fontSize: '14px'
                            }}>
                              {resumeData?.data?.phone}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Technical Skills */}
                      {resumeData?.data?.skills?.technical?.length > 0 && (
                        <div className="md:col-span-2 bg-white/5 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-purple-300 mb-4">Technical Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {resumeData?.data?.skills.technical.map((skill, idx) => (
                              <span
                                key={idx}
                                className="bg-purple-600/40 px-4 py-2 rounded-full text-white text-sm font-medium border border-purple-500/30"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Area of Interest */}
                      {resumeData?.data?.skills?.area_of_interest?.length > 0 && (
                        <div className="md:col-span-2 bg-white/5 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-purple-300 mb-4">Area of Interest</h3>
                          <div className="flex flex-wrap gap-2">
                            {resumeData?.data?.skills.area_of_interest.map((area, idx) => (
                              <span
                                key={idx}
                                className="bg-blue-600/40 px-4 py-2 rounded-full text-white text-sm font-medium border border-blue-500/30"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {resumeData?.data?.languages?.length > 0 && (
                        <div className="md:col-span-2 bg-white/5 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-purple-300 mb-4">Languages</h3>
                          <div className="flex flex-wrap gap-2">
                            {resumeData?.data?.languages.map((lang, idx) => (
                              <span key={idx} className="bg-pink-600/40 px-4 py-2 rounded-full text-white text-sm font-medium border border-pink-500/30">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      {resumeData?.data?.summary && (
                        <div className="md:col-span-2 bg-white/5 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-purple-300 mb-3">Professional Summary</h3>
                          <p className="text-white leading-relaxed">{resumeData?.data?.summary}</p>
                        </div>
                      )}

                      {/* LLM-based Certificate Evaluation */}
                      {Array.isArray(resumeData?.data?.certificate_analysis) &&
                       resumeData.data.certificate_analysis.length > 0 && (
                        <div className="md:col-span-2 bg-white/5 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
                            <Award size={20} className="text-yellow-300" />
                            Certificate Evaluation (LLM)
                          </h3>

                          <div className="space-y-3">
                            {resumeData.data.certificate_analysis.map((cert, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-purple-900/20 border border-purple-500/30 rounded-xl px-4 py-3"
                              >
                                <div className="flex-1">
                                  <p className="text-white font-medium text-sm">
                                    {cert.certificate}
                                  </p>
                                  {cert.reason && (
                                    <p className="text-purple-200 text-xs mt-1">
                                      {cert.reason}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right text-xs text-purple-200">
                                  {typeof cert.value_level === 'string' && (
                                    <p className="capitalize">Value: {cert.value_level}</p>
                                  )}
                                  {typeof cert.recommendation === 'string' && (
                                    <p className="capitalize">Action: {cert.recommendation}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* LLM-based Project Evaluation */}
                      {Array.isArray(resumeData?.data?.project_analysis) &&
                       resumeData.data.project_analysis.length > 0 && (
                        <div className="md:col-span-2 bg-white/5 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
                            <Briefcase size={20} className="text-purple-300" />
                            Project Evaluation (LLM)
                          </h3>

                          <div className="space-y-4">
                            {resumeData.data.project_analysis.map((proj, idx) => (
                              <div
                                key={idx}
                                className="bg-purple-900/20 border border-purple-500/30 rounded-xl px-4 py-4 space-y-3"
                              >
                                {/* Header: title, domain, complexity, relevance */}
                                <div className="flex flex-wrap justify-between gap-3">
                                  <div className="flex-1 min-w-[180px]">
                                    <p className="text-white font-semibold text-sm">
                                      {proj.project_title || `Project ${idx + 1}`}
                                    </p>
                                    {proj.summary && (
                                      <p className="text-purple-100 text-xs mt-1">
                                        {proj.summary}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    {proj.domain && (
                                      <span className="text-[11px] px-3 py-1 rounded-full bg-blue-500/20 text-blue-100 border border-blue-400/40 font-semibold">
                                        {proj.domain}
                                      </span>
                                    )}
                                    {proj.complexity_level && (
                                      <span className="text-[11px] px-3 py-1 rounded-full bg-green-500/20 text-green-100 border border-green-400/40 font-semibold">
                                        {proj.complexity_level}
                                      </span>
                                    )}
                                    <div className="text-right min-w-[80px]">
                                      <p className="text-[11px] text-purple-200">Relevance</p>
                                      <p className="text-lg font-semibold text-yellow-300">
                                        {typeof proj.relevance_score === "number" ? proj.relevance_score : 0}
                                        <span className="text-[11px] text-purple-300 ml-1">/100</span>
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Technologies & role mapping */}
                                <div className="flex flex-wrap gap-4">
                                  <div className="flex-1 min-w-[200px]">
                                    <p className="text-[12px] text-purple-200 mb-1">Technologies</p>
                                    <div className="flex flex-wrap gap-2">
                                      {(proj.technologies || []).length > 0 ? (
                                        proj.technologies.map((t, tIdx) => (
                                          <span
                                            key={tIdx}
                                            className="text-[11px] px-3 py-1 rounded-full bg-slate-900/40 text-purple-50 border border-purple-500/30"
                                          >
                                            {t}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[12px] text-purple-300">Not detected</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-[200px]">
                                    <p className="text-[12px] text-purple-200 mb-1">Mapped Roles</p>
                                    <div className="flex flex-wrap gap-2">
                                      {(proj.role_mapping || []).length > 0 ? (
                                        proj.role_mapping.map((r, rIdx) => (
                                          <span
                                            key={rIdx}
                                            className="text-[11px] px-3 py-1 rounded-full bg-blue-500/20 text-blue-100 border border-blue-400/40"
                                          >
                                            {r}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[12px] text-purple-300">No specific mapping</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Problem, features, impact */}
                                {proj.problem_statement && (
                                  <div>
                                    <p className="text-[12px] text-purple-200 mb-1">Problem Statement</p>
                                    <p className="text-[13px] text-purple-50">{proj.problem_statement}</p>
                                  </div>
                                )}

                                {proj.features && proj.features.length > 0 && (
                                  <div>
                                    <p className="text-[12px] text-purple-200 mb-1">Key Features</p>
                                    <ul className="list-disc list-inside space-y-1">
                                      {proj.features.map((f, fIdx) => (
                                        <li key={fIdx} className="text-[12px] text-purple-50">
                                          {f}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {proj.impact && (
                                  <div>
                                    <p className="text-[12px] text-purple-200 mb-1">Impact</p>
                                    <p className="text-[13px] text-purple-50">{proj.impact}</p>
                                  </div>
                                )}

                                {/* Missing points & improvements */}
                                {(proj.missing_points && proj.missing_points.length > 0) ||
                                  (proj.recommended_improvements && proj.recommended_improvements.length > 0) ? (
                                  <div className="grid md:grid-cols-2 gap-4 mt-1">
                                    {proj.missing_points && proj.missing_points.length > 0 && (
                                      <div>
                                        <p className="text-[12px] text-red-200 mb-1">Missing Points</p>
                                        <ul className="list-disc list-inside space-y-1">
                                          {proj.missing_points.map((m, mIdx) => (
                                            <li key={mIdx} className="text-[12px] text-red-100">
                                              {m}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {proj.recommended_improvements && proj.recommended_improvements.length > 0 && (
                                      <div>
                                        <p className="text-[12px] text-green-200 mb-1">Recommended Improvements</p>
                                        <ul className="list-disc list-inside space-y-1">
                                          {proj.recommended_improvements.map((imp, iIdx) => (
                                            <li key={iIdx} className="text-[12px] text-green-100">
                                              {imp}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Info className="mx-auto text-purple-400 mb-4" size={48} />
                  <p className="text-purple-200 text-lg">Upload your resume to see detailed analysis</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ATS Analysis Tab */}
        {activeTab === 'ats' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e0f2fe',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Target size={24} style={{ color: '#0ea5e9' }} />
                ATS Compatibility Analysis
              </h2>

              {resumeData ? (
                <>
                  {/* ATS Score Gauge */}
                  <div style={{
                    background: 'linear-gradient(135deg, #e0f2fe, #f0f9ff)',
                    borderRadius: '12px',
                    padding: '32px',
                    marginBottom: '24px',
                    border: '1px solid #0ea5e9'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        color: '#0c4a6e',
                        fontSize: '14px',
                        marginBottom: '12px'
                      }}>
                        Your ATS Score
                      </p>
                      <div style={{ display: 'inline-block', position: 'relative' }}>
                        <svg width="192" height="192" style={{ display: 'block' }}>
                          <circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="12"
                          />
                          <circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="12"
                            strokeDasharray={`${(resumeData.ats_score / 100) * 553} 553`}
                            strokeLinecap="round"
                            transform="rotate(-90 96 96)"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#0ea5e9" />
                              <stop offset="100%" stopColor="#0284c7" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div>
                            <p style={{
                              fontSize: '48px',
                              fontWeight: '700',
                              color: '#0284c7',
                              margin: 0
                            }}>
                              {resumeData.ats_score}
                            </p>
                            <p style={{
                              color: '#64748b',
                              fontSize: '14px',
                              margin: 0
                            }}>
                              / 100
                            </p>
                          </div>
                        </div>
                      </div>
                      <p style={{
                        color: '#1e293b',
                        fontSize: '18px',
                        fontWeight: '500',
                        marginTop: '16px'
                      }}>
                        {resumeData.ats_score >= 75 ? '✨ Excellent' : 
                         resumeData.ats_score >= 50 ? '👍 Good' : '⚠️ Needs Improvement'}
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#1e293b',
                      marginBottom: '16px'
                    }}>
                      Recommendations
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {getATSRecommendations().map((rec, idx) => (
                        <div key={idx} style={{
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          ...(rec.color === 'red' ? {
                            background: '#fef2f2',
                            border: '1px solid #fecaca'
                          } : rec.color === 'yellow' ? {
                            background: '#fef3c7',
                            border: '1px solid #fde68a'
                          } : rec.color === 'green' ? {
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0'
                          } : {
                            background: '#eff6ff',
                            border: '1px solid #dbeafe'
                          })
                        }}>
                          <rec.icon style={{
                            flexShrink: 0,
                            marginTop: '2px',
                            ...(rec.color === 'red' ? { color: '#dc2626' } :
                              rec.color === 'yellow' ? { color: '#d97706' } :
                              rec.color === 'green' ? { color: '#059669' } :
                              { color: '#0ea5e9' })
                          }} size={20} />
                          <p style={{
                            color: '#1e293b',
                            fontSize: '14px',
                            margin: 0,
                            lineHeight: '1.5'
                          }}>
                            {rec.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ATS Tips */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e0f2fe'
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1e293b',
                      marginBottom: '12px'
                    }}>
                      ATS Optimization Tips
                    </h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      <li style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        marginBottom: '8px',
                        fontSize: '14px',
                        color: '#475569'
                      }}>
                        <CheckCircle size={16} style={{ color: '#059669', marginTop: '2px', flexShrink: 0 }} />
                        <span>Use standard section headings like "Work Experience" and "Education"</span>
                      </li>
                      <li style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        marginBottom: '8px',
                        fontSize: '14px',
                        color: '#475569'
                      }}>
                        <CheckCircle size={16} style={{ color: '#059669', marginTop: '2px', flexShrink: 0 }} />
                        <span>Include relevant keywords from job descriptions</span>
                      </li>
                      <li style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        marginBottom: '8px',
                        fontSize: '14px',
                        color: '#475569'
                      }}>
                        <CheckCircle size={16} style={{ color: '#059669', marginTop: '2px', flexShrink: 0 }} />
                        <span>Avoid using images, tables, or complex formatting</span>
                      </li>
                      <li style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        marginBottom: '8px',
                        fontSize: '14px',
                        color: '#475569'
                      }}>
                        <CheckCircle size={16} style={{ color: '#059669', marginTop: '2px', flexShrink: 0 }} />
                        <span>List your technical skills explicitly</span>
                      </li>
                      <li style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '14px',
                        color: '#475569'
                      }}>
                        <CheckCircle size={16} style={{ color: '#059669', marginTop: '2px', flexShrink: 0 }} />
                        <span>Use standard fonts and clear formatting</span>
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 0'
                }}>
                  <Target size={48} style={{ color: '#0ea5e9', marginBottom: '16px', margin: '0 auto' }} />
                  <p style={{
                    color: '#1e293b',
                    fontSize: '18px',
                    marginBottom: '16px'
                  }}>
                    Upload your resume in the Resume Analysis tab first
                  </p>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    style={{
                      background: '#0ea5e9',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#0284c7';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#0ea5e9';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Go to Resume Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Role Recommendation Tab */}
        {activeTab === 'roles' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e0f2fe',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Briefcase size={24} style={{ color: '#0ea5e9' }} />
                Recommended Roles
              </h2>

              {resumeData ? (
                <>
                  {resumeData.data?.role_match && (
                    <div style={{
                      background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '24px',
                      border: '1px solid #0ea5e9'
                    }}>
                      <p style={{
                        color: '#0c4a6e',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        Suggested Role from Resume
                      </p>
                      <p style={{
                        color: '#0284c7',
                        fontSize: '20px',
                        fontWeight: '700',
                        margin: 0
                      }}>
                        {resumeData.data.role_match}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {getRoleRecommendations().map((role, idx) => (
                      <div key={idx} style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '24px',
                        border: '1px solid #e0f2fe',
                        transition: 'all 0.2s ease'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: '16px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{
                              fontSize: '20px',
                              fontWeight: '600',
                              color: '#1e293b',
                              marginBottom: '8px'
                            }}>
                              {role.title}
                            </h3>
                            <p style={{
                              color: '#64748b',
                              fontSize: '14px',
                              margin: 0
                            }}>
                              {role.description}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                            <div style={{
                              fontSize: '32px',
                              fontWeight: '700',
                              color: role.match >= 85 ? '#059669' : role.match >= 70 ? '#d97706' : '#ea580c'
                            }}>
                              {role.match}%
                            </div>
                            <p style={{
                              color: '#64748b',
                              fontSize: '12px',
                              margin: 0
                            }}>
                              Match
                            </p>
                          </div>
                        </div>
                        
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{
                            width: '100%',
                            height: '8px',
                            backgroundColor: '#e2e8f0',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div 
                              style={{
                                height: '8px',
                                borderRadius: '4px',
                                transition: 'width 0.3s ease',
                                background: role.match >= 70 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f97316)',
                                width: `${role.match}%`
                              }}
                            />
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          {role.skills.map((s, i) => (
                            <span
                              key={i}
                              style={{
                                background: '#e0f2fe',
                                border: '1px solid #0ea5e9',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                color: '#0c4a6e',
                                fontWeight: '500'
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {resumeData.detected_role && (
                    <div style={{
                      background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '24px',
                      border: '1px solid #0ea5e9'
                    }}>
                      <p style={{
                        color: '#0c4a6e',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        AI-Detected Role
                      </p>
                      <p style={{
                        color: '#0284c7',
                        fontSize: '20px',
                        fontWeight: '700',
                        margin: 0
                      }}>
                        {resumeData.detected_role}
                      </p>
                    </div>
                  )}

                  {/* Suggested Skills Section */}
                  {getSuggestedSkills().length > 0 && (
                    <div style={{
                      marginTop: '32px',
                      background: 'linear-gradient(135deg, #e0f2fe, #f0f9ff)',
                      borderRadius: '12px',
                      padding: '24px',
                      border: '1px solid #0ea5e9'
                    }}>
                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <TrendingUp size={20} style={{ color: '#0ea5e9' }} />
                        Suggested Skills to Strengthen Your {resumeData.detected_role || "Career"}
                      </h3>
                      <p style={{
                        color: '#64748b',
                        fontSize: '14px',
                        marginBottom: '16px'
                      }}>
                        Based on your current resume, here are additional skills recommended for your role:
                        <span style={{ fontWeight: '600', color: '#0ea5e9', marginLeft: '4px' }}>
                          {resumeData.detected_role || "General Developer"}
                        </span>
                      </p>

                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        {getSuggestedSkills().map((skill, i) => (
                          <span
                            key={i}
                            style={{
                              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                              color: 'white',
                              padding: '8px 16px',
                              borderRadius: '20px',
                              fontSize: '14px',
                              fontWeight: '500',
                              border: '1px solid rgba(14, 165, 233, 0.3)',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 0'
                }}>
                  <Briefcase size={48} style={{ color: '#0ea5e9', marginBottom: '16px', margin: '0 auto' }} />
                  <p style={{
                    color: '#1e293b',
                    fontSize: '18px',
                    marginBottom: '16px'
                  }}>
                    Upload your resume first to get personalized role suggestions
                  </p>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    style={{
                      background: '#0ea5e9',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#0284c7';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#0ea5e9';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Go to Resume Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'assistant' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e0f2fe',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              height: '70vh'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <MessageSquare size={24} style={{ color: '#0ea5e9' }} />
                AI Career Assistant
              </h2>

              <div style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: '16px',
                paddingRight: '8px'
              }}>
                {chatMessages.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    textAlign: 'center'
                  }}>
                    <MessageSquare size={48} style={{ color: '#0ea5e9', marginBottom: '12px' }} />
                    <p style={{
                      fontSize: '18px',
                      fontWeight: '500',
                      color: '#1e293b',
                      marginBottom: '4px'
                    }}>
                      Start chatting with your AI assistant
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: '#64748b'
                    }}>
                      Ask about resume improvement, job roles, or technical growth tips.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '75%',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            ...(msg.role === 'user'
                              ? {
                                  background: '#0ea5e9',
                                  color: 'white',
                                  borderBottomRightRadius: '4px'
                                }
                              : {
                                  background: '#f8fafc',
                                  color: '#1e293b',
                                  border: '1px solid #e0f2fe',
                                  borderBottomLeftRadius: '4px'
                                })
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                borderTop: '1px solid #e0f2fe',
                paddingTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type your message..."
                  style={{
                    flex: 1,
                    background: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#1f2937',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                <button
                  onClick={sendMessage}
                  disabled={chatting}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    cursor: chatting ? 'not-allowed' : 'pointer',
                    ...(chatting
                      ? {
                          background: '#94a3b8',
                          color: 'white'
                        }
                      : {
                          background: '#0ea5e9',
                          color: 'white'
                        })
                  }}
                  onMouseEnter={(e) => {
                    if (!chatting) {
                      e.target.style.background = '#0284c7';
                      e.target.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!chatting) {
                      e.target.style.background = '#0ea5e9';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {chatting ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare size={18} />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guidance' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e0f2fe',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <TrendingUp size={24} style={{ color: '#0ea5e9' }} />
                Guidance
              </h2>

              {!resumeData && (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 0'
                }}>
                  <Info size={48} style={{ color: '#0ea5e9', marginBottom: '16px', margin: '0 auto' }} />
                  <p style={{
                    color: '#1e293b',
                    fontSize: '18px',
                    marginBottom: '16px'
                  }}>
                    Upload your resume first in the Resume Analysis tab to get personalized guidance.
                  </p>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    style={{
                      background: '#0ea5e9',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#0284c7';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#0ea5e9';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Go to Resume Analysis
                  </button>
                </div>
              )}

              {resumeData && (
                <>
                  {guidanceLoading && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(14, 165, 233, 0.3)',
                        borderTop: '2px solid #0ea5e9',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <p style={{
                        color: '#64748b',
                        fontSize: '14px'
                      }}>
                        Generating your personalized guidance...
                      </p>
                    </div>
                  )}

                  {guidanceError && (
                    <div style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <AlertCircle style={{ color: '#dc2626', marginTop: '2px' }} size={20} />
                      <div style={{ flex: 1 }}>
                        <p style={{
                          color: '#991b1b',
                          fontSize: '14px',
                          margin: 0
                        }}>
                          {guidanceError}
                        </p>
                      </div>
                    </div>
                  )}

                  {guidance && !guidanceLoading && !guidanceError && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {Array.isArray(guidance.technical_skills) && guidance.technical_skills.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '12px'
                          }}>
                            Technical Skills & Levels
                          </h3>
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            {guidance.technical_skills.map((s, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '20px',
                                  fontSize: '14px',
                                  border: '1px solid #0ea5e9',
                                  background: '#e0f2fe',
                                  color: '#0c4a6e',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>{s.name}</span>
                                {s.level && (
                                  <span style={{
                                    fontSize: '12px',
                                    color: '#64748b',
                                    textTransform: 'capitalize'
                                  }}>
                                    ({s.level})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {Array.isArray(guidance.missing_skills) && guidance.missing_skills.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '12px'
                          }}>
                            Missing / Recommended Skills
                          </h3>
                          <ul style={{
                            margin: 0,
                            padding: 0,
                            listStyle: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            {guidance.missing_skills.map((ms, idx) => (
                              <li key={idx} style={{
                                display: 'flex',
                                gap: '8px',
                                fontSize: '14px',
                                color: '#475569'
                              }}>
                                <span style={{
                                  fontWeight: '600',
                                  color: '#1e293b'
                                }}>
                                  {ms.name}:
                                </span>
                                <span>{ms.reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(guidance.learning_paths) && guidance.learning_paths.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '16px'
                          }}>
                            Learning Paths
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {guidance.learning_paths.map((lp, idx) => (
                              <div key={idx} style={{
                                borderRadius: '12px',
                                border: '1px solid #e0f2fe',
                                background: 'white',
                                padding: '16px'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  gap: '12px',
                                  marginBottom: '8px'
                                }}>
                                  <p style={{
                                    color: '#1e293b',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    margin: 0
                                  }}>
                                    {lp.track}
                                  </p>
                                  {typeof lp.estimated_time_weeks === 'number' && (
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      margin: 0
                                    }}>
                                      ~{lp.estimated_time_weeks} weeks
                                    </p>
                                  )}
                                </div>
                                {Array.isArray(lp.topics) && lp.topics.length > 0 && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Topics
                                    </p>
                                    <ul style={{
                                      margin: 0,
                                      padding: 0,
                                      paddingLeft: '16px',
                                      listStyle: 'disc',
                                      fontSize: '12px',
                                      color: '#475569'
                                    }}>
                                      {lp.topics.map((t, i) => (
                                        <li key={i} style={{ marginBottom: '2px' }}>{t}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {Array.isArray(lp.tools) && lp.tools.length > 0 && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Tools
                                    </p>
                                    <div style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '4px'
                                    }}>
                                      {lp.tools.map((t, i) => (
                                        <span key={i} style={{
                                          fontSize: '11px',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          background: '#e0f2fe',
                                          color: '#0c4a6e',
                                          border: '1px solid #0ea5e9'
                                        }}>
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {Array.isArray(lp.exercises) && lp.exercises.length > 0 && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Practice Tasks
                                    </p>
                                    <ul style={{
                                      margin: 0,
                                      padding: 0,
                                      paddingLeft: '16px',
                                      listStyle: 'disc',
                                      fontSize: '12px',
                                      color: '#475569'
                                    }}>
                                      {lp.exercises.map((t, i) => (
                                        <li key={i} style={{ marginBottom: '2px' }}>{t}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {Array.isArray(lp.projects) && lp.projects.length > 0 && (
                                  <div>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Suggested Projects
                                    </p>
                                    <ul style={{
                                      margin: 0,
                                      padding: 0,
                                      paddingLeft: '16px',
                                      listStyle: 'disc',
                                      fontSize: '12px',
                                      color: '#475569'
                                    }}>
                                      {lp.projects.map((t, i) => (
                                        <li key={i} style={{ marginBottom: '2px' }}>{t}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {Array.isArray(guidance.project_ideas) && guidance.project_ideas.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '12px'
                          }}>
                            Personalized Project Ideas
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {guidance.project_ideas.map((p, idx) => (
                              <div key={idx} style={{
                                border: '1px solid #e0f2fe',
                                borderRadius: '8px',
                                padding: '12px',
                                background: 'white'
                              }}>
                                <p style={{
                                  color: '#1e293b',
                                  fontWeight: '600',
                                  fontSize: '14px',
                                  margin: '0 0 4px 0'
                                }}>
                                  {p.title}
                                </p>
                                {p.type && (
                                  <p style={{
                                    fontSize: '11px',
                                    color: '#64748b',
                                    margin: '0 0 4px 0'
                                  }}>
                                    Type: {p.type}
                                  </p>
                                )}
                                {p.description && (
                                  <p style={{
                                    fontSize: '12px',
                                    color: '#475569',
                                    margin: 0
                                  }}>
                                    {p.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {Array.isArray(guidance.certificate_recommendations) && guidance.certificate_recommendations.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '12px'
                          }}>
                            Certificate Recommendations
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {guidance.certificate_recommendations.map((c, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                border: '1px solid #e0f2fe',
                                borderRadius: '8px',
                                padding: '12px',
                                background: 'white'
                              }}>
                                <div>
                                  <p style={{
                                    color: '#1e293b',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    margin: 0
                                  }}>
                                    {c.name}
                                  </p>
                                  {c.reason && (
                                    <p style={{
                                      color: '#64748b',
                                      fontSize: '12px',
                                      marginTop: '4px',
                                      margin: '4px 0 0 0'
                                    }}>
                                      {c.reason}
                                    </p>
                                  )}
                                </div>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-end',
                                  gap: '2px',
                                  fontSize: '12px'
                                }}>
                                  {c.value_level && (
                                    <p style={{
                                      color: '#64748b',
                                      margin: 0,
                                      textTransform: 'capitalize'
                                    }}>
                                      Value: {c.value_level}
                                    </p>
                                  )}
                                  {c.recommendation && (
                                    <p style={{
                                      color: '#64748b',
                                      margin: 0,
                                      textTransform: 'capitalize'
                                    }}>
                                      Action: {c.recommendation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {Array.isArray(guidance.role_matching) && guidance.role_matching.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '12px'
                          }}>
                            Role Match Analysis
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {guidance.role_matching.map((r, idx) => (
                              <div key={idx} style={{
                                border: '1px solid #e0f2fe',
                                borderRadius: '8px',
                                padding: '12px',
                                background: 'white'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '8px'
                                }}>
                                  <p style={{
                                    color: '#1e293b',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    margin: 0
                                  }}>
                                    {r.role}
                                  </p>
                                  {typeof r.match_percentage === 'number' && (
                                    <p style={{
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      color: '#d97706',
                                      margin: 0
                                    }}>
                                      {r.match_percentage}% match
                                    </p>
                                  )}
                                </div>
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                  gap: '12px',
                                  fontSize: '12px'
                                }}>
                                  <div>
                                    <p style={{
                                      fontWeight: '600',
                                      marginBottom: '4px',
                                      color: '#1e293b'
                                    }}>
                                      Matched Skills
                                    </p>
                                    <div style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '4px'
                                    }}>
                                      {(r.matched_skills || []).map((s, i) => (
                                        <span key={i} style={{
                                          padding: '2px 6px',
                                          borderRadius: '10px',
                                          background: '#f0fdf4',
                                          color: '#14532d',
                                          border: '1px solid #bbf7d0',
                                          fontSize: '11px'
                                        }}>
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p style={{
                                      fontWeight: '600',
                                      marginBottom: '4px',
                                      color: '#1e293b'
                                    }}>
                                      Missing Skills
                                    </p>
                                    <div style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '4px'
                                    }}>
                                      {(r.missing_skills || []).map((s, i) => (
                                        <span key={i} style={{
                                          padding: '2px 6px',
                                          borderRadius: '10px',
                                          background: '#fef2f2',
                                          color: '#991b1b',
                                          border: '1px solid #fecaca',
                                          fontSize: '11px'
                                        }}>
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p style={{
                                      fontWeight: '600',
                                      marginBottom: '4px',
                                      color: '#1e293b'
                                    }}>
                                      Additional Skills To Learn
                                    </p>
                                    <div style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '4px'
                                    }}>
                                      {(r.additional_skills_to_learn || []).map((s, i) => (
                                        <span key={i} style={{
                                          padding: '2px 6px',
                                          borderRadius: '10px',
                                          background: '#dbeafe',
                                          color: '#1e3a8a',
                                          border: '1px solid #93c5fd',
                                          fontSize: '11px'
                                        }}>
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {Array.isArray(guidance.weak_skills) && guidance.weak_skills.length > 0 && (
                        <div className="bg-white/5 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-purple-300 mb-3">Low-value / Weak Skills</h3>
                          <ul className="space-y-2 text-sm text-purple-100">
                            {guidance.weak_skills.map((ws, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="font-semibold text-white">{ws.name}:</span>
                                <span className="text-purple-200">{ws.reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(guidance.recommended_tech_stacks) && guidance.recommended_tech_stacks.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '12px'
                          }}>
                            Recommended Tech Stacks
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {guidance.recommended_tech_stacks.map((ts, idx) => (
                              <div key={idx} style={{
                                border: '1px solid #e0f2fe',
                                borderRadius: '8px',
                                padding: '12px',
                                background: 'white'
                              }}>
                                <p style={{
                                  color: '#1e293b',
                                  fontWeight: '600',
                                  fontSize: '14px',
                                  margin: '0 0 4px 0'
                                }}>
                                  {ts.stack}
                                </p>
                                {ts.reason && (
                                  <p style={{
                                    fontSize: '12px',
                                    color: '#64748b',
                                    margin: 0
                                  }}>
                                    {ts.reason}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {guidance.career_clarity_summary && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '12px'
                          }}>
                            Career Clarity Summary
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {guidance.career_clarity_summary.primary_alignment && (
                              <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>
                                <span style={{ fontWeight: '600', color: '#1e293b' }}>Primary Alignment:</span> {guidance.career_clarity_summary.primary_alignment}
                              </p>
                            )}
                            {Array.isArray(guidance.career_clarity_summary.aligned_roles) && guidance.career_clarity_summary.aligned_roles.length > 0 && (
                              <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>
                                <span style={{ fontWeight: '600', color: '#1e293b' }}>Good Roles:</span>{' '}
                                {guidance.career_clarity_summary.aligned_roles.join(', ')}
                              </p>
                            )}
                            {Array.isArray(guidance.career_clarity_summary.roles_to_avoid) && guidance.career_clarity_summary.roles_to_avoid.length > 0 && (
                              <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>
                                <span style={{ fontWeight: '600', color: '#1e293b' }}>Roles to Avoid:</span>{' '}
                                {guidance.career_clarity_summary.roles_to_avoid.join(', ')}
                              </p>
                            )}
                            {guidance.career_clarity_summary.reasoning && (
                              <p style={{
                                color: '#64748b',
                                fontSize: '12px',
                                margin: 0
                              }}>
                                {guidance.career_clarity_summary.reasoning}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {Array.isArray(guidance.weekly_schedule) && guidance.weekly_schedule.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '12px'
                          }}>
                            4–8 Week Skill-Improvement Plan
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {guidance.weekly_schedule.map((w, idx) => (
                              <div key={idx} style={{
                                border: '1px solid #e0f2fe',
                                borderRadius: '8px',
                                padding: '12px',
                                background: 'white'
                              }}>
                                <p style={{
                                  color: '#1e293b',
                                  fontWeight: '600',
                                  fontSize: '14px',
                                  margin: '0 0 8px 0'
                                }}>
                                  Week {w.week || idx + 1}: {w.focus}
                                </p>
                                {Array.isArray(w.topics) && w.topics.length > 0 && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Topics
                                    </p>
                                    <ul style={{
                                      margin: 0,
                                      padding: 0,
                                      paddingLeft: '16px',
                                      listStyle: 'disc',
                                      fontSize: '12px',
                                      color: '#475569'
                                    }}>
                                      {w.topics.map((t, i) => (
                                        <li key={i} style={{ marginBottom: '2px' }}>{t}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {Array.isArray(w.practice_tasks) && w.practice_tasks.length > 0 && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Practice Tasks
                                    </p>
                                    <ul style={{
                                      margin: 0,
                                      padding: 0,
                                      paddingLeft: '16px',
                                      listStyle: 'disc',
                                      fontSize: '12px',
                                      color: '#475569'
                                    }}>
                                      {w.practice_tasks.map((t, i) => (
                                        <li key={i} style={{ marginBottom: '2px' }}>{t}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {Array.isArray(w.checkpoints) && w.checkpoints.length > 0 && (
                                  <div>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Checkpoints
                                    </p>
                                    <ul style={{
                                      margin: 0,
                                      padding: 0,
                                      paddingLeft: '16px',
                                      listStyle: 'disc',
                                      fontSize: '12px',
                                      color: '#475569'
                                    }}>
                                      {w.checkpoints.map((c, i) => (
                                        <li key={i} style={{ marginBottom: '2px' }}>{c}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
