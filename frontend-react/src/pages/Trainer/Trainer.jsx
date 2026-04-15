import React, { useState } from "react";
import { X, PlusCircle, Upload, Filter, FileText, TrendingUp, Users, Award } from "lucide-react";

const Trainer = () => {
  const [activeTab, setActiveTab] = useState("filter"); // "filter" or "skillset"
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [skillsetData, setSkillsetData] = useState(null);
  const [skillsetLoading, setSkillsetLoading] = useState(false);
  const [skillsetError, setSkillsetError] = useState(null);
  const [uploadMode, setUploadMode] = useState("replace"); // "replace" or "append"
  const [editMode, setEditMode] = useState(false); // Edit existing skillset
  const [editedData, setEditedData] = useState(null); // Store edited data
  const [filters, setFilters] = useState({
    cgpa: "",
    tenth: "",
    twelfth: "",
    skills: [],
    currentSkill: "",
    language: "",
    ats: "",
    departments: [],
    degree: "",
    results: [],
  });
const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  // handle file upload
const handleFileChange = (e) => {
  const files = Array.from(e.target.files);

  const newFiles = files.map((file) => ({
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl: URL.createObjectURL(file), // ✅ temporary local URL
  }));

  setResumes((prev) => {
    const filtered = newFiles.filter(
      (nf) => !prev.some((pf) => pf.name === nf.name && pf.size === nf.size)
    );
    return [...prev, ...filtered];
  });
};


const removeFile = (filename) => {
  setResumes((prev) => prev.filter((file) => file.name !== filename));
};


  // handle input filter change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // handle skill add
  const addSkill = () => {
    if (filters.currentSkill.trim() !== "") {
      setFilters((prev) => ({
        ...prev,
        skills: [...prev.skills, prev.currentSkill.trim()],
        currentSkill: "",
      }));
    }
  };

  // handle skill remove
  const removeSkill = (skill) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const departmentMap = {
  CSE: "Computer Science and Engineering",
  AIDS: "Artificial Intelligence and Data Science",
  IT: "Information Technology",
  ECE: "Electronics and Communication Engineering",
  EEE: "Electrical and Electronics Engineering",
  EIE: "Electronics and Instrumentation Engineering",
  MECH: "Mechanical Engineering",
  MCT: "Mechatronics Engineering",
  AUTO: "Automobile Engineering",
  CIVIL: "Civil Engineering",
  AGRI: "Agricultural Engineering",
  CHEM: "Chemical Engineering",
  BT: "Bio-Technology",
  TEXTILE: "Textile Technology",
  FT: "Fashion Technology",
  FOOD: "Food Technology",
  RA: "Robotics and Automation",
  CSBS: "Computer Science and Business Systems",
};

// ✅ Add department
const addDepartment = (shortCode) => {
  if (!shortCode || filters.departments.some((d) => d.short === shortCode)) return;
  const full = departmentMap[shortCode];
  setFilters((prev) => ({
    ...prev,
    departments: [...prev.departments, { short: shortCode, full }],
  }));
};

const removeDepartment = (shortCode) => {
  setFilters((prev) => ({
    ...prev,
    departments: prev.departments.filter((d) => d.short !== shortCode),
  }));
};


  // handle form submit
  const handleFilter = async (e) => {
  e.preventDefault();
  setLoading(true);
  setFilters((prev) => ({ ...prev, results: [] }));
  setTotalFiles(resumes.length);
  setProcessedFiles(0);

  const formData = new FormData();
  resumes.forEach((fileObj) => formData.append("files", fileObj.file));
Object.entries(filters).forEach(([key, value]) => {
  if (
    key !== "skills" &&
    key !== "currentSkill" &&
    key !== "departments" &&
    value
  )
    formData.append(key, value);
});

if (filters.skills.length > 0)
  formData.append("skills", filters.skills.join(","));

if (filters.departments.length > 0)
  formData.append(
    "department",
    filters.departments.map((d) => d.full).join(",")
  );


  try {
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch("http://127.0.0.1:8000/admin/filter_uploaded_resumes_stream", {
      method: "POST",
      headers: headers,
      body: formData,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let currentResults = [];

    // Helper function to handle progress updates
    const handleProgressUpdate = (data) => {
      setProcessedFiles(data.progress);
      setTotalFiles(data.total);

      if (data.results_so_far) {
        currentResults = data.results_so_far;
        setFilters((prev) => ({ ...prev, results: [...currentResults] }));
      }
    };

    // Helper function to handle completion
    const handleCompletion = (data) => {
      // Merge backend data (real ATS, education, etc.) with the original uploaded files
      const mergedResults = data.results.map((res) => {
        const matchingFile = resumes.find((f) => f.name === res.filename);
        return {
          ...res,
          previewUrl: matchingFile ? matchingFile.previewUrl : null, // 🔥 connect with real local file
        };
      });

      setFilters((prev) => ({ ...prev, results: mergedResults }));
      setProcessedFiles(data.count);
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop();

      for (const event of events) {
        if (event.startsWith("data: ")) {
          const data = JSON.parse(event.replace("data: ", ""));

          // 🔹 Update live progress
          if (data.progress) {
            handleProgressUpdate(data);
          }

          // 🔹 When done, finalize the results
          if (data.done) {
            handleCompletion(data);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error streaming resumes:", err);
    alert("⚠️ Error while processing resumes. Check console for details.");
  } finally {
    setLoading(false);
  }
};

// Only revoke URLs when component unmounts
React.useEffect(() => {
  return () => {
    filters.results.forEach((r) => {
      if (r.previewUrl) URL.revokeObjectURL(r.previewUrl);
    });
  };
}, [filters.results]);


const downloadReport = async () => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Resume Filter Report", 14, 20);
  doc.setFontSize(10);

  let y = 30;
  filters.results.forEach((res, index) => {
  doc.text(`${index + 1}. ${res.name || "N/A"} (${res.filename || "-"})`, 14, y);
  y += 6;

  if (res.email || res.phone) {
    doc.text(`${res.email || "-"}    ${res.phone || "-"}`, 14, y);
    y += 6;
  }

  doc.text(
    `CGPA: ${res.education?.bachelor?.cgpa || "-"} | ATS: ${res.ats_score}%`,
    14,
    y
  );
  y += 6;

  doc.text(
    `Skills: ${res.skills?.technical?.slice(0, 4).join(", ") || "-"}`,
    14,
    y
  );
  y += 10;

  if (y > 270) {
    doc.addPage();
    y = 20;
  }
});


  doc.save("Filtered_Resume_Report.pdf");
};

const sortedResults = React.useMemo(() => {
  if (!filters.results || filters.results.length === 0) return [];

  const sorted = [...filters.results];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      const getVal = (obj, key) => {
        switch (key) {
          case "name": return (obj.name || "").toLowerCase();
          case "filename": return (obj.filename || "").toLowerCase();
          case "department": return (obj.education?.bachelor?.degree || "").toLowerCase();
          case "cgpa": return parseFloat(obj.education?.bachelor?.cgpa || 0);
          case "ats": return parseFloat(obj.ats_score || 0);
          default: return "";
        }
      };

      const aVal = getVal(a, sortConfig.key);
      const bVal = getVal(b, sortConfig.key);

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  return sorted;
}, [filters.results, sortConfig]);

const handleSort = (key) => {
  setSortConfig((prev) => {
    if (prev.key === key) {
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    }
    return { key, direction: "asc" };
  });
};

  // ===== Skillset Management Functions =====
  const fetchSkillsetPreview = async () => {
    const token = localStorage.getItem('access_token');
    setSkillsetLoading(true);
    setSkillsetError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/admin/skillset_preview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSkillsetData(data.sheets);
      } else {
        setSkillsetError(data.detail || 'Failed to load skillset');
      }
    } catch (err) {
      setSkillsetError(err.message || 'Failed to load skillset');
    } finally {
      setSkillsetLoading(false);
    }
  };

  const handleSkillsetUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', uploadMode);

    setSkillsetLoading(true);
    setSkillsetError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/admin/upload_skillset', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        // Refresh preview after upload
        await fetchSkillsetPreview();
        alert(data.message || 'Skillset uploaded successfully!');
      } else {
        // Handle token errors specifically
        if (response.status === 401) {
          setSkillsetError(`${data.detail || 'Authentication failed'}. Please refresh and log in again.`);
        } else {
          setSkillsetError(data.detail || 'Failed to upload skillset');
        }
      }
    } catch (err) {
      setSkillsetError(err.message || 'Network error: Failed to upload skillset');
    } finally {
      setSkillsetLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Fetch skillset when tab changes
  React.useEffect(() => {
    if (activeTab === 'skillset') {
      fetchSkillsetPreview();
    }
  }, [activeTab]);

  // ===== Skillset Edit Functions =====
  const startEditing = () => {
    if (skillsetData) {
      setEditedData(JSON.parse(JSON.stringify(skillsetData))); // Deep copy
      setEditMode(true);
    }
  };

  const cancelEditing = () => {
    setEditMode(false);
    setEditedData(null);
  };

  const handleCellChange = (sheetName, rowIndex, columnName, value) => {
    setEditedData(prev => {
      const updated = { ...prev };
      updated[sheetName][rowIndex][columnName] = value;
      return updated;
    });
  };

  const saveEdits = async () => {
    const token = localStorage.getItem('access_token');
    setSkillsetLoading(true);
    setSkillsetError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/admin/update_skillset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sheets: editedData })
      });
      const data = await response.json();
      if (response.ok) {
        setSkillsetData(editedData);
        setEditMode(false);
        setEditedData(null);
        alert('Skillset updated successfully! ✅');
      } else {
        setSkillsetError(data.detail || 'Failed to save changes');
      }
    } catch (err) {
      setSkillsetError(err.message || 'Failed to save changes');
    } finally {
      setSkillsetLoading(false);
    }
  };

  const activeFiltersCount = [
    filters.cgpa,
    filters.tenth,
    filters.twelfth,
    filters.departments.length > 0,
    filters.language,
    filters.ats,
    filters.department,
    filters.degree
  ].filter(Boolean).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      padding: "0"
    }}>
      {/* Top Navigation Bar with Tabs */}
     <div
  style={{
    position: "relative",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px 32px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  }}
>
  <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
    {/* Heading */}
    <div style={{ textAlign: "center", marginBottom: "20px" }}>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: "700",
          color: "#fff",
          margin: 0,
        }}
      >
        Trainer Portal
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.9)",
          fontSize: "14px",
          margin: "4px 0 0 0",
        }}
      >
        Manage resumes and company skillset
      </p>
    </div>

    {/* Tab Navigation */}
    <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid rgba(255,255,255,0.2)" }}>
      <button
        onClick={() => setActiveTab("filter")}
        style={{
          padding: "12px 20px",
          background: activeTab === "filter" ? "rgba(255,255,255,0.2)" : "transparent",
          color: "#fff",
          border: "none",
          borderBottom: activeTab === "filter" ? "3px solid #fff" : "none",
          cursor: "pointer",
          fontSize: "15px",
          fontWeight: activeTab === "filter" ? "600" : "500",
          transition: "all 0.3s",
        }}
      >
        <Filter size={16} style={{ display: "inline", marginRight: "8px" }} />
        Resume Filter
      </button>
      <button
        onClick={() => setActiveTab("skillset")}
        style={{
          padding: "12px 20px",
          background: activeTab === "skillset" ? "rgba(255,255,255,0.2)" : "transparent",
          color: "#fff",
          border: "none",
          borderBottom: activeTab === "skillset" ? "3px solid #fff" : "none",
          cursor: "pointer",
          fontSize: "15px",
          fontWeight: activeTab === "skillset" ? "600" : "500",
          transition: "all 0.3s",
        }}
      >
        <Award size={16} style={{ display: "inline", marginRight: "8px" }} />
        Company Skillset
      </button>
    </div>
  </div>
</div>


      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px" }}>
        
        {/* Resume Filter Tab */}
        {activeTab === "filter" && (
        <>
        {/* Stats Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
          gap: "20px",
          marginBottom: "32px"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "24px",
            borderRadius: "16px",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <Upload size={32} />
              <span style={{ fontSize: "32px", fontWeight: "700" }}>{resumes.length}</span>
            </div>
            <p style={{ fontSize: "14px", opacity: 0.9, margin: 0 }}>Uploaded Resumes</p>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            padding: "24px",
            borderRadius: "16px",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(240, 147, 251, 0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <Filter size={32} />
              <span style={{ fontSize: "32px", fontWeight: "700" }}>{activeFiltersCount}</span>
            </div>
            <p style={{ fontSize: "14px", opacity: 0.9, margin: 0 }}>Active Filters</p>
          </div>

          <div style={{
  background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  padding: "24px",
  borderRadius: "16px",
  color: "#fff",
  boxShadow: "0 4px 12px rgba(79, 172, 254, 0.3)"
}}>
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px"
  }}>
    <TrendingUp size={32} />
    <span style={{
      fontSize: "32px",
      fontWeight: "700"
    }}>
      {processedFiles}/{totalFiles || 0}
    </span>
  </div>
  <p style={{ fontSize: "14px", opacity: 0.9, margin: 0 }}>
    Processed Resumes
  </p>
  {totalFiles > 0 && (
    <div style={{
      marginTop: "10px",
      height: "6px",
      width: "100%",
      background: "rgba(255,255,255,0.2)",
      borderRadius: "6px",
      overflow: "hidden"
    }}>
      <div
        style={{
          height: "100%",
          width: `${(processedFiles / totalFiles) * 100}%`,
          background: "#fff",
          transition: "width 0.4s ease"
        }}
      />
    </div>
  )}
</div>


          <div style={{
            background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            padding: "24px",
            borderRadius: "16px",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(67, 233, 123, 0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <Award size={32} />
              <span style={{ fontSize: "32px", fontWeight: "700" }}>
                {filters.results.length > 0 
                  ? Math.round(filters.results.reduce((sum, r) => sum + (r.ats_score || 0), 0) / filters.results.length)
                  : 0}%
              </span>
            </div>
            <p style={{ fontSize: "14px", opacity: 0.9, margin: 0 }}>Avg ATS Score</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", marginBottom: "32px" }}>
          
          {/* Upload Section - Left Sidebar */}
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            height: "fit-content"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "10px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Upload size={20} color="#fff" />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "#1f2937" }}>
                Upload Files
              </h2>
            </div>

            <div style={{
              border: "2px dashed #cbd5e1",
              borderRadius: "12px",
              padding: "32px 20px",
              textAlign: "center",
              background: "#f8fafc",
              cursor: "pointer",
              transition: "all 0.3s",
              position: "relative"
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = "#667eea"}
            onMouseOut={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
            >
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer"
                }}
              />
              <FileText size={48} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "14px", color: "#64748b", margin: "8px 0" }}>
                <strong style={{ color: "#667eea" }}>Click to upload</strong> or drag and drop
              </p>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                PDF, DOC, DOCX files
              </p>
            </div>

            {resumes.length > 0 && (
              <>
                <div style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <span style={{ fontSize: "14px", color: "#166534", fontWeight: "600" }}>
                    ✓ {resumes.length} file{resumes.length > 1 ? 's' : ''} selected
                  </span>
                  {resumes.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm("Remove all selected files?"))
                          setResumes([]);
                      }}
                      style={{
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div style={{
                  marginTop: "12px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}>
                    {[...resumes]
  .sort((a, b) => a.name.localeCompare(b.name)) // ✅ Sort filenames A→Z
  .map((file, idx) => (
    <div
      key={idx}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        background: "#f8fafc",
        borderRadius: "8px",
        fontSize: "13px",
        border: "1px solid #e2e8f0",
      }}
    >
      <a
        href={file.previewUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "#2563eb",
          fontWeight: "600",
          textDecoration: "none",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        📄 {file.name}
      </a>

      <X
        size={16}
        style={{
          cursor: "pointer",
          color: "#94a3b8",
          flexShrink: 0,
          marginLeft: "8px",
        }}
        onClick={() => removeFile(file.name)}
      />
    </div>
  ))}



                </div>
              </>
            )}
          </div>

          {/* Filter Panel - Right Side */}
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                padding: "10px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Filter size={20} color="#fff" />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "#1f2937" }}>
                Filter Criteria
              </h2>
            </div>

            <form onSubmit={handleFilter}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                
                {/* CGPA */}
                <div>
                  <label style={{
                    display: "block",
                    color: "#475569",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "13px"
                  }}>
                    📊 Minimum CGPA
                  </label>
                  <input
                    type="number"
                    name="cgpa"
                    step="0.01"
                    min="0"
                    max="10"
                    value={filters.cgpa}
                    onChange={handleChange}
                    style={{
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      width: "100%",
                      fontSize: "14px",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                    placeholder="e.g., 7.5"
                  />
                </div>

                {/* 10th */}
                <div>
                  <label style={{
                    display: "block",
                    color: "#475569",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "13px"
                  }}>
                    📈 10th Percentage
                  </label>
                  <input
                    type="number"
                    name="tenth"
                    value={filters.tenth}
                    onChange={handleChange}
                    style={{
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      width: "100%",
                      fontSize: "14px",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                    placeholder="e.g., 85"
                  />
                </div>

                {/* 12th */}
                <div>
                  <label style={{
                    display: "block",
                    color: "#475569",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "13px"
                  }}>
                    📈 12th Percentage
                  </label>
                  <input
                    type="number"
                    name="twelfth"
                    value={filters.twelfth}
                    onChange={handleChange}
                    style={{
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      width: "100%",
                      fontSize: "14px",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                    placeholder="e.g., 90"
                  />
                </div>

                {/* ATS Score */}
                <div>
                  <label style={{
                    display: "block",
                    color: "#475569",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "13px"
                  }}>
                    🎯 Minimum ATS Score
                  </label>
                  <input
                    type="number"
                    name="ats"
                    value={filters.ats}
                    onChange={handleChange}
                    style={{
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      width: "100%",
                      fontSize: "14px",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                    placeholder="e.g., 75"
                  />
                </div>

                {/* Department */}
                <div>
  <label
    style={{
      display: "block",
      color: "#475569",
      marginBottom: "8px",
      fontWeight: "600",
      fontSize: "13px",
    }}
  >
    🏫 Department
  </label>

  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      border: "2px solid #e2e8f0",
      borderRadius: "8px",
      padding: "10px",
      minHeight: "48px",
      background: "#fff",
    }}
  >
    {filters.departments && filters.departments.length > 0 && (
      filters.departments.map((dept, i) => (
        <span
          key={i}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {dept.short}
          <X
            size={14}
            style={{ cursor: "pointer" }}
            onClick={() => removeDepartment(dept.short)}
          />
        </span>
      ))
    )}

    <select
      onChange={(e) => addDepartment(e.target.value)}
      defaultValue=""
      style={{
        border: "none",
        outline: "none",
        fontSize: "14px",
        flex: "1",
        background:"white",
        minWidth: "180px",
        cursor: "pointer",
      }}
    >
      <option value="" disabled>
        Select Department
      </option>
      <option style={{background:"white"}} value="CSE">CSE — Computer Science and Engineering</option>
      <option value="AIDS">AIDS — Artificial Intelligence and Data Science</option>
      <option value="IT">IT — Information Technology</option>
      <option value="ECE">ECE — Electronics and Communication Engineering</option>
      <option value="EEE">EEE — Electrical and Electronics Engineering</option>
      <option value="EIE">EIE — Electronics and Instrumentation Engineering</option>
      <option value="MECH">MECH — Mechanical Engineering</option>
      <option value="MCT">MCT — Mechatronics Engineering</option>
      <option value="AUTO">AUTO — Automobile Engineering</option>
      <option value="CIVIL">CIVIL — Civil Engineering</option>
      <option value="AGRI">AGRI — Agricultural Engineering</option>
      <option value="CHEM">CHEM — Chemical Engineering</option>
      <option value="BT">BT — Bio-Technology</option>
      <option value="TEXTILE">TEXTILE — Textile Technology</option>
      <option value="FT">FT — Fashion Technology</option>
      <option value="FOOD">FOOD — Food Technology</option>
      <option value="RA">RA — Robotics and Automation</option>
      <option value="CSBS">CSBS — Computer Science and Business Systems</option>
    </select>
  </div>
</div>


                {/* Degree */}
                <div>
                  <label style={{
                    display: "block",
                    color: "#475569",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "13px"
                  }}>
                    🎓 Degree
                  </label>
                  <select
                    name="degree"
                    value={filters.degree}
                    onChange={handleChange}
                    style={{
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      width: "100%",
                      fontSize: "14px",
                      background: "#fff",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                  >
                    <option value="">Select Degree</option>
                    <option value="B.E">B.E</option>
                    <option value="B.Tech">B.Tech</option>
                  </select>
                </div>
              </div>

              {/* Skills - Full Width */}
              <div style={{ marginTop: "20px" }}>
                <label style={{
                  display: "block",
                  color: "#475569",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "13px"
                }}>
                  🛠️ Required Skills
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
  type="text"
  name="currentSkill"
  value={filters.currentSkill}
  onChange={handleChange}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault(); 
      addSkill();         
    }
  }}
  placeholder="Type a skill and press + or Enter"
  style={{
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    padding: "10px 12px",
    flex: 1,
    fontSize: "14px",
  }}
  onFocus={(e) => (e.target.style.borderColor = "#667eea")}
  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
/>

                  <button
                    type="button"
                    onClick={addSkill}
                    style={{
                      padding: "10px 16px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "#fff",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    <PlusCircle size={20} />
                  </button>
                </div>

                {filters.skills.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                    {filters.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "#fff",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "13px",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        {skill}
                        <X
                          size={14}
                          onClick={() => removeSkill(skill)}
                          style={{ cursor: "pointer" }}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Language */}
              <div style={{ marginTop: "20px" }}>
                <label style={{
                  display: "block",
                  color: "#475569",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "13px"
                }}>
                  🗣️ Human Language
                </label>
                <input
                  type="text"
                  name="language"
                  value={filters.language}
                  onChange={handleChange}
                  placeholder="e.g., English, Tamil"
                  style={{
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    width: "100%",
                    fontSize: "14px"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                />
              </div>

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                gap: "12px",
                marginTop: "28px",
                paddingTop: "24px",
                borderTop: "2px solid #f1f5f9"
              }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "14px 24px",
                    background: loading ? "#cbd5e1" : "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                    color: "#fff",
                    borderRadius: "10px",
                    border: "none",
                    fontWeight: "700",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    boxShadow: loading ? "none" : "0 4px 12px rgba(67, 233, 123, 0.3)"
                  }}
                >
                  {loading ? "⏳ Filtering..." : "✅ Apply Filters"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilters({
                      cgpa: "",
                      tenth: "",
                      twelfth: "",
                      skills: [],
                      currentSkill: "",
                      language: "",
                      ats: "",
                      departments:[],
                      degree: "",
                      results: [],
                    });
                  }}
                  style={{
                    padding: "14px 24px",
                    background: "#fff",
                    color: "#64748b",
                    borderRadius: "10px",
                    border: "2px solid #e2e8f0",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontSize: "15px"
                  }}
                >
                  🔄 Clear All
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Results Section */}
        {filters.results && filters.results.length > 0 ? (
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            padding: "24px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  padding: "10px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Users size={20} color="#fff" />
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "#1f2937" }}>
                  Filtered Results ({filters.results.length})
                </h2>
              </div>
              <button
                onClick={downloadReport}
                style={{   
                  background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  boxShadow: "0 4px 12px rgba(67, 233, 123, 0.3)"
                }}
              >
                💾 Save as PDF
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th
                      style={{
                        border: "1px solid #e2e8f0",
                        padding: "14px",
                        textAlign: "left",
                        fontWeight: "700",
                        color: "#1f2937",
                        fontSize: "13px"
                      }}
                      onClick={() => handleSort("name")}
                    >
  Name {sortConfig.key === "name" && (sortConfig.direction === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      style={{
                        border: "1px solid #e2e8f0",
                        padding: "14px",
                        textAlign: "left",
                        fontWeight: "700",
                        color: "#1f2937",
                        fontSize: "13px"
                      }}
                      onClick={() => handleSort("filename")}
                    >
                      Filename{sortConfig.key === "filename" && (sortConfig.direction === "asc" ? "▲" : "▼")}

                    </th>
                    <th
                      style={{
                        border: "1px solid #e2e8f0",
                        padding: "14px",
                        textAlign: "left",
                        fontWeight: "700",
                        color: "#1f2937",
                        fontSize: "13px"
                      }}
                      onClick={() => handleSort("department")}
                    >
                      Department{sortConfig.key === "department" && (sortConfig.direction === "asc" ? "▲" : "▼")}

                    </th>
                    <th
                      style={{
                        border: "1px solid #e2e8f0",
                        padding: "14px",
                        textAlign: "left",
                        fontWeight: "700",
                        color: "#1f2937",
                        fontSize: "13px"
                      }}
                      onClick={() => handleSort("cgpa")}
                    >
                      CGPA{sortConfig.key === "cgpa" && (sortConfig.direction === "asc" ? "▲" : "▼")}

                    </th>
                    <th
                      style={{
                        border: "1px solid #e2e8f0",
                        padding: "14px",
                        textAlign: "left",
                        fontWeight: "700",
                        color: "#1f2937",
                        fontSize: "13px"
                      }}
                      onClick={() => handleSort("ats")}
                    >
                      ATS Score{sortConfig.key === "ats" && (sortConfig.direction === "asc" ? "▲" : "▼")}

                    </th>
                    <th
                      style={{
                        border: "1px solid #e2e8f0",
                        padding: "14px",
                        textAlign: "left",
                        fontWeight: "700",
                        color: "#1f2937",
                        fontSize: "13px"
                      }}
                    >
                      Languages
                    </th>
                    <th
                      style={{
                        border: "1px solid #e2e8f0",
                        padding: "14px",
                        textAlign: "left",
                        fontWeight: "700",
                        color: "#1f2937",
                        fontSize: "13px"
                      }}
                    >
                      Key Skills
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((res, idx) => (
                    <tr
                      key={idx}
                      style={{
                        transition: "background 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#f8fafc")
                      }
                      onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
                    >
                      {/* Name column — clickable to open PDF */}
{/* Name column — plain text */}
<td
  style={{
    border: "1px solid #e2e8f0",
    padding: "14px",
    color: "#1f2937",
    fontWeight: "600",
  }}
>
  {res.name || "N/A"}
</td>

{/* Filename column — clickable to open PDF */}
<td
  style={{
    border: "1px solid #e2e8f0",
    padding: "14px",
  }}
>
  <a
  href={res.previewUrl}
  target="_blank"
  rel="noopener noreferrer"
  style={{
    color: "#667eea",
    textDecoration: "none",
    fontWeight: "600",
  }}
  onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
  onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
>
  {res.filename || "-"}
</a>

</td>



                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: "14px",
                          color: "#64748b",
                        }}
                      >
                        {res.education?.bachelor?.degree || "-"}
                      </td>

                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: "14px",
                          color: "#1f2937",
                          fontWeight: "600"
                        }}
                      >
                        {res.education?.bachelor?.cgpa || "-"}
                      </td>

                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: "14px",
                        }}
                      >
                        <span
                          style={{
                            background:
                              res.ats_score >= 75
                                ? "#d1fae5"
                                : res.ats_score >= 50
                                ? "#fef3c7"
                                : "#fee2e2",
                            color:
                              res.ats_score >= 75
                                ? "#065f46"
                                : res.ats_score >= 50
                                ? "#92400e"
                                : "#991b1b",
                            padding: "6px 12px",
                            borderRadius: "16px",
                            fontWeight: "700",
                            fontSize: "12px",
                            display: "inline-block"
                          }}
                        >
                          {res.ats_score}%
                        </span>
                      </td>

                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: "14px",
                          color: "#64748b",
                        }}
                      >
                        {res.languages?.join(", ") || "-"}
                      </td>

                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: "14px",
                          color: "#64748b",
                        }}
                      >
                        {res.skills?.technical?.slice(0, 4).join(", ") || "-"}
                        {res.skills?.technical?.length > 4 && "..."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: "20px",
                borderTop: "2px solid #f1f5f9",
                paddingTop: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "14px",
                color: "#64748b",
              }}
            >
              <span>
                📄 Total Results:{" "}
                <strong style={{ color: "#1f2937", fontWeight: "700" }}>{filters.results.length}</strong>
              </span>                
            </div>
          </div>
        ) : (
          !loading && (
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                textAlign: "center",
                padding: "60px 20px",
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.5 }}>📭</div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#475569", margin: "0 0 8px 0" }}>
                No Results Found
              </h3>
              <p style={{ margin: "0 0 4px 0" }}>No resumes matched your filter criteria.</p>
              <p style={{ fontSize: "13px", margin: 0, color: "#94a3b8" }}>
                Try adjusting your filters or upload new resumes to get started.
              </p>
            </div>
          )
        )}
        </>
        )}

        {/* Company Skillset Tab */}
        {activeTab === "skillset" && (
        <div style={{
          background: "white",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid #e0f2fe",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
        }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", marginBottom: "12px" }}>
            Company Skillset Management
          </h2>
          <p style={{ color: "#64748b", marginBottom: "20px" }}>
            Upload and manage the "Skillset of Companies Visited" Excel file. Changes will automatically be visible to all users.
          </p>

          {/* Mode Selector */}
          <div style={{
            display: "flex",
            gap: "12px",
            marginBottom: "20px",
            padding: "16px",
            background: "#f0f9ff",
            borderRadius: "8px",
            border: "1px solid #bae6fd"
          }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px",
                background: uploadMode === "replace" ? "#667eea" : "white",
                color: uploadMode === "replace" ? "white" : "#1e293b",
                borderRadius: "8px",
                border: "2px solid",
                borderColor: uploadMode === "replace" ? "#667eea" : "#cbd5e1",
                cursor: "pointer",
                fontWeight: "600",
                transition: "all 0.3s"
              }}>
                <input
                  type="radio"
                  name="uploadMode"
                  value="replace"
                  checked={uploadMode === "replace"}
                  onChange={(e) => setUploadMode(e.target.value)}
                  style={{ cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontSize: "14px" }}>Replace Entire File</div>
                  <div style={{
                    fontSize: "11px",
                    opacity: 0.8,
                    fontWeight: "400",
                    marginTop: "2px"
                  }}>
                    Overwrites existing skillset completely
                  </div>
                </div>
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px",
                background: uploadMode === "append" ? "#667eea" : "white",
                color: uploadMode === "append" ? "white" : "#1e293b",
                borderRadius: "8px",
                border: "2px solid",
                borderColor: uploadMode === "append" ? "#667eea" : "#cbd5e1",
                cursor: "pointer",
                fontWeight: "600",
                transition: "all 0.3s"
              }}>
                <input
                  type="radio"
                  name="uploadMode"
                  value="append"
                  checked={uploadMode === "append"}
                  onChange={(e) => setUploadMode(e.target.value)}
                  style={{ cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontSize: "14px" }}>Append/Merge Sheets</div>
                  <div style={{
                    fontSize: "11px",
                    opacity: 0.8,
                    fontWeight: "400",
                    marginTop: "2px"
                  }}>
                    Adds or updates specific sheets
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Upload Section */}
          <div style={{
            padding: "20px",
            border: "2px dashed #cbd5e1",
            borderRadius: "12px",
            textAlign: "center",
            marginBottom: "24px",
            background: "#f8fafc",
            cursor: "pointer",
            transition: "all 0.3s"
          }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleSkillsetUpload}
              style={{ display: "none" }}
              id="skillset-upload"
            />
            <label htmlFor="skillset-upload" style={{ cursor: "pointer", display: "block" }}>
              <Upload size={32} style={{ margin: "0 auto 12px", color: "#667eea" }} />
              <p style={{ margin: "8px 0", fontWeight: "600", color: "#1e293b" }}>
                Click to upload Excel file
              </p>
              <p style={{ color: "#64748b", fontSize: "13px", margin: "4px 0 0 0" }}>
                Supported format: .xlsx or .xls (NOT CSV)
              </p>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "4px 0 0 0" }}>
                Make sure the file is a real Excel file with actual sheets
              </p>
            </label>
          </div>

          {skillsetLoading && <p style={{ color: "#667eea" }}>Loading skillset...</p>}
          {skillsetError && (
            <div style={{ color: "#b91c1c", padding: "12px", background: "#fee2e2", borderRadius: "8px", marginBottom: "16px" }}>
              Error: {skillsetError}
            </div>
          )}

          {/* Preview Section */}
          {skillsetData && Object.keys(skillsetData).length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b" }}>
                  Current Skillset Preview
                </h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  {!editMode ? (
                    <button
                      onClick={startEditing}
                      style={{
                        padding: "8px 16px",
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600"
                      }}
                    >
                      ✏️ Edit Skillset
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={saveEdits}
                        disabled={skillsetLoading}
                        style={{
                          padding: "8px 16px",
                          background: "#10b981",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: skillsetLoading ? "not-allowed" : "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                          opacity: skillsetLoading ? 0.6 : 1
                        }}
                      >
                        {skillsetLoading ? "Saving..." : "✅ Save Changes"}
                      </button>
                      <button
                        onClick={cancelEditing}
                        style={{
                          padding: "8px 16px",
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "600"
                        }}
                      >
                        ❌ Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editMode && (
                <div style={{
                  padding: "12px",
                  background: "#fef3c7",
                  border: "1px solid #fcd34d",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#92400e"
                }}>
                  📝 Click on any cell to edit. Changes will be saved to all users.
                </div>
              )}

              {Object.entries(editMode ? editedData : skillsetData).map(([sheetName, rows]) => (
                <div key={sheetName} style={{ marginBottom: "24px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                    {sheetName}
                  </h4>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                          {rows.length > 0 && Object.keys(rows[0]).map(col => (
                            <th key={col} style={{
                              padding: "10px",
                              textAlign: "left",
                              fontWeight: "600",
                              color: "#475569",
                              borderRight: "1px solid #e2e8f0"
                            }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                            {Object.entries(row).map(([col, val]) => (
                              <td key={col} style={{
                                padding: "10px",
                                color: "#334155",
                                borderRight: "1px solid #e2e8f0",
                                background: editMode ? "#fffbeb" : "transparent"
                              }}>
                                {editMode ? (
                                  <input
                                    type="text"
                                    value={val ?? ''}
                                    onChange={(e) => handleCellChange(sheetName, idx, col, e.target.value)}
                                    style={{
                                      width: "100%",
                                      padding: "4px",
                                      border: "1px solid #dbeafe",
                                      borderRadius: "4px",
                                      fontSize: "13px",
                                      fontFamily: "inherit"
                                    }}
                                  />
                                ) : (
                                  String(val ?? '')
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 10 && (
                    <p style={{ color: "#64748b", fontSize: "12px", marginTop: "8px" }}>
                      Showing 10 of {rows.length} rows
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!skillsetLoading && (!skillsetData || Object.keys(skillsetData).length === 0) && !skillsetError && (
            <div style={{
              padding: "32px",
              textAlign: "center",
              background: "#f0f9ff",
              borderRadius: "12px",
              color: "#0369a1"
            }}>
              <Award size={40} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
              <p>No skillset file uploaded yet. Upload an Excel file to get started.</p>
            </div>
          )}
        </div>
        )}

      </div>
    </div>
  );

};

export default Trainer;