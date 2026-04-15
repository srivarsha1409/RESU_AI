import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import { 
  Upload, Target, Briefcase, MessageSquare, CheckCircle, AlertCircle, Info, 
  TrendingUp, Award, FileText, User, Mail, Phone, Calendar, BookOpen, Rocket, 
  Code, GraduationCap, Zap, ChevronDown, ChevronUp, PlayCircle, Star, Trophy,
  Layers, GitBranch, Clock, ArrowRight, Lightbulb, PenTool, Wrench, FolderOpen
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';

const API_BASE = 'http://127.0.0.1:8000';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  
  // Resume data
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);

  const [guidance, setGuidance] = useState(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [guidanceError, setGuidanceError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [completedSteps, setCompletedSteps] = useState({});
  const [guidanceSubTab, setGuidanceSubTab] = useState('roadmap'); // 'roadmap' or 'direction'
  
  // Role Roadmap Generator
  const [targetRole, setTargetRole] = useState('');
  const [roleRoadmap, setRoleRoadmap] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState(null);
  
  const [refCompany, setRefCompany] = useState('');
  const [refRole, setRefRole] = useState('');
  const [refLinkedInNote, setRefLinkedInNote] = useState('');
  const [refReferralDM, setRefReferralDM] = useState('');
  
  // AI Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [chatting, setChatting] = useState(false);

  // Skillset tab data - multiple uploads with tabs
  const [skillsetData, setSkillsetData] = useState(null);
  const [skillsetUploads, setSkillsetUploads] = useState([]);
  const [activeSkillsetTab, setActiveSkillsetTab] = useState(null);
  const [skillsetLoading, setSkillsetLoading] = useState(false);
  const [skillsetError, setSkillsetError] = useState(null);
  const [eligibleCompanies, setEligibleCompanies] = useState([]);

  // Function to match user skills and department with company requirements
  const matchSkillsWithCompanies = useCallback((sheets, userSkills, userDepartment) => {
    if (!sheets) return [];
    
    const eligible = [];
    const userSkillsLower = (userSkills || []).map(s => s.toLowerCase().trim());
    
    // Normalize user department for matching
    const userDeptLower = (userDepartment || '').toLowerCase().trim();
    
    // Department group mappings - each group contains equivalent terms
    // User's department will be mapped to a group, then we check if company accepts that group
    const deptGroups = {
      'cse': ['cse', 'cs', 'computer science', 'computer science and engineering', 'computer engineering', 'comp sci', 'csbs'],
      'it': ['it', 'information technology', 'info tech'],
      'ece': ['ece', 'ec', 'electronics and communication', 'electronics & communication', 'electronics communication'],
      'eee': ['eee', 'ee', 'electrical', 'electrical engineering', 'electrical and electronics', 'electrical & electronics'],
      'mech': ['mech', 'me', 'mechanical', 'mechanical engineering'],
      'civil': ['civil', 'ce', 'civil engineering'],
      'aids': ['aids', 'ai & ds', 'ai and ds', 'ai and data science', 'ai&ds', 'artificial intelligence and data science', 'ad'],
      'aiml': ['aiml', 'ai & ml', 'ai and ml', 'ai&ml', 'artificial intelligence and machine learning'],
      'auto': ['auto', 'automobile', 'automobile engineering'],
      'biotech': ['biotech', 'bt', 'biotechnology'],
      'chemical': ['chemical', 'che', 'chemical engineering'],
      'ct': ['ct', 'computer technology'],
      'ise': ['ise', 'is', 'information science', 'information science and engineering'],
      'ei': ['ei', 'electronics and instrumentation', 'eie'],
      'mc': ['mc', 'mechatronics'],
      'cb': ['cb', 'computer business'],
      'cd': ['cd', 'computer design'],
      'al': ['al', 'analytics'],
    };
    
    // Find which group the user's department belongs to
    const findUserDeptGroup = () => {
      for (const [groupKey, aliases] of Object.entries(deptGroups)) {
        // Check if user's department matches any alias in this group
        for (const alias of aliases) {
          if (userDeptLower.includes(alias) || alias.includes(userDeptLower)) {
            return groupKey;
          }
        }
      }
      return null;
    };
    
    const userDeptGroup = findUserDeptGroup();
    
    // Function to check if company department text accepts user's department
    const checkDeptMatch = (companyDeptText) => {
      if (!companyDeptText || !userDeptLower) return false;
      const compDeptLower = String(companyDeptText).toLowerCase();
      
      // Check for "all" or "open to all" - matches everyone
      if (compDeptLower.includes('all b.e') || 
          compDeptLower.includes('all be') ||
          compDeptLower.includes('all engineering') ||
          compDeptLower.includes('open to all') ||
          compDeptLower.includes('any branch') ||
          compDeptLower.includes('any engineering') ||
          compDeptLower === 'all') {
        return true;
      }
      
      // If user's department group is identified, check if company accepts it
      if (userDeptGroup) {
        const userGroupAliases = deptGroups[userDeptGroup];
        
        // Split company departments by common separators and check each
        const companyDepts = compDeptLower.split(/[,;|\/&\n]+/).map(d => d.trim());
        
        for (const compDept of companyDepts) {
          // Check if this company department matches any alias of user's group
          for (const alias of userGroupAliases) {
            // Use word boundary matching to avoid partial matches
            // e.g., "AI" in "AIDS" shouldn't match "AI" alone
            const aliasRegex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (aliasRegex.test(compDept)) {
              return true;
            }
            // Also check if the company dept is exactly the alias
            if (compDept.trim() === alias.trim()) {
              return true;
            }
          }
        }
        
        // Also check the full text for exact matches
        for (const alias of userGroupAliases) {
          const aliasRegex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (aliasRegex.test(compDeptLower)) {
            return true;
          }
        }
      }
      
      // Direct match as fallback
      if (compDeptLower.includes(userDeptLower)) {
        return true;
      }
      
      return false;
    };
    
    // Iterate through all sheets to find companies
    Object.entries(sheets).forEach(([sheetName, rows]) => {
      if (!rows || rows.length === 0) return;
      
      rows.forEach((row, rowIndex) => {
        // Try to find company name column
        const companyNameKeys = ['Company', 'Company Name', 'company', 'company_name', 'Name', 'COMPANY', 'Organization'];
        let companyName = null;
        for (const key of companyNameKeys) {
          if (row[key]) {
            companyName = row[key];
            break;
          }
        }
        // If no company name column, try first column
        if (!companyName) {
          const firstKey = Object.keys(row)[0];
          companyName = row[firstKey];
        }
        
        if (!companyName || String(companyName).trim() === '') return;
        
        // STEP 1: Find and check department match FIRST
        let departmentMatched = false;
        let companyDepartments = [];
        let foundDeptColumn = false;
        
        Object.entries(row).forEach(([col, val]) => {
          const colLower = col.toLowerCase();
          // Look for department-related columns ONLY (strict column matching)
          if (colLower.includes('dept') || 
              colLower.includes('branch') || 
              colLower.includes('eligible') ||
              colLower.includes('stream') ||
              colLower.includes('discipline')) {
            if (val && String(val).trim() !== '') {
              foundDeptColumn = true;
              const deptText = String(val);
              const depts = deptText.split(/[,;|\n]+/).map(s => s.trim()).filter(s => s);
              companyDepartments.push(...depts);
              // Check if user's department matches THIS column value
              if (checkDeptMatch(deptText)) {
                departmentMatched = true;
              }
            }
          }
        });
        
        // If company has department requirements but user's department doesn't match, SKIP this company
        if (foundDeptColumn && !departmentMatched) {
          return; // Skip to next company - department doesn't match
        }
        
        // STEP 2: Only if department matches (or no dept requirements), check skills
        let requiredSkills = [];
        Object.entries(row).forEach(([col, val]) => {
          const colLower = col.toLowerCase();
          // Look for skill-related columns ONLY
          if (colLower.includes('skill') || colLower === 'skills required' || 
              colLower === 'technology' || colLower === 'technologies' ||
              colLower === 'tech stack' || colLower === 'tools') {
            if (val && String(val).trim() !== '') {
              // Split by common delimiters and clean each skill
              const skills = String(val).split(/[,;\n]+/).map(s => s.trim().toLowerCase()).filter(s => s && s.length > 1);
              requiredSkills.push(...skills);
            }
          }
        });
        
        // Count matching skills - EXACT MATCH ONLY
        let matchedSkills = [];
        let matchCount = 0;
        
        userSkillsLower.forEach(userSkill => {
          // EXACT MATCH: Check if user skill exactly matches any required skill
          const skillMatched = requiredSkills.some(reqSkill => {
            const reqLower = reqSkill.toLowerCase().trim();
            const userLower = userSkill.toLowerCase().trim();
            
            // Exact match only - the skill must be exactly the same
            // or the required skill contains the exact user skill as a separate word
            if (reqLower === userLower) {
              return true;
            }
            
            // Check if user skill appears as a complete word in required skill
            // e.g., "python" should match "python programming" but not "pythonic"
            const wordRegex = new RegExp(`\\b${userLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (wordRegex.test(reqLower)) {
              return true;
            }
            
            return false;
          });
          
          if (skillMatched) {
            matchedSkills.push(userSkill);
            matchCount++;
          }
        });
        
        // Calculate match score
        const skillMatchPercentage = requiredSkills.length > 0 
          ? (matchCount / Math.min(requiredSkills.length, userSkillsLower.length)) * 100 
          : (matchCount > 0 ? 50 : 0);
        
        // Check if company has skill requirements
        const hasSkillRequirements = requiredSkills.length > 0;
        
        // STRICT Eligibility criteria:
        // - Department already matched (we skipped non-matching ones above)
        // - Now check if skills match
        let isEligible = false;
        
        if (hasSkillRequirements) {
          // Skills required - at least 1 must match
          isEligible = matchCount >= 1;
        } else if (foundDeptColumn) {
          // No skill requirements listed but dept column exists - eligible based on department match
          isEligible = departmentMatched;
        } else {
          // No dept or skill requirements - don't mark as eligible
          isEligible = false;
        }
        
        if (isEligible) {
          eligible.push({
            companyName: String(companyName),
            sheetName,
            rowIndex,
            matchedSkills: [...new Set(matchedSkills)],
            matchCount,
            matchPercentage: Math.round(skillMatchPercentage),
            departmentMatched,
            companyDepartments: [...new Set(companyDepartments)].slice(0, 5),
            requiredSkills: [...new Set(requiredSkills)].slice(0, 10),
            row
          });
        }
      });
    });
    
    // Sort by: department match first, then by skill count
    eligible.sort((a, b) => {
      // Prioritize department + skills match
      if (a.departmentMatched && !b.departmentMatched) return -1;
      if (!a.departmentMatched && b.departmentMatched) return 1;
      // Then by skill match count
      return b.matchCount - a.matchCount;
    });
    
    // Remove duplicates by company name
    const seen = new Set();
    return eligible.filter(e => {
      const key = e.companyName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const email = localStorage.getItem("email");

  const fetchGuidance = useCallback(async (forceRegenerate = false) => {
    if (!resumeData?.data || guidanceLoading) return;
    
    const storedEmail = localStorage.getItem("email");

    setGuidanceLoading(true);
    setGuidanceError(null);

    try {
      // First try to get cached guidance from user data (unless force regenerating)
      if (!forceRegenerate && storedEmail) {
        const cacheRes = await fetch(`${API_BASE}/user/guidance/${storedEmail}`);
        if (cacheRes.ok) {
          const cacheData = await cacheRes.json();
          if (cacheData.guidance && Object.keys(cacheData.guidance).length > 0) {
            setGuidance(cacheData.guidance);
            setGuidanceLoading(false);
            return;
          }
        }
      }

      // Generate fresh guidance
      const res = await fetch(`${API_BASE}/guidance/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resume_data: resumeData.data }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setGuidance(data.guidance || {});
      
      // Cache the guidance in MongoDB
      if (storedEmail && data.guidance) {
        fetch(`${API_BASE}/user/guidance/${storedEmail}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guidance: data.guidance }),
        }).catch(err => console.warn("Failed to cache guidance:", err));
      }
    } catch (err) {
      console.error("Guidance error:", err);
      setGuidanceError(err.message || "Failed to generate guidance");
      setGuidance(null);
    } finally {
      setGuidanceLoading(false);
    }
  }, [resumeData, guidanceLoading]);


  // Fetch user info and hydrate resume data (so role tab works after reload)
  useEffect(() => {
    const fetchUserData = async () => {
      const storedEmail = localStorage.getItem("email");
      if (!storedEmail) return;

      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/user/info/${storedEmail}`);
        const data = await res.json();
        
        // Hydrate resumeData from saved user document in MongoDB
        if (data.user && data.user.structured_info) {
          setResumeData({
            ats_score: data.user.ats_score || 0,
            word_count: data.user.word_count || 0,
            data: data.user.structured_info,
            ats_breakdown: data.user.ats_breakdown || {},
            detected_role: data.user.detected_role || null,
            suggested_skills: data.user.suggested_skills || [],
          });
          
          // Load cached guidance if available
          if (data.user.cached_guidance && Object.keys(data.user.cached_guidance).length > 0) {
            setGuidance(data.user.cached_guidance);
          }
        }
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
  }, [activeTab, resumeData, guidance, guidanceLoading, fetchGuidance]);

  // Fetch skillset uploads when user navigates to the skillset tab
  useEffect(() => {
    if (activeTab !== 'skillset') return;
    const fetchSkillsetUploads = async () => {
      setSkillsetLoading(true);
      setSkillsetError(null);
      try {
        const res = await fetch(`${API_BASE}/user/skillset_uploads`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (data.uploads && data.uploads.length > 0) {
          setSkillsetUploads(data.uploads);
          setActiveSkillsetTab(data.uploads[0].id);
          setSkillsetData(data.uploads[0].sheets);
        } else {
          setSkillsetUploads([]);
          setSkillsetData(null);
        }
      } catch (err) {
        console.error('Skillset fetch error:', err);
        setSkillsetError(err.message || 'Failed to load skillset');
        setSkillsetData(null);
      } finally {
        setSkillsetLoading(false);
      }
    };
    fetchSkillsetUploads();
  }, [activeTab]);

  // Update skillsetData when active tab changes
  useEffect(() => {
    if (activeSkillsetTab && skillsetUploads.length > 0) {
      const currentUpload = skillsetUploads.find(u => u.id === activeSkillsetTab);
      setSkillsetData(currentUpload?.sheets || null);
    }
  }, [activeSkillsetTab, skillsetUploads]);

  // Calculate eligible companies when skillset or resume data changes
  useEffect(() => {
    if (skillsetData && resumeData?.data) {
      const userSkills = resumeData.data.skills?.technical || [];
      // Extract department from education - could be in bachelor.degree, bachelor.branch, etc.
      const userDepartment = resumeData.data.education?.bachelor?.degree || 
                            resumeData.data.education?.bachelor?.branch ||
                            resumeData.data.education?.degree ||
                            resumeData.data.education?.branch ||
                            '';
      
      // Debug log to see what's being extracted
      console.log('=== ELIGIBILITY DEBUG ===');
      console.log('User Department from Resume:', userDepartment);
      console.log('User Skills:', userSkills);
      console.log('========================');
      
      const eligible = matchSkillsWithCompanies(skillsetData, userSkills, userDepartment);
      setEligibleCompanies(eligible);
    } else {
      setEligibleCompanies([]);
    }
  }, [skillsetData, resumeData, matchSkillsWithCompanies]);

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
        setError(result.error || result.detail || 'Failed to upload resume');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear resume data for re-upload
  const clearResumeData = async () => {
    if (!email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/user/clear_resume/${email}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setResumeData(null);
        setResumeFile(null);
        setGuidance(null);
        alert('Resume data cleared! Please upload your resume again.');
      } else {
        const result = await response.json();
        setError(result.detail || 'Failed to clear resume data');
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
              <MessageSquare size={24} style={{ color: '#1e3a5f' }} />
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
                  onFocus={(e) => e.target.style.borderColor = '#1e3a5f'}
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
                  onFocus={(e) => e.target.style.borderColor = '#1e3a5f'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            <button
              onClick={generateReferralMessages}
              disabled={!resumeData?.data}
              style={{
                padding: '12px 24px',
                background: '#1e3a5f',
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
                  e.target.style.background = '#15294a';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (resumeData?.data) {
                  e.target.style.background = '#1e3a5f';
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

        {/* Skillset Tab */}
        {activeTab === 'skillset' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e0f2fe',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>Company Skillset</h2>

              {skillsetLoading && <p>Loading skillset...</p>}
              {skillsetError && (
                <div style={{ color: '#b91c1c' }}>Error loading skillset: {skillsetError}</div>
              )}

              {/* Eligible Companies Section - Highlighted */}
              {eligibleCompanies.length > 0 && (
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '24px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      background: '#1e3a5f',
                      borderRadius: '50%',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CheckCircle size={24} color="#fff" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e3a5f', margin: 0 }}>
                        You're Eligible for {eligibleCompanies.length} {eligibleCompanies.length === 1 ? 'Company' : 'Companies'}!
                      </h3>
                      <p style={{ fontSize: '14px', color: '#047857', margin: '4px 0 0 0' }}>
                        Based on your skills & department match
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {eligibleCompanies.slice(0, 8).map((company, idx) => (
                      <div key={idx} style={{
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '16px',
                        border: company.departmentMatched ? '2px solid #10b981' : '1px solid #a7f3d0',
                        boxShadow: company.departmentMatched 
                          ? '0 4px 12px rgba(16, 185, 129, 0.25)' 
                          : '0 2px 8px rgba(16, 185, 129, 0.15)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                              {company.companyName}
                            </h4>
                            {company.departmentMatched && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#dbeafe',
                                color: '#1d4ed8',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                marginTop: '4px'
                              }}>
                                Department Match
                              </span>
                            )}
                          </div>
                          <span style={{
                            background: company.departmentMatched && company.matchCount >= 2 
                              ? '#10b981' 
                              : company.matchCount >= 4 
                                ? '#10b981' 
                                : company.matchCount >= 2 
                                  ? '#f59e0b' 
                                  : '#6b7280',
                            color: '#fff',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {company.matchCount} {company.matchCount === 1 ? 'skill' : 'skills'}
                          </span>
                        </div>
                        
                        <div style={{ marginBottom: '10px' }}>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0', fontWeight: '600' }}>
                            Your Matching Skills:
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {company.matchedSkills.slice(0, 6).map((skill, i) => (
                              <span key={i} style={{
                                background: '#d1fae5',
                                color: '#065f46',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                textTransform: 'capitalize'
                              }}>
                                ✓ {skill}
                              </span>
                            ))}
                            {company.matchedSkills.length > 6 && (
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                +{company.matchedSkills.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {company.companyDepartments && company.companyDepartments.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <p style={{ fontSize: '11px', color: '#6366f1', margin: '0 0 4px 0', fontWeight: '600' }}>
                              Eligible Departments: {company.companyDepartments.slice(0, 4).join(', ')}
                              {company.companyDepartments.length > 4 ? '...' : ''}
                            </p>
                          </div>
                        )}
                        
                        {company.requiredSkills.length > 0 && (
                          <div>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px 0' }}>
                              Company looks for: {company.requiredSkills.slice(0, 5).join(', ')}
                              {company.requiredSkills.length > 5 ? '...' : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {eligibleCompanies.length > 8 && (
                    <p style={{ textAlign: 'center', color: '#047857', fontSize: '14px', marginTop: '16px' }}>
                      And {eligibleCompanies.length - 8} more companies...
                    </p>
                  )}
                </div>
              )}

              {/* No Eligible Companies Message */}
              {!skillsetLoading && skillsetData && eligibleCompanies.length === 0 && resumeData?.data?.skills?.technical && (
                <div style={{
                  background: '#fef3c7',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  border: '1px solid #fcd34d'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={20} color="#d97706" />
                    <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
                      <strong>No exact matches found.</strong> Consider learning skills from the companies below to improve eligibility.
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Resume Prompt if no resume data */}
              {!resumeData?.data?.skills?.technical && (
                <div style={{
                  background: '#eff6ff',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  border: '1px solid #bfdbfe'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Info size={20} color="#2563eb" />
                    <p style={{ margin: 0, color: '#1e40af', fontSize: '14px' }}>
                      <strong>Upload your resume</strong> in the Analysis tab to see which companies match your skills!
                    </p>
                  </div>
                </div>
              )}

              {/* Skillset Tabs */}
              {skillsetUploads.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    borderBottom: '2px solid #e2e8f0',
                    paddingBottom: '8px'
                  }}>
                    {skillsetUploads.map((upload) => (
                      <button
                        key={upload.id}
                        onClick={() => setActiveSkillsetTab(upload.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 16px',
                          background: activeSkillsetTab === upload.id ? '#1e3a5f' : '#f1f5f9',
                          color: activeSkillsetTab === upload.id ? '#fff' : '#475569',
                          borderRadius: '8px 8px 0 0',
                          cursor: 'pointer',
                          fontWeight: activeSkillsetTab === upload.id ? '600' : '500',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                          border: activeSkillsetTab === upload.id ? '2px solid #1e3a5f' : '2px solid #e2e8f0',
                          borderBottom: activeSkillsetTab === upload.id ? '2px solid #1e3a5f' : 'none',
                        }}
                      >
                        <FileText size={16} />
                        <span>{upload.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {skillsetData && Object.keys(skillsetData).length > 0 && (
                <div>
                  {Object.entries(skillsetData).map(([sheetName, rows]) => {
                    // Helper function to check if a row is eligible
                    const isRowEligible = (row, rowIdx) => {
                      return eligibleCompanies.some(ec => 
                        ec.sheetName === sheetName && ec.rowIndex === rowIdx
                      );
                    };
                    
                    const getEligibleInfo = (row, rowIdx) => {
                      return eligibleCompanies.find(ec => 
                        ec.sheetName === sheetName && ec.rowIndex === rowIdx
                      );
                    };
                    
                    return (
                    <div key={sheetName} style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>
                        {sheetName}
                      </h3>
                      <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{
                                padding: '10px',
                                textAlign: 'center',
                                fontWeight: '600',
                                color: '#475569',
                                borderRight: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                width: '50px'
                              }}>
                                Match
                              </th>
                              {rows.length > 0 && Object.keys(rows[0]).map(col => (
                                <th key={col} style={{
                                  padding: '10px',
                                  textAlign: 'left',
                                  fontWeight: '600',
                                  color: '#475569',
                                  borderRight: '1px solid #e2e8f0',
                                  background: '#f8fafc'
                                }}>
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, idx) => {
                              const eligible = isRowEligible(row, idx);
                              const eligibleInfo = getEligibleInfo(row, idx);
                              const hasDeptMatch = eligibleInfo?.departmentMatched;
                              return (
                              <tr key={idx} style={{ 
                                borderBottom: '1px solid #e2e8f0', 
                                background: eligible 
                                  ? '#f8fafc'
                                  : (idx % 2 === 0 ? '#fff' : '#f8fafc'),
                                borderLeft: eligible 
                                  ? '4px solid #1e3a5f' 
                                  : 'none'
                              }}>
                                <td style={{
                                  padding: '10px',
                                  textAlign: 'center',
                                  borderRight: '1px solid #e2e8f0'
                                }}>
                                  {eligible ? (
                                    <div 
                                      title={`${hasDeptMatch ? 'Dept Match + ' : ''}${eligibleInfo?.matchCount || 0} skills: ${eligibleInfo?.matchedSkills?.join(', ') || ''}`}
                                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                                    >
                                      <CheckCircle size={18} color={hasDeptMatch ? '#1e3a5f' : '#1e3a5f'} />
                                      {hasDeptMatch && (
                                        <span style={{ fontSize: '10px', color: '#1e3a5f', fontWeight: '600' }}>Dept</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#d1d5db' }}>—</span>
                                  )}
                                </td>
                                {Object.entries(row).map(([col, val]) => (
                                  <td key={col} style={{
                                    padding: '10px',
                                    color: eligible ? '#065f46' : '#334155',
                                    fontWeight: eligible ? '500' : 'normal',
                                    borderRight: '1px solid #e2e8f0'
                                  }}>
                                    {String(val ?? '')}
                                  </td>
                                ))}
                              </tr>
                            );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
                        Total: {rows.length} rows
                      </p>
                    </div>
                  );
                  })}
                </div>
              )}

              {!skillsetLoading && skillsetUploads.length === 0 && !skillsetError && (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  background: '#f0f9ff',
                  borderRadius: '12px',
                  color: '#0369a1'
                }}>
                  <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
                  <p>No skillset files uploaded yet. Please check back later.</p>
                </div>
              )}
            </div>
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
                <FileText size={24} style={{ color: '#1e3a5f' }} />
                Resume Analysis Overview
              </h2>

              {/* Upload Section */}
              <div style={{
                border: '2px dashed #1e3a5f',
                borderRadius: '12px',
                padding: '32px',
                marginBottom: '24px',
                textAlign: 'center',
                transition: 'border-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.borderColor = '#15294a'}
              onMouseLeave={(e) => e.target.style.borderColor = '#1e3a5f'}
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
                      <Upload size={32} style={{ color: '#1e3a5f' }} />
                    </div>
                    <div style={{ color: '#64748b' }}>
                      {resumeFile ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}>
                          <FileText size={20} style={{ color: '#1e3a5f' }} />
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
                          border: '2px solid rgba(30, 58, 95, 0.3)',
                          borderTop: '2px solid #1e3a5f',
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

              {/* Clear & Re-upload Button */}
              {resumeData && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <button
                    onClick={clearResumeData}
                    disabled={loading}
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      color: '#1e3a5f',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Clear & Re-upload Resume
                  </button>
                  <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
                    If your data looks incorrect, click above to clear and re-upload
                  </p>
                </div>
              )}

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
                      background: 'white',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #e2e8f0'
                    }}>
                      <p style={{
                        color: '#475569',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        ATS Score
                      </p>
                      <p style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#1e3a5f',
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
                      background: 'white',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #e2e8f0'
                    }}>
                      <p style={{
                        color: '#475569',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        Word Count
                      </p>
                      <p style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#1e3a5f',
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
                      background: 'white',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #e2e8f0'
                    }}>
                      <p style={{
                        color: '#475569',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        Technical Skills
                      </p>
                      <p style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#1e3a5f',
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
                      background: 'white',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #e2e8f0'
                    }}>
                      <p style={{
                        color: '#475569',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        Languages
                      </p>
                      <p style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#1e3a5f',
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
                      background: 'white',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #e2e8f0'
                    }}>
                      <p style={{
                        color: '#475569',
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
                          <User size={20} style={{ color: '#1e3a5f' }} />
                          Personal Information
                        </h3>
                        {resumeData?.data?.name && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px'
                          }}>
                            <User size={16} style={{ color: '#1e3a5f' }} />
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
                            <Mail size={16} style={{ color: '#1e3a5f' }} />
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
                            <Phone size={16} style={{ color: '#1e3a5f' }} />
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
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe',
                          gridColumn: '1 / -1'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '16px'
                          }}>
                            Technical Skills
                          </h3>
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            {resumeData?.data?.skills.technical.map((skill, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '8px 16px',
                                  borderRadius: '20px',
                                  background: '#dbeafe',
                                  color: '#1e3a8a',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  border: '1px solid #93c5fd'
                                }}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Area of Interest */}
                      {resumeData?.data?.skills?.area_of_interest?.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe',
                          gridColumn: '1 / -1'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '16px'
                          }}>
                            Area of Interest
                          </h3>
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            {resumeData?.data?.skills.area_of_interest.map((area, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '8px 16px',
                                  borderRadius: '20px',
                                  background: '#e0f2fe',
                                  color: '#0c4a6e',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  border: '1px solid #bae6fd'
                                }}
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {resumeData?.data?.languages?.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe',
                          gridColumn: '1 / -1'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '16px'
                          }}>
                            Languages
                          </h3>
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            {resumeData?.data?.languages.map((lang, idx) => (
                              <span key={idx} style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                background: '#f0fdf4',
                                color: '#14532d',
                                fontSize: '14px',
                                fontWeight: '500',
                                border: '1px solid #bbf7d0'
                              }}>
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      {resumeData?.data?.summary && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe',
                          gridColumn: '1 / -1'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '12px'
                          }}>
                            Professional Summary
                          </h3>
                          <p style={{
                            color: '#475569',
                            lineHeight: '1.6',
                            margin: 0,
                            fontSize: '14px'
                          }}>
                            {resumeData?.data?.summary}
                          </p>
                        </div>
                      )}

                      {/* LLM-based Certificate Evaluation */}
                      {Array.isArray(resumeData?.data?.certificate_analysis) &&
                       resumeData.data.certificate_analysis.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe',
                          gridColumn: '1 / -1'
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
                            <Award size={20} style={{ color: '#fbbf24' }} />
                            Certificate Evaluation (LLM)
                          </h3>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {resumeData.data.certificate_analysis.map((cert, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  background: 'white',
                                  border: '1px solid #e0f2fe',
                                  borderRadius: '12px',
                                  padding: '16px'
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <p style={{
                                    color: '#1e293b',
                                    fontWeight: '500',
                                    fontSize: '14px',
                                    margin: 0
                                  }}>
                                    {cert.certificate}
                                  </p>
                                  {cert.reason && (
                                    <p style={{
                                      color: '#64748b',
                                      fontSize: '12px',
                                      marginTop: '4px',
                                      margin: '4px 0 0 0'
                                    }}>
                                      {cert.reason}
                                    </p>
                                  )}
                                </div>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '12px',
                                  flexWrap: 'wrap'
                                }}>
                                  {typeof cert.value_level === 'string' && (
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: cert.value_level === 'high' ? '#f0fdf4' :
                                                   cert.value_level === 'medium' ? '#fef3c7' : '#fef2f2',
                                      color: cert.value_level === 'high' ? '#14532d' :
                                             cert.value_level === 'medium' ? '#92400e' : '#991b1b',
                                      fontWeight: '500',
                                      textTransform: 'capitalize'
                                    }}>
                                      Value: {cert.value_level}
                                    </span>
                                  )}
                                  {typeof cert.recommendation === 'string' && (
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: cert.recommendation === 'keep' ? '#f0fdf4' :
                                                   cert.recommendation === 'remove' ? '#fef2f2' : '#f3f4f6',
                                      color: cert.recommendation === 'keep' ? '#14532d' :
                                             cert.recommendation === 'remove' ? '#991b1b' : '#374151',
                                      fontWeight: '500',
                                      textTransform: 'capitalize'
                                    }}>
                                      Action: {cert.recommendation}
                                    </span>
                                  )}
                                  {typeof cert.worthscore === 'number' && (
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: '#e0f2fe',
                                      color: '#0c4a6e',
                                      fontWeight: '600'
                                    }}>
                                      Score: {cert.worthscore}/100
                                    </span>
                                  )}
                                  {cert.highlight && (
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: '#fbbf24',
                                      color: '#78350f',
                                      fontWeight: '500',
                                      fontSize: '11px'
                                    }}>
                                      ⭐ {cert.highlight}
                                    </span>
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
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid #e0f2fe',
                          gridColumn: '1 / -1'
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
                            <Briefcase size={20} style={{ color: '#1e3a5f' }} />
                            Project Evaluation (LLM)
                          </h3>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {resumeData.data.project_analysis.map((proj, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: 'white',
                                  border: '1px solid #e0f2fe',
                                  borderRadius: '12px',
                                  padding: '16px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px'
                                }}
                              >
                                {/* Header: title, domain, complexity, relevance */}
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  justifyContent: 'space-between',
                                  gap: '12px'
                                }}>
                                  <div style={{
                                    flex: 1,
                                    minWidth: '180px'
                                  }}>
                                    <p style={{
                                      color: '#1e293b',
                                      fontWeight: '600',
                                      fontSize: '14px',
                                      margin: 0
                                    }}>
                                      {proj.project_title || `Project ${idx + 1}`}
                                    </p>
                                    {proj.summary && (
                                      <p style={{
                                        color: '#64748b',
                                        fontSize: '12px',
                                        marginTop: '4px',
                                        margin: '4px 0 0 0'
                                      }}>
                                        {proj.summary}
                                      </p>
                                    )}
                                  </div>

                                  <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    {proj.domain && (
                                      <span style={{
                                        fontSize: '11px',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        background: '#dbeafe',
                                        color: '#1e3a8a',
                                        border: '1px solid #93c5fd',
                                        fontWeight: '600'
                                      }}>
                                        {proj.domain}
                                      </span>
                                    )}
                                    {proj.complexity_level && (
                                      <span style={{
                                        fontSize: '11px',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        background: '#f0fdf4',
                                        color: '#14532d',
                                        border: '1px solid #bbf7d0',
                                        fontWeight: '600'
                                      }}>
                                        {proj.complexity_level}
                                      </span>
                                    )}
                                    <div style={{
                                      textAlign: 'right',
                                      minWidth: '80px'
                                    }}>
                                      <p style={{
                                        fontSize: '11px',
                                        color: '#64748b',
                                        margin: '0 0 2px 0'
                                      }}>
                                        Relevance
                                      </p>
                                      <p style={{
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: '#d97706',
                                        margin: 0
                                      }}>
                                        {typeof proj.relevance_score === "number" ? proj.relevance_score : 0}
                                        <span style={{
                                          fontSize: '11px',
                                          color: '#64748b',
                                          marginLeft: '2px'
                                        }}>
                                          /100
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Technologies & role mapping */}
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '16px'
                                }}>
                                  <div style={{
                                    flex: 1,
                                    minWidth: '200px'
                                  }}>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Technologies
                                    </p>
                                    <div style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '6px'
                                    }}>
                                      {(proj.technologies || []).length > 0 ? (
                                        proj.technologies.map((t, tIdx) => (
                                          <span
                                            key={tIdx}
                                            style={{
                                              fontSize: '11px',
                                              padding: '4px 12px',
                                              borderRadius: '12px',
                                              background: '#f1f5f9',
                                              color: '#475569',
                                              border: '1px solid #e2e8f0'
                                            }}
                                          >
                                            {t}
                                          </span>
                                        ))
                                      ) : (
                                        <span style={{
                                          fontSize: '12px',
                                          color: '#94a3b8'
                                        }}>
                                          Not detected
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{
                                    flex: 1,
                                    minWidth: '200px'
                                  }}>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Mapped Roles
                                    </p>
                                    <div style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '6px'
                                    }}>
                                      {(proj.role_mapping || []).length > 0 ? (
                                        proj.role_mapping.map((r, rIdx) => (
                                          <span
                                            key={rIdx}
                                            style={{
                                              fontSize: '11px',
                                              padding: '4px 12px',
                                              borderRadius: '12px',
                                              background: '#dbeafe',
                                              color: '#1e3a8a',
                                              border: '1px solid #93c5fd'
                                            }}
                                          >
                                            {r}
                                          </span>
                                        ))
                                      ) : (
                                        <span style={{
                                          fontSize: '12px',
                                          color: '#94a3b8'
                                        }}>
                                          No specific mapping
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Problem, features, impact */}
                                {proj.problem_statement && (
                                  <div>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Problem Statement
                                    </p>
                                    <p style={{
                                      fontSize: '13px',
                                      color: '#475569',
                                      margin: 0
                                    }}>
                                      {proj.problem_statement}
                                    </p>
                                  </div>
                                )}

                                {proj.features && proj.features.length > 0 && (
                                  <div>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Key Features
                                    </p>
                                    <ul style={{
                                      margin: 0,
                                      padding: 0,
                                      paddingLeft: '16px',
                                      listStyle: 'disc'
                                    }}>
                                      {proj.features.map((f, fIdx) => (
                                        <li key={fIdx} style={{
                                          fontSize: '12px',
                                          color: '#475569',
                                          marginBottom: '2px'
                                        }}>
                                          {f}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {proj.impact && (
                                  <div>
                                    <p style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      marginBottom: '4px'
                                    }}>
                                      Impact
                                    </p>
                                    <p style={{
                                      fontSize: '13px',
                                      color: '#475569',
                                      margin: 0
                                    }}>
                                      {proj.impact}
                                    </p>
                                  </div>
                                )}

                                {/* Missing points & improvements */}
                                {(proj.missing_points && proj.missing_points.length > 0) ||
                                  (proj.recommended_improvements && proj.recommended_improvements.length > 0) ? (
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                    gap: '16px',
                                    marginTop: '4px'
                                  }}>
                                    {proj.missing_points && proj.missing_points.length > 0 && (
                                      <div>
                                        <p style={{
                                          fontSize: '12px',
                                          color: '#dc2626',
                                          marginBottom: '4px'
                                        }}>
                                          Missing Points
                                        </p>
                                        <ul style={{
                                          margin: 0,
                                          padding: 0,
                                          paddingLeft: '16px',
                                          listStyle: 'disc'
                                        }}>
                                          {proj.missing_points.map((m, mIdx) => (
                                            <li key={mIdx} style={{
                                              fontSize: '12px',
                                              color: '#ef4444',
                                              marginBottom: '2px'
                                            }}>
                                              {m}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {proj.recommended_improvements && proj.recommended_improvements.length > 0 && (
                                      <div>
                                        <p style={{
                                          fontSize: '12px',
                                          color: '#059669',
                                          marginBottom: '4px'
                                        }}>
                                          Recommended Improvements
                                        </p>
                                        <ul style={{
                                          margin: 0,
                                          padding: 0,
                                          paddingLeft: '16px',
                                          listStyle: 'disc'
                                        }}>
                                          {proj.recommended_improvements.map((imp, iIdx) => (
                                            <li key={iIdx} style={{
                                              fontSize: '12px',
                                              color: '#22c55e',
                                              marginBottom: '2px'
                                            }}>
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
                <Target size={24} style={{ color: '#1e3a5f' }} />
                ATS Compatibility Analysis
              </h2>

              {resumeData ? (
                <>
                  {/* ATS Score Gauge */}
                  <div style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '32px',
                    marginBottom: '24px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        color: '#64748b',
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
                              <stop offset="0%" stopColor="#1e3a5f" />
                              <stop offset="100%" stopColor="#15294a" />
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
                              { color: '#1e3a5f' })
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
                <Briefcase size={24} style={{ color: '#1e3a5f' }} />
                Recommended Roles
              </h2>

              {resumeData ? (
                <>
                  {resumeData.data?.role_match && (
                    <div style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '24px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <p style={{
                        color: '#475569',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        Suggested Role from Resume
                      </p>
                      <p style={{
                        color: '#1e3a5f',
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
                                background: '#1e3a5f',
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
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '14px',
                                color: '#475569',
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
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '24px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <p style={{
                        color: '#475569',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        AI-Detected Role
                      </p>
                      <p style={{
                        color: '#1e3a5f',
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
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '24px',
                      border: '1px solid #e2e8f0'
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
                        <TrendingUp size={20} style={{ color: '#1e3a5f' }} />
                        Suggested Skills to Strengthen Your {resumeData.detected_role || "Career"}
                      </h3>
                      <p style={{
                        color: '#64748b',
                        fontSize: '14px',
                        marginBottom: '16px'
                      }}>
                        Based on your current resume, here are additional skills recommended for your role:
                        <span style={{ fontWeight: '600', color: '#1e3a5f', marginLeft: '4px' }}>
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
                              background: '#1e3a5f',
                              color: 'white',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              fontSize: '14px',
                              fontWeight: '500'
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
                  <Briefcase size={48} style={{ color: '#1e3a5f', marginBottom: '16px', margin: '0 auto' }} />
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
                      {/* Header with Regenerate button */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: '#1e3a5f',
                        borderRadius: '8px',
                        padding: '20px 24px',
                        color: 'white'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Rocket size={28} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>
                              Your Personalized Learning Roadmap
                            </h3>
                            <p style={{ fontSize: '14px', opacity: 0.9, margin: '4px 0 0 0' }}>
                              Follow these steps to boost your career
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => fetchGuidance(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            padding: '10px 18px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            border: '1px solid rgba(255,255,255,0.2)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            backdropFilter: 'blur(4px)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255,255,255,0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255,255,255,0.2)';
                          }}
                        >
                          🔄 Regenerate
                        </button>
                      </div>

                      {/* Sub-Tab Navigation */}
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        background: '#f1f5f9',
                        padding: '8px',
                        borderRadius: '16px'
                      }}>
                        <button
                          onClick={() => setGuidanceSubTab('roadmap')}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '16px 24px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            background: guidanceSubTab === 'roadmap' 
                              ? '#1e3a5f' 
                              : 'transparent',
                            color: guidanceSubTab === 'roadmap' ? 'white' : '#64748b',
                            boxShadow: 'none'
                          }}
                        >
                          <Target size={20} />
                          Role-Based Roadmap
                          <span style={{
                            background: guidanceSubTab === 'roadmap' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700'
                          }}>I KNOW MY GOAL</span>
                        </button>
                        <button
                          onClick={() => setGuidanceSubTab('direction')}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '16px 24px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            background: guidanceSubTab === 'direction' 
                              ? '#1e3a5f' 
                              : 'transparent',
                            color: guidanceSubTab === 'direction' ? 'white' : '#64748b',
                            boxShadow: 'none'
                          }}
                        >
                          <Lightbulb size={20} />
                          Find Your Direction
                          <span style={{
                            background: guidanceSubTab === 'direction' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700'
                          }}>HELP ME DECIDE</span>
                        </button>
                      </div>

                      {/* TAB 1: Role Roadmap Generator */}
                      {guidanceSubTab === 'roadmap' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          {/* Role Roadmap Generator - Custom Role Learning Path */}
                      <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        border: '2px solid #8b5cf6',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.15)'
                      }}>
                        <div 
                          onClick={() => setExpandedSections(prev => ({ ...prev, roleRoadmap: !prev.roleRoadmap }))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '20px 24px',
                            background: '#f8fafc',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '8px',
                              background: '#1e3a5f',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Target size={24} color="white" />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                  Role Roadmap Generator
                                </h4>
                              </div>
                              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                                Enter your target role & get a personalized learning path
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                              background: '#1e3a5f',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              NEW
                            </span>
                            {expandedSections.roleRoadmap ? <ChevronUp size={24} color="#1e3a5f" /> : <ChevronDown size={24} color="#1e3a5f" />}
                          </div>
                        </div>
                        {(expandedSections.roleRoadmap !== false) && (
                          <div style={{ padding: '24px' }}>
                            {/* Input Section */}
                            <div style={{
                              background: '#f8fafc',
                              borderRadius: '8px',
                              padding: '20px',
                              marginBottom: '20px',
                              border: '1px solid #e2e8f0'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <Briefcase size={20} style={{ color: '#8b5cf6' }} />
                                <label style={{ fontWeight: '600', color: '#1e293b', fontSize: '15px' }}>
                                  What role do you want to become?
                                </label>
                              </div>
                              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <input
                                  type="text"
                                  value={targetRole}
                                  onChange={(e) => setTargetRole(e.target.value)}
                                  placeholder="e.g., Frontend Developer, Data Scientist, ML Engineer..."
                                  style={{
                                    flex: 1,
                                    minWidth: '250px',
                                    padding: '14px 18px',
                                    borderRadius: '10px',
                                    border: '2px solid #e2e8f0',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                                <button
                                  onClick={async () => {
                                    if (!targetRole.trim()) return;
                                    setRoadmapLoading(true);
                                    setRoadmapError(null);
                                    try {
                                      const currentSkills = guidance?.technical_skills?.map(s => s.name) || 
                                        resumeData?.data?.skills?.technical || [];
                                      const response = await fetch(`${API_BASE}/guidance/role-roadmap`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          target_role: targetRole,
                                          current_skills: currentSkills,
                                          experience_level: 'fresher'
                                        })
                                      });
                                      if (!response.ok) throw new Error('Failed to generate roadmap');
                                      const data = await response.json();
                                      setRoleRoadmap(data.roadmap);
                                    } catch (err) {
                                      setRoadmapError(err.message);
                                    } finally {
                                      setRoadmapLoading(false);
                                    }
                                  }}
                                  disabled={roadmapLoading || !targetRole.trim()}
                                  style={{
                                    padding: '14px 28px',
                                    borderRadius: '6px',
                                    background: roadmapLoading || !targetRole.trim() 
                                      ? '#e2e8f0' 
                                      : '#1e3a5f',
                                    color: roadmapLoading || !targetRole.trim() ? '#94a3b8' : 'white',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    border: 'none',
                                    cursor: roadmapLoading || !targetRole.trim() ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: 'none'
                                  }}
                                >
                                  {roadmapLoading ? (
                                    <>
                                      <div style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                      }} />
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Rocket size={18} />
                                      Generate Roadmap
                                    </>
                                  )}
                                </button>
                              </div>
                              
                              {/* Quick Role Suggestions */}
                              <div style={{ marginTop: '16px' }}>
                                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                                  Popular roles:
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Data Analyst'].map(role => (
                                    <button
                                      key={role}
                                      onClick={() => setTargetRole(role)}
                                      style={{
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        background: targetRole === role ? '#8b5cf6' : 'white',
                                        color: targetRole === role ? 'white' : '#64748b',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        border: `1px solid ${targetRole === role ? '#8b5cf6' : '#e2e8f0'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      {role}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Error Display */}
                            {roadmapError && (
                              <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                padding: '16px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <AlertCircle size={20} style={{ color: '#64748b' }} />
                                <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>{roadmapError}</p>
                              </div>
                            )}

                            {/* Roadmap Results */}
                            {roleRoadmap && !roadmapLoading && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Match Percentage & Overview */}
                                <div style={{
                                  background: '#1e3a5f',
                                  borderRadius: '8px',
                                  padding: '24px',
                                  color: 'white'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                    <div>
                                      <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>Target Role</p>
                                      <h3 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>
                                        {roleRoadmap.target_role}
                                      </h3>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        background: `conic-gradient(#64748b ${roleRoadmap.match_percentage}%, #1e293b ${roleRoadmap.match_percentage}%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative'
                                      }}>
                                        <div style={{
                                          width: '80px',
                                          height: '80px',
                                          borderRadius: '50%',
                                          background: '#1e3a5f',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexDirection: 'column'
                                        }}>
                                          <span style={{ fontSize: '24px', fontWeight: '700' }}>{roleRoadmap.match_percentage}%</span>
                                          <span style={{ fontSize: '10px', opacity: 0.8 }}>Ready</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>Estimated Time</p>
                                      <p style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                                        {roleRoadmap.estimated_timeline}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Skills Comparison */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                  {/* Skills You Have */}
                                  {Array.isArray(roleRoadmap.skills_you_have) && roleRoadmap.skills_you_have.length > 0 && (
                                    <div style={{
                                      background: 'white',
                                      borderRadius: '8px',
                                      padding: '20px',
                                      border: '1px solid #e2e8f0'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <CheckCircle size={22} style={{ color: '#1e3a5f' }} />
                                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1e3a5f', margin: 0 }}>
                                          Skills You Already Have ({roleRoadmap.skills_you_have.length})
                                        </h4>
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {roleRoadmap.skills_you_have.map((skill, idx) => (
                                          <span key={idx} style={{
                                            background: '#f8fafc',
                                            color: '#1e3a5f',
                                            padding: '8px 14px',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                          }}>
                                            <CheckCircle size={14} />
                                            {skill.name || skill}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Skills To Learn */}
                                  {Array.isArray(roleRoadmap.skills_to_learn) && roleRoadmap.skills_to_learn.length > 0 && (
                                    <div style={{
                                      background: 'white',
                                      borderRadius: '8px',
                                      padding: '20px',
                                      border: '1px solid #e2e8f0'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <BookOpen size={22} style={{ color: '#64748b' }} />
                                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                          Skills You Need to Learn ({roleRoadmap.skills_to_learn.length})
                                        </h4>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {roleRoadmap.skills_to_learn.slice(0, 8).map((skill, idx) => (
                                          <div key={idx} style={{
                                            background: '#f8fafc',
                                            padding: '12px 14px',
                                            borderRadius: '6px',
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '10px'
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              <span style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '4px',
                                                background: '#1e3a5f',
                                                color: 'white',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                              }}>
                                                {idx + 1}
                                              </span>
                                              <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                                                {skill.name}
                                              </span>
                                            </div>
                                            <span style={{
                                              fontSize: '10px',
                                              padding: '3px 8px',
                                              borderRadius: '4px',
                                              background: '#f8fafc',
                                              color: '#64748b',
                                              fontWeight: '600',
                                              textTransform: 'uppercase',
                                              border: '1px solid #e2e8f0'
                                            }}>
                                              {skill.priority || 'Required'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Learning Roadmap Phases */}
                                {Array.isArray(roleRoadmap.roadmap_phases) && roleRoadmap.roadmap_phases.length > 0 && (
                                  <div style={{
                                    background: 'white',
                                    borderRadius: '8px',
                                    padding: '24px',
                                    border: '1px solid #e2e8f0'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                      <div style={{
                                        background: '#1e3a5f',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        display: 'flex'
                                      }}>
                                        <GitBranch size={22} color="white" />
                                      </div>
                                      <div>
                                        <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                          Your Learning Roadmap
                                        </h4>
                                        <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                                          Follow these phases step by step
                                        </p>
                                      </div>
                                    </div>

                                    <div style={{ position: 'relative' }}>
                                      {/* Vertical line */}
                                      <div style={{
                                        position: 'absolute',
                                        left: '24px',
                                        top: '0',
                                        bottom: '0',
                                        width: '2px',
                                        background: '#e2e8f0',
                                        borderRadius: '4px'
                                      }} />

                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {roleRoadmap.roadmap_phases.map((phase, idx) => {
                                          return (
                                            <div key={idx} style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1 }}>
                                              {/* Phase number circle */}
                                              <div style={{
                                                width: '50px',
                                                height: '50px',
                                                borderRadius: '50%',
                                                background: '#1e3a5f',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                border: '3px solid white'
                                              }}>
                                                <span style={{ color: 'white', fontWeight: '700', fontSize: '18px' }}>
                                                  {phase.phase || idx + 1}
                                                </span>
                                              </div>
                                              
                                              {/* Phase content */}
                                              <div style={{
                                                flex: 1,
                                                background: '#f8fafc',
                                                borderRadius: '8px',
                                                padding: '20px',
                                                border: '1px solid #e2e8f0'
                                              }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                                                  <div>
                                                    <h5 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                                      {phase.title}
                                                    </h5>
                                                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                                                      {phase.focus}
                                                    </p>
                                                  </div>
                                                  <span style={{
                                                    background: 'white',
                                                    color: '#1e3a5f',
                                                    padding: '6px 14px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    border: '1px solid #e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                  }}>
                                                    <Clock size={14} />
                                                    {phase.duration}
                                                  </span>
                                                </div>

                                                {/* Skills to learn in this phase */}
                                                {Array.isArray(phase.skills) && phase.skills.length > 0 && (
                                                  <div style={{ marginBottom: '16px' }}>
                                                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#1e3a5f', marginBottom: '8px' }}>
                                                      Skills to Master:
                                                    </p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                      {phase.skills.map((skill, i) => (
                                                        <span key={i} style={{
                                                          background: 'white',
                                                          color: '#1e3a5f',
                                                          padding: '6px 12px',
                                                          borderRadius: '4px',
                                                          fontSize: '12px',
                                                          fontWeight: '500',
                                                          border: '1px solid #e2e8f0'
                                                        }}>
                                                          {skill}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Action items */}
                                                {Array.isArray(phase.action_items) && phase.action_items.length > 0 && (
                                                  <div style={{ marginBottom: '12px' }}>
                                                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#1e3a5f', marginBottom: '8px' }}>
                                                      Action Items:
                                                    </p>
                                                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                                      {phase.action_items.map((item, i) => (
                                                        <li key={i} style={{
                                                          display: 'flex',
                                                          alignItems: 'flex-start',
                                                          gap: '8px',
                                                          fontSize: '13px',
                                                          color: '#475569',
                                                          marginBottom: '6px',
                                                          background: 'white',
                                                          padding: '8px 12px',
                                                          borderRadius: '4px'
                                                        }}>
                                                          <span style={{ color: '#1e3a5f' }}>•</span>
                                                          {item}
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}

                                                {/* Milestone */}
                                                {phase.milestone && (
                                                  <div style={{
                                                    background: 'white',
                                                    padding: '12px 16px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px'
                                                  }}>
                                                    <Trophy size={18} style={{ color: '#1e3a5f' }} />
                                                    <div>
                                                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Milestone</p>
                                                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                                                        {phase.milestone}
                                                      </p>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Project Ideas */}
                                {Array.isArray(roleRoadmap.projects) && roleRoadmap.projects.length > 0 && (
                                  <div style={{
                                    background: 'white',
                                    borderRadius: '8px',
                                    padding: '24px',
                                    border: '1px solid #e2e8f0'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                      <Lightbulb size={24} style={{ color: '#1e3a5f' }} />
                                      <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                        Project Ideas to Build
                                      </h4>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                      {roleRoadmap.projects.map((project, idx) => {
                                        return (
                                          <div key={idx} style={{
                                            background: '#f8fafc',
                                            borderRadius: '8px',
                                            padding: '18px',
                                            border: '1px solid #e2e8f0'
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                              <span style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '6px',
                                                background: '#1e3a5f',
                                                color: 'white',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                              }}>
                                                {idx + 1}
                                              </span>
                                              <h5 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                                {project.title}
                                              </h5>
                                            </div>
                                            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', lineHeight: '1.5' }}>
                                              {project.description}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                              <span style={{
                                                background: 'white',
                                                color: '#64748b',
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                textTransform: 'capitalize',
                                                border: '1px solid #e2e8f0'
                                              }}>
                                                {project.difficulty}
                                              </span>
                                              {project.duration && (
                                                <span style={{
                                                  background: 'white',
                                                  color: '#64748b',
                                                  padding: '4px 10px',
                                                  borderRadius: '4px',
                                                  fontSize: '11px',
                                                  fontWeight: '500',
                                                  border: '1px solid #e2e8f0'
                                                }}>
                                                  {project.duration}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Tips */}
                                {Array.isArray(roleRoadmap.tips) && roleRoadmap.tips.length > 0 && (
                                  <div style={{
                                    background: '#fffbeb',
                                    borderRadius: '14px',
                                    padding: '20px',
                                    border: '2px solid #f59e0b'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                      <Star size={20} style={{ color: '#f59e0b' }} />
                                      <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#92400e', margin: 0 }}>
                                        💡 Pro Tips for Success
                                      </h4>
                                    </div>
                                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {roleRoadmap.tips.map((tip, idx) => (
                                        <li key={idx} style={{
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          gap: '10px',
                                          background: 'white',
                                          padding: '12px 16px',
                                          borderRadius: '6px',
                                          border: '1px solid #e2e8f0',
                                          fontSize: '13px',
                                          color: '#475569'
                                        }}>
                                          <span>•</span>
                                          {tip}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      </div>
                      )}

                      {/* TAB 2: Find Your Direction - 7 Step Guidance */}
                      {guidanceSubTab === 'direction' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          {/* Intro Card for Direction Tab */}
                          <div style={{
                            background: '#1e3a5f',
                            borderRadius: '8px',
                            padding: '24px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px'
                          }}>
                            <div style={{
                              background: 'rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              padding: '16px',
                              display: 'flex'
                            }}>
                              <Lightbulb size={32} />
                            </div>
                            <div>
                              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 6px 0' }}>
                                Not Sure Which Role is Right for You?
                              </h3>
                              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                                Follow these 7 steps to discover your ideal career path based on your skills, interests, and goals.
                              </p>
                            </div>
                          </div>

                      {/* Step 1: Career Clarity Summary - Your Direction */}
                      {guidance.career_clarity_summary && (
                        <div style={{
                          background: 'white',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden'
                        }}>
                          <div 
                            onClick={() => setExpandedSections(prev => ({ ...prev, career: !prev.career }))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '20px 24px',
                              background: '#f8fafc',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                background: '#1e3a5f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '18px'
                              }}>
                                1
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <Target size={20} style={{ color: '#1e3a5f' }} />
                                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                    Know Your Direction
                                  </h4>
                                </div>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                                  Understand your career alignment & best-fit roles
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                background: '#1e3a5f',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                START HERE
                              </span>
                              {expandedSections.career ? <ChevronUp size={24} color="#1e3a5f" /> : <ChevronDown size={24} color="#1e3a5f" />}
                            </div>
                          </div>
                          {(expandedSections.career !== false) && (
                            <div style={{ padding: '24px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                {/* Primary Alignment */}
                                <div style={{
                                  background: '#f8fafc',
                                  borderRadius: '8px',
                                  padding: '20px',
                                  border: '1px solid #e2e8f0'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <div style={{
                                      background: '#1e3a5f',
                                      borderRadius: '6px',
                                      padding: '8px',
                                      display: 'flex'
                                    }}>
                                      <Briefcase size={18} color="white" />
                                    </div>
                                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                                      Your Primary Track
                                    </span>
                                  </div>
                                  <p style={{ 
                                    fontSize: '20px', 
                                    fontWeight: '700', 
                                    color: '#1e3a5f', 
                                    margin: 0,
                                    lineHeight: '1.3'
                                  }}>
                                    {guidance.career_clarity_summary.primary_alignment}
                                  </p>
                                </div>

                                {/* Best Fit Roles */}
                                {Array.isArray(guidance.career_clarity_summary.aligned_roles) && guidance.career_clarity_summary.aligned_roles.length > 0 && (
                                  <div style={{
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    border: '1px solid #e2e8f0'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                      <div style={{
                                        background: '#1e3a5f',
                                        borderRadius: '6px',
                                        padding: '8px',
                                        display: 'flex'
                                      }}>
                                        <CheckCircle size={18} color="white" />
                                      </div>
                                      <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                                        Best Fit Roles For You
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                      {guidance.career_clarity_summary.aligned_roles.map((role, idx) => (
                                        <span key={idx} style={{
                                          background: 'white',
                                          color: '#1e3a5f',
                                          padding: '8px 14px',
                                          borderRadius: '4px',
                                          fontSize: '13px',
                                          fontWeight: '600',
                                          border: '1px solid #e2e8f0',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px'
                                        }}>
                                          <Star size={14} /> {role}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Roles to Avoid */}
                                {Array.isArray(guidance.career_clarity_summary.roles_to_avoid) && guidance.career_clarity_summary.roles_to_avoid.length > 0 && (
                                  <div style={{
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    border: '1px solid #e2e8f0'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                      <div style={{
                                        background: '#64748b',
                                        borderRadius: '6px',
                                        padding: '8px',
                                        display: 'flex'
                                      }}>
                                        <AlertCircle size={18} color="white" />
                                      </div>
                                      <span style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>
                                        Not Recommended For You
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                      {guidance.career_clarity_summary.roles_to_avoid.map((role, idx) => (
                                        <span key={idx} style={{
                                          background: 'white',
                                          color: '#64748b',
                                          padding: '8px 14px',
                                          borderRadius: '4px',
                                          fontSize: '13px',
                                          fontWeight: '500',
                                          border: '1px solid #e2e8f0',
                                          textDecoration: 'line-through',
                                          opacity: 0.8
                                        }}>
                                          {role}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {guidance.career_clarity_summary.reasoning && (
                                <div style={{
                                  marginTop: '16px',
                                  padding: '16px',
                                  background: '#f8fafc',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '12px'
                                }}>
                                  <Lightbulb size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                                  <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.6' }}>
                                    {guidance.career_clarity_summary.reasoning}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 2: Your Current Skills Assessment */}
                      {Array.isArray(guidance.technical_skills) && guidance.technical_skills.length > 0 && (
                        <div style={{
                          background: 'white',
                          borderRadius: '16px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div 
                            onClick={() => setExpandedSections(prev => ({ ...prev, skills: !prev.skills }))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '20px 24px',
                              background: '#f8fafc',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: '#1e3a5f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '18px',
                                boxShadow: '0 2px 6px rgba(30, 58, 95, 0.2)'
                              }}>
                                2
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <Code size={20} style={{ color: '#1e3a5f' }} />
                                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a5f', margin: 0 }}>
                                    Your Current Skills Assessment
                                  </h4>
                                </div>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                                  {guidance.technical_skills.length} skills identified • See your proficiency levels
                                </p>
                              </div>
                            </div>
                            {expandedSections.skills ? <ChevronUp size={24} color="#0ea5e9" /> : <ChevronDown size={24} color="#0ea5e9" />}
                          </div>
                          {(expandedSections.skills !== false) && (
                            <div style={{ padding: '24px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {guidance.technical_skills.map((s, idx) => {
                                  const levelColors = {
                                    'beginner': { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', icon: '' },
                                    'intermediate': { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', icon: '' },
                                    'advanced': { bg: '#f8fafc', border: '#e2e8f0', color: '#1e3a5f', icon: '' },
                                    'expert': { bg: '#f8fafc', border: '#1e3a5f', color: '#1e3a5f', icon: '' },
                                  };
                                  const levelColor = levelColors[s.level?.toLowerCase()] || levelColors['intermediate'];
                                  
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        padding: '12px 18px',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        border: `2px solid ${levelColor.border}`,
                                        background: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        boxShadow: `0 2px 8px ${levelColor.border}20`,
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      <span style={{ fontSize: '16px' }}>{levelColor.icon}</span>
                                      <span style={{ fontWeight: '600', color: '#1e293b' }}>{s.name}</span>
                                      {s.level && (
                                        <span style={{
                                          fontSize: '11px',
                                          padding: '4px 10px',
                                          borderRadius: '20px',
                                          background: levelColor.bg,
                                          color: levelColor.color,
                                          fontWeight: '600',
                                          textTransform: 'capitalize'
                                        }}>
                                          {s.level}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Skill Level Legend */}
                              <div style={{
                                marginTop: '20px',
                                padding: '16px',
                                background: '#f8fafc',
                                borderRadius: '10px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '16px',
                                justifyContent: 'center'
                              }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Skill Levels:</span>
                                <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>Beginner</span>
                                <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>Intermediate</span>
                                <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>Advanced</span>
                                <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>Expert</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 3: Skills You Need to Learn */}
                      {Array.isArray(guidance.missing_skills) && guidance.missing_skills.length > 0 && (
                        <div style={{
                          background: 'white',
                          borderRadius: '16px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div 
                            onClick={() => setExpandedSections(prev => ({ ...prev, missing: !prev.missing }))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '20px 24px',
                              background: '#f8fafc',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: '#1e3a5f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '18px',
                                boxShadow: '0 2px 6px rgba(30, 58, 95, 0.2)'
                              }}>
                                3
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <BookOpen size={20} style={{ color: '#1e3a5f' }} />
                                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a5f', margin: 0 }}>
                                    Skills You Need to Learn
                                  </h4>
                                </div>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                                  {guidance.missing_skills.length} essential skills to boost your profile
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                background: '#1e3a5f',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                ACTION NEEDED
                              </span>
                              {expandedSections.missing ? <ChevronUp size={24} color="#1e3a5f" /> : <ChevronDown size={24} color="#1e3a5f" />}
                            </div>
                          </div>
                          {(expandedSections.missing !== false) && (
                            <div style={{ padding: '24px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {guidance.missing_skills.map((ms, idx) => (
                                  <div key={idx} style={{
                                    display: 'flex',
                                    gap: '16px',
                                    padding: '16px',
                                    background: idx % 2 === 0 ? '#f8fafc' : 'white',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    alignItems: 'flex-start',
                                    transition: 'all 0.2s ease'
                                  }}>
                                    <div style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '10px',
                                      background: '#1e3a5f',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontWeight: '700',
                                      fontSize: '14px',
                                      flexShrink: 0
                                    }}>
                                      {idx + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <Zap size={16} style={{ color: '#1e3a5f' }} />
                                        <span style={{
                                          fontWeight: '700',
                                          color: '#1e293b',
                                          fontSize: '15px'
                                        }}>
                                          {ms.name}
                                        </span>
                                      </div>
                                      <p style={{
                                        fontSize: '13px',
                                        color: '#475569',
                                        margin: 0,
                                        lineHeight: '1.5',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px'
                                      }}>
                                        <ArrowRight size={14} style={{ marginTop: '3px', flexShrink: 0 }} />
                                        {ms.reason}
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCompletedSteps(prev => ({ 
                                          ...prev, 
                                          [`skill_${idx}`]: !prev[`skill_${idx}`] 
                                        }));
                                      }}
                                      style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        border: completedSteps[`skill_${idx}`] ? '2px solid #22c55e' : '2px solid #d1d5db',
                                        background: completedSteps[`skill_${idx}`] ? '#22c55e' : 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      {completedSteps[`skill_${idx}`] && <CheckCircle size={18} color="white" />}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 4: Your Learning Path */}
                      {Array.isArray(guidance.learning_paths) && guidance.learning_paths.length > 0 && (
                        <div style={{
                          background: 'white',
                          borderRadius: '16px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div 
                            onClick={() => setExpandedSections(prev => ({ ...prev, learning: !prev.learning }))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '20px 24px',
                              background: '#f8fafc',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: '#1e3a5f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '18px',
                                boxShadow: '0 2px 6px rgba(30, 58, 95, 0.2)'
                              }}>
                                4
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <GraduationCap size={20} style={{ color: '#1e3a5f' }} />
                                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a5f', margin: 0 }}>
                                    Step-by-Step Learning Path
                                  </h4>
                                </div>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                                  Follow this roadmap to master your skills
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                background: '#1e3a5f',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                ROADMAP
                              </span>
                              {expandedSections.learning ? <ChevronUp size={24} color="#1e3a5f" /> : <ChevronDown size={24} color="#1e3a5f" />}
                            </div>
                          </div>
                          {(expandedSections.learning !== false) && (
                            <div style={{ padding: '24px' }}>
                              {guidance.learning_paths.map((lp, lpIdx) => (
                                <div key={lpIdx} style={{ marginBottom: lpIdx < guidance.learning_paths.length - 1 ? '24px' : 0 }}>
                                  {/* Track Header */}
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px 20px',
                                    background: '#1e3a5f',
                                    borderRadius: '12px 12px 0 0',
                                    color: 'white'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <Layers size={24} />
                                      <div>
                                        <h5 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                                          {lp.track}
                                        </h5>
                                        <p style={{ fontSize: '12px', opacity: 0.9, margin: '2px 0 0 0' }}>
                                          Learning Track {lpIdx + 1}
                                        </p>
                                      </div>
                                    </div>
                                    {typeof lp.estimated_time_weeks === 'number' && (
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(255,255,255,0.2)',
                                        padding: '8px 14px',
                                        borderRadius: '20px'
                                      }}>
                                        <Clock size={16} />
                                        <span style={{ fontWeight: '600', fontSize: '13px' }}>
                                          ~{lp.estimated_time_weeks} weeks
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Learning Steps Container */}
                                  <div style={{
                                    background: '#f8fafc',
                                    borderRadius: '0 0 12px 12px',
                                    padding: '20px',
                                    border: '1px solid #e2e8f0',
                                    borderTop: 'none'
                                  }}>
                                    {/* Topics Section */}
                                    {Array.isArray(lp.topics) && lp.topics.length > 0 && (
                                      <div style={{ marginBottom: '20px' }}>
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          marginBottom: '14px'
                                        }}>
                                          <div style={{
                                            background: '#7c3aed',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            display: 'flex'
                                          }}>
                                            <BookOpen size={18} color="white" />
                                          </div>
                                          <span style={{ fontWeight: '700', color: '#1e3a5f', fontSize: '15px' }}>
                                            Topics to Master (in order)
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px' }}>
                                          {lp.topics.map((topic, tIdx) => (
                                            <div
                                              key={tIdx} 
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '14px',
                                                padding: '12px 16px',
                                                background: 'white',
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0',
                                                position: 'relative'
                                              }}
                                            >
                                              <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                background: completedSteps[`topic_${lpIdx}_${tIdx}`] 
                                                  ? '#1e3a5f'
                                                  : '#1e3a5f',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: '700',
                                                fontSize: '13px',
                                                flexShrink: 0
                                              }}>
                                                {completedSteps[`topic_${lpIdx}_${tIdx}`] ? '✓' : tIdx + 1}
                                              </div>
                                              <div style={{ flex: 1 }}>
                                                <span style={{ 
                                                  fontWeight: '600', 
                                                  color: '#1e293b', 
                                                  fontSize: '14px',
                                                  textDecoration: completedSteps[`topic_${lpIdx}_${tIdx}`] ? 'line-through' : 'none',
                                                  opacity: completedSteps[`topic_${lpIdx}_${tIdx}`] ? 0.7 : 1
                                                }}>
                                                  {topic}
                                                </span>
                                              </div>
                                              <button
                                                onClick={() => setCompletedSteps(prev => ({
                                                  ...prev,
                                                  [`topic_${lpIdx}_${tIdx}`]: !prev[`topic_${lpIdx}_${tIdx}`]
                                                }))}
                                                style={{
                                                  width: '28px',
                                                  height: '28px',
                                                  borderRadius: '6px',
                                                  border: completedSteps[`topic_${lpIdx}_${tIdx}`] 
                                                    ? '2px solid #1e3a5f' 
                                                    : '2px solid #d1d5db',
                                                  background: completedSteps[`topic_${lpIdx}_${tIdx}`] 
                                                    ? '#1e3a5f' 
                                                    : 'white',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  transition: 'all 0.2s ease'
                                                }}
                                              >
                                                {completedSteps[`topic_${lpIdx}_${tIdx}`] && (
                                                  <CheckCircle size={16} color="white" />
                                                )}
                                              </button>
                                              {tIdx < lp.topics.length - 1 && (
                                                <div style={{
                                                  position: 'absolute',
                                                  left: '23px',
                                                  bottom: '-12px',
                                                  width: '2px',
                                                  height: '12px',
                                                  background: '#e2e8f0',
                                                  zIndex: 1
                                                }} />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Tools & Exercises Grid */}
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                      gap: '16px'
                                    }}>
                                      {/* Tools */}
                                      {Array.isArray(lp.tools) && lp.tools.length > 0 && (
                                        <div style={{
                                          background: 'white',
                                          borderRadius: '12px',
                                          padding: '16px',
                                          border: '1px solid #c4b5fd'
                                        }}>
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '12px'
                                          }}>
                                            <Wrench size={18} style={{ color: '#7c3aed' }} />
                                            <span style={{ fontWeight: '700', color: '#5b21b6', fontSize: '14px' }}>
                                              🔧 Tools You'll Need
                                            </span>
                                          </div>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {lp.tools.map((tool, i) => (
                                              <span key={i} style={{
                                                background: '#f3e8ff',
                                                color: '#7c3aed',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                border: '1px solid #ddd6fe'
                                              }}>
                                                {tool}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Exercises */}
                                      {Array.isArray(lp.exercises) && lp.exercises.length > 0 && (
                                        <div style={{
                                          background: '#fffbeb',
                                          borderRadius: '12px',
                                          padding: '16px',
                                          border: '1px solid #fde68a'
                                        }}>
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '12px'
                                          }}>
                                            <Zap size={18} style={{ color: '#d97706' }} />
                                            <span style={{ fontWeight: '700', color: '#92400e', fontSize: '14px' }}>
                                              ⚡ Practice Exercises
                                            </span>
                                          </div>
                                          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                            {lp.exercises.map((ex, i) => (
                                              <li key={i} style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '8px',
                                                fontSize: '13px',
                                                color: '#78350f',
                                                marginBottom: '8px'
                                              }}>
                                                <PlayCircle size={14} style={{ marginTop: '3px', flexShrink: 0 }} />
                                                {ex}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>

                                    {/* Projects */}
                                    {Array.isArray(lp.projects) && lp.projects.length > 0 && (
                                      <div style={{
                                        marginTop: '16px',
                                        background: '#f0fdf4',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        border: '1px solid #bbf7d0'
                                      }}>
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          marginBottom: '12px'
                                        }}>
                                          <FolderOpen size={18} style={{ color: '#1e3a5f' }} />
                                          <span style={{ fontWeight: '700', color: '#1e3a5f', fontSize: '14px' }}>
                                            Build These Projects
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                          {lp.projects.map((proj, i) => (
                                            <div key={i} style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              background: 'white',
                                              padding: '10px 14px',
                                              borderRadius: '8px',
                                              border: '1px solid #86efac',
                                              fontSize: '13px',
                                              color: '#14532d',
                                              fontWeight: '500'
                                            }}>
                                              <Rocket size={14} />
                                              {proj}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 5: Project Ideas */}
                      {Array.isArray(guidance.project_ideas) && guidance.project_ideas.length > 0 && (
                        <div style={{
                          background: 'white',
                          borderRadius: '16px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div 
                            onClick={() => setExpandedSections(prev => ({ ...prev, projects: !prev.projects }))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '20px 24px',
                              background: '#f8fafc',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: '#1e3a5f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '18px',
                                boxShadow: '0 2px 6px rgba(30, 58, 95, 0.2)'
                              }}>
                                5
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <Lightbulb size={20} style={{ color: '#1e3a5f' }} />
                                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a5f', margin: 0 }}>
                                    Project Ideas to Build
                                  </h4>
                                </div>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                                  Build these to showcase your skills to employers
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                background: '#1e3a5f',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                PORTFOLIO
                              </span>
                              {expandedSections.projects ? <ChevronUp size={24} color="#1e3a5f" /> : <ChevronDown size={24} color="#1e3a5f" />}
                            </div>
                          </div>
                          {(expandedSections.projects !== false) && (
                            <div style={{ padding: '24px' }}>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '16px'
                              }}>
                                {guidance.project_ideas.map((p, idx) => {
                                  const projectColors = [
                                    { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                    { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                    { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                    { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                    { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                  ];
                                  const color = projectColors[idx % projectColors.length];
                                  
                                  return (
                                    <div key={idx} style={{
                                      border: `1px solid ${color.border}`,
                                      borderRadius: '14px',
                                      padding: '18px',
                                      background: 'white',
                                      boxShadow: `0 4px 12px ${color.border}20`,
                                      position: 'relative',
                                      overflow: 'hidden',
                                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                    }}>
                                      {/* Decorative corner */}
                                      <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        width: '60px',
                                        height: '60px',
                                        background: color.bg,
                                        borderRadius: '0 0 0 60px',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'flex-end',
                                        padding: '8px'
                                      }}>
                                        <span style={{ fontSize: '20px' }}>{color.icon}</span>
                                      </div>
                                      
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        marginBottom: '12px'
                                      }}>
                                        <div style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '6px',
                                          background: '#1e3a5f',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'white',
                                          fontWeight: '700',
                                          fontSize: '14px'
                                        }}>
                                          {idx + 1}
                                        </div>
                                        <p style={{
                                          color: '#1e293b',
                                          fontWeight: '700',
                                          fontSize: '15px',
                                          margin: 0,
                                          paddingRight: '40px',
                                          flex: 1
                                        }}>
                                          {p.title}
                                        </p>
                                      </div>
                                      
                                      {p.type && (
                                        <span style={{
                                          display: 'inline-block',
                                          background: color.bg,
                                          color: color.accent,
                                          padding: '4px 12px',
                                          borderRadius: '6px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          marginBottom: '10px',
                                          border: `1px solid ${color.border}`,
                                          textTransform: 'uppercase'
                                        }}>
                                          {p.type}
                                        </span>
                                      )}
                                      
                                      {p.description && (
                                        <p style={{
                                          fontSize: '13px',
                                          color: '#475569',
                                          margin: 0,
                                          lineHeight: '1.6'
                                        }}>
                                          {p.description}
                                        </p>
                                      )}
                                      
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCompletedSteps(prev => ({
                                            ...prev,
                                            [`project_${idx}`]: !prev[`project_${idx}`]
                                          }));
                                        }}
                                        style={{
                                          marginTop: '14px',
                                          width: '100%',
                                          padding: '10px',
                                          borderRadius: '8px',
                                          border: completedSteps[`project_${idx}`] 
                                            ? '2px solid #22c55e' 
                                            : `2px solid ${color.border}`,
                                          background: completedSteps[`project_${idx}`] 
                                            ? '#22c55e' 
                                            : 'white',
                                          color: completedSteps[`project_${idx}`] 
                                            ? 'white' 
                                            : color.accent,
                                          fontWeight: '600',
                                          fontSize: '13px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '8px',
                                          transition: 'all 0.2s ease'
                                        }}
                                      >
                                        {completedSteps[`project_${idx}`] ? (
                                          <>
                                            <CheckCircle size={16} />
                                            Completed!
                                          </>
                                        ) : (
                                          <>
                                            <PlayCircle size={16} />
                                            Mark as Built
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 6: Certifications */}
                      {Array.isArray(guidance.certificate_recommendations) && guidance.certificate_recommendations.length > 0 && (
                        <div style={{
                          background: 'white',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden'
                        }}>
                          <div 
                            onClick={() => setExpandedSections(prev => ({ ...prev, certs: !prev.certs }))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '20px 24px',
                              background: '#f8fafc',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                background: '#1e3a5f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '18px'
                              }}>
                                6
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <Award size={20} style={{ color: '#1e3a5f' }} />
                                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                    Recommended Certifications
                                  </h4>
                                </div>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                                  Boost your resume with these credentials
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                background: '#f59e0b',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                CREDENTIALS
                              </span>
                              {expandedSections.certs ? <ChevronUp size={24} color="#f59e0b" /> : <ChevronDown size={24} color="#f59e0b" />}
                            </div>
                          </div>
                          {(expandedSections.certs !== false) && (
                            <div style={{ padding: '24px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {guidance.certificate_recommendations.map((cert, idx) => {
                                  const isPursue = cert.recommendation?.toLowerCase() === 'pursue';
                                  const valueColors = {
                                    'high': { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
                                    'medium': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
                                    'low': { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' }
                                  };
                                  const valueColor = valueColors[cert.value_level?.toLowerCase()] || valueColors['medium'];
                                  
                                  return (
                                    <div key={idx} style={{
                                      display: 'flex',
                                      gap: '16px',
                                      padding: '16px',
                                      background: '#f8fafc',
                                      borderRadius: '8px',
                                      border: '1px solid #e2e8f0',
                                      alignItems: 'flex-start'
                                    }}>
                                      <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        background: '#1e3a5f',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}>
                                        {isPursue ? (
                                          <Trophy size={20} color="white" />
                                        ) : (
                                          <AlertCircle size={20} color="white" />
                                        )}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          flexWrap: 'wrap',
                                          marginBottom: '6px'
                                        }}>
                                          <span style={{
                                            fontWeight: '700',
                                            fontSize: '15px',
                                            color: '#1e293b'
                                          }}>
                                            {cert.name}
                                          </span>
                                          <span style={{
                                            fontSize: '10px',
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            background: valueColor.bg,
                                            color: valueColor.text,
                                            border: `1px solid ${valueColor.border}`,
                                            fontWeight: '600',
                                            textTransform: 'uppercase'
                                          }}>
                                            {cert.value_level} Value
                                          </span>
                                          <span style={{
                                            fontSize: '10px',
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            background: isPursue ? '#22c55e' : '#ef4444',
                                            color: 'white',
                                            fontWeight: '600',
                                            textTransform: 'uppercase'
                                          }}>
                                            {isPursue ? '✓ PURSUE' : '✗ AVOID'}
                                          </span>
                                        </div>
                                        {cert.reason && (
                                          <p style={{
                                            fontSize: '13px',
                                            color: isPursue ? '#15803d' : '#b91c1c',
                                            margin: 0,
                                            lineHeight: '1.5'
                                          }}>
                                            {cert.reason}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 7: Weekly Schedule - Your Action Plan */}
                      {Array.isArray(guidance.weekly_schedule) && guidance.weekly_schedule.length > 0 && (
                        <div style={{
                          background: 'white',
                          borderRadius: '16px',
                          border: '2px solid #0ea5e9',
                          overflow: 'hidden',
                        }}>
                          <div 
                            onClick={() => setExpandedSections(prev => ({ ...prev, schedule: !prev.schedule }))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '20px 24px',
                              background: '#f8fafc',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                background: '#1e3a5f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '18px'
                              }}>
                                7
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <Calendar size={20} style={{ color: '#1e3a5f' }} />
                                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                    {guidance.weekly_schedule.length}-Week Action Plan
                                  </h4>
                                </div>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                                  Your week-by-week learning schedule
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                background: '#1e3a5f',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                SCHEDULE
                              </span>
                              {expandedSections.schedule ? <ChevronUp size={24} color="#0ea5e9" /> : <ChevronDown size={24} color="#0ea5e9" />}
                            </div>
                          </div>
                          {(expandedSections.schedule !== false) && (
                            <div style={{ padding: '24px' }}>
                              {/* Timeline container */}
                              <div style={{ position: 'relative' }}>
                                {/* Vertical line */}
                                <div style={{
                                  position: 'absolute',
                                  left: '24px',
                                  top: '0',
                                  bottom: '0',
                                  width: '3px',
                                  background: '#1e3a5f',
                                  borderRadius: '4px',
                                  zIndex: 0
                                }} />
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                  {guidance.weekly_schedule.map((w, idx) => {
                                    const weekColors = [
                                      { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                      { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                      { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                      { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                      { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                      { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                      { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                      { bg: '#f8fafc', border: '#e2e8f0', accent: '#1e3a5f', icon: '' },
                                    ];
                                    const color = weekColors[idx % weekColors.length];
                                    
                                    return (
                                      <div key={idx} style={{
                                        display: 'flex',
                                        gap: '20px',
                                        position: 'relative',
                                        zIndex: 1
                                      }}>
                                        {/* Week number circle */}
                                        <div style={{
                                          width: '50px',
                                          height: '50px',
                                          borderRadius: '50%',
                                          background: completedSteps[`week_${idx}`] 
                                            ? '#1e3a5f'
                                            : '#1e3a5f',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                          boxShadow: '0 2px 6px rgba(30, 58, 95, 0.2)',
                                          border: '3px solid white',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => setCompletedSteps(prev => ({
                                          ...prev,
                                          [`week_${idx}`]: !prev[`week_${idx}`]
                                        }))}
                                        >
                                          {completedSteps[`week_${idx}`] ? (
                                            <CheckCircle size={24} color="white" />
                                          ) : (
                                            <span style={{
                                              color: 'white',
                                              fontWeight: '700',
                                              fontSize: '16px'
                                            }}>
                                              W{w.week || idx + 1}
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Week content card */}
                                        <div style={{
                                          flex: 1,
                                          background: 'white',
                                          borderRadius: '16px',
                                          padding: '20px',
                                          border: completedSteps[`week_${idx}`] ? '1px solid #1e3a5f' : '1px solid #e2e8f0',
                                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                                          transition: 'all 0.3s ease',
                                          opacity: completedSteps[`week_${idx}`] ? 0.85 : 1
                                        }}>
                                          {/* Week header */}
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '16px',
                                            paddingBottom: '12px',
                                            borderBottom: `2px dashed ${color.bg}`
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              <span style={{ fontSize: '24px' }}>{color.icon}</span>
                                              <div>
                                                <h4 style={{
                                                  fontSize: '18px',
                                                  fontWeight: '700',
                                                  color: color.accent,
                                                  margin: 0,
                                                  textDecoration: completedSteps[`week_${idx}`] ? 'line-through' : 'none'
                                                }}>
                                                  Week {w.week || idx + 1}
                                                </h4>
                                                <p style={{
                                                  fontSize: '14px',
                                                  color: '#64748b',
                                                  margin: '2px 0 0 0',
                                                  fontWeight: '500'
                                                }}>
                                                  {w.focus}
                                                </p>
                                              </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              {completedSteps[`week_${idx}`] && (
                                                <span style={{
                                                  background: '#22c55e',
                                                  color: 'white',
                                                  padding: '4px 10px',
                                                  borderRadius: '20px',
                                                  fontSize: '11px',
                                                  fontWeight: '600'
                                                }}>
                                                  ✓ DONE
                                                </span>
                                              )}
                                              <span style={{
                                                background: color.bg,
                                                color: color.accent,
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                border: `1px solid ${color.border}`
                                              }}>
                                                {idx === 0 ? 'Start Here!' : idx === guidance.weekly_schedule.length - 1 ? 'Final Week!' : `Week ${idx + 1}`}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {/* Content sections in grid */}
                                          <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                            gap: '16px'
                                          }}>
                                            {/* Topics */}
                                            {Array.isArray(w.topics) && w.topics.length > 0 && (
                                              <div style={{
                                                background: '#f8fafc',
                                                borderRadius: '12px',
                                                padding: '14px',
                                                border: '1px solid #e2e8f0'
                                              }}>
                                                <div style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '8px',
                                                  marginBottom: '10px'
                                                }}>
                                                  <BookOpen size={16} style={{ color: color.accent }} />
                                                  <p style={{
                                                    fontSize: '13px',
                                                    fontWeight: '700',
                                                    color: '#1e293b',
                                                    margin: 0
                                                  }}>
                                                    Topics to Learn
                                                  </p>
                                                </div>
                                                <ul style={{
                                                  margin: 0,
                                                  padding: 0,
                                                  listStyle: 'none',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  gap: '6px'
                                                }}>
                                                  {w.topics.map((t, i) => (
                                                    <li key={i} style={{
                                                      display: 'flex',
                                                      alignItems: 'flex-start',
                                                      gap: '8px',
                                                      fontSize: '13px',
                                                      color: '#475569'
                                                    }}>
                                                      <span style={{ color: color.border }}>▸</span>
                                                      <span>{t}</span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            
                                            {/* Practice Tasks */}
                                            {Array.isArray(w.practice_tasks) && w.practice_tasks.length > 0 && (
                                              <div style={{
                                                background: '#fefce8',
                                                borderRadius: '12px',
                                                padding: '14px',
                                                border: '1px solid #fef08a'
                                              }}>
                                                <div style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '8px',
                                                  marginBottom: '10px'
                                                }}>
                                                  <Zap size={16} style={{ color: '#d97706' }} />
                                                  <p style={{
                                                    fontSize: '13px',
                                                    fontWeight: '700',
                                                    color: '#854d0e',
                                                    margin: 0
                                                  }}>
                                                    Practice Tasks
                                                  </p>
                                                </div>
                                                <ul style={{
                                                  margin: 0,
                                                  padding: 0,
                                                  listStyle: 'none',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  gap: '6px'
                                                }}>
                                                  {w.practice_tasks.map((t, i) => (
                                                    <li key={i} style={{
                                                      display: 'flex',
                                                      alignItems: 'flex-start',
                                                      gap: '8px',
                                                      fontSize: '13px',
                                                      color: '#713f12'
                                                    }}>
                                                      <span>🔹</span>
                                                      <span>{t}</span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            
                                            {/* Checkpoints */}
                                            {Array.isArray(w.checkpoints) && w.checkpoints.length > 0 && (
                                              <div style={{
                                                background: '#f0fdf4',
                                                borderRadius: '12px',
                                                padding: '14px',
                                                border: '1px solid #bbf7d0'
                                              }}>
                                                <div style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '8px',
                                                  marginBottom: '10px'
                                                }}>
                                                  <CheckCircle size={16} style={{ color: '#16a34a' }} />
                                                  <p style={{
                                                    fontSize: '13px',
                                                    fontWeight: '700',
                                                    color: '#166534',
                                                    margin: 0
                                                  }}>
                                                    Checkpoints
                                                  </p>
                                                </div>
                                                <ul style={{
                                                  margin: 0,
                                                  padding: 0,
                                                  listStyle: 'none',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  gap: '6px'
                                                }}>
                                                  {w.checkpoints.map((c, i) => (
                                                    <li key={i} style={{
                                                      display: 'flex',
                                                      alignItems: 'flex-start',
                                                      gap: '8px',
                                                      fontSize: '13px',
                                                      color: '#14532d'
                                                    }}>
                                                      <span>☐</span>
                                                      <span>{c}</span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              {/* Completion badge */}
                              <div style={{
                                marginTop: '24px',
                                textAlign: 'center',
                                padding: '20px',
                                background: '#1e3a5f',
                                borderRadius: '12px',
                                color: 'white'
                              }}>
                                <p style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0' }}>
                                  Complete all {guidance.weekly_schedule.length} weeks to level up!
                                </p>
                                <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                                  Click the week circles to mark them as done
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
