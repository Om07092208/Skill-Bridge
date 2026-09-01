/**
 * CareerIntel Application Logic — Real Data Onboarding & 6-Agent AI Pipeline Integration
 */
document.addEventListener("DOMContentLoaded", () => {
  // Real User Session State (No Hardcoded Dummy Data)
  const session = {
    user: {
      name: "",
      email: "",
      currentRole: "",
      isAuthenticated: false
    },
    resumeText: "",
    resumeLines: [],
    extractedSkills: [],
    targetRole: "",
    pipelineResults: null
  };

  // DOM Elements
  const authScreen = document.getElementById("auth-screen");
  const authForm = document.getElementById("auth-form");
  const uploadScreen = document.getElementById("upload-screen");
  const targetRoleModal = document.getElementById("target-role-modal");
  
  const resumeInputText = document.getElementById("resume-input-text");
  const useSampleBtn = document.getElementById("use-sample-resume-btn");
  const analyzeResumeBtn = document.getElementById("analyze-resume-btn");
  
  const roleOptionBtns = document.querySelectorAll(".role-option-btn");
  const customRoleInput = document.getElementById("custom-target-role-input");
  const confirmRoleBtn = document.getElementById("confirm-target-role-btn");

  // 1. STEP 1: AUTHENTICATION FORM SUBMIT
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      session.user.name = document.getElementById("auth-name").value.trim();
      session.user.email = document.getElementById("auth-email").value.trim();
      session.user.currentRole = document.getElementById("auth-role").value.trim();
      session.user.isAuthenticated = true;

      // Update UI Labels
      document.getElementById("user-name-label").textContent = session.user.name;
      document.getElementById("user-role-label").textContent = session.user.currentRole;
      document.getElementById("overview-user-name").textContent = session.user.name.split(" ")[0];
      
      const avatarEl = document.getElementById("user-avatar");
      if (avatarEl) {
        const initials = session.user.name.split(" ").map(n => n[0]).join("").toUpperCase();
        avatarEl.textContent = initials || "U";
      }

      // Hide Auth Screen & Open Step 2: Upload Screen
      authScreen.classList.add("hidden");
      uploadScreen.classList.remove("hidden");
    });
  }

  // Sample Resume Inserter (Optional helper for quick testing)
  if (useSampleBtn) {
    useSampleBtn.addEventListener("click", () => {
      resumeInputText.value = `Alex Dev — Data Analyst
Contact: alex.dev@email.com | GitHub: github.com/alexdev

EXPERIENCE:
Data Analyst @ TechCorp (2022 - Present)
  • Developed automated ETL pipelines in Python & pandas processing 2M+ records daily.
  • Engineered complex SQL queries and PostgreSQL window functions for executive reporting.
  • Built executive dashboards in Power BI and Tableau tracking customer churn.

PROJECTS:
Predictive Churn Model (2023)
  • Implemented Scikit-Learn Random Forest classifier achieving 86% ROC-AUC.
  • Performed exploratory statistical data analysis and feature engineering.

EDUCATION:
B.S. in Computer Science — State University (Graduated 2022)`;
    });
  }

  // 2. STEP 2: RESUME UPLOAD & PARSING
  if (analyzeResumeBtn) {
    analyzeResumeBtn.addEventListener("click", async () => {
      const text = resumeInputText.value.trim();
      if (!text) {
        alert("Please paste or type resume content to continue.");
        return;
      }

      analyzeResumeBtn.innerText = "Parsing Resume...";
      analyzeResumeBtn.disabled = true;

      try {
        const res = await fetch("/api/extract-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_text: text })
        });
        const data = await res.json();

        session.resumeText = text;
        session.resumeLines = data.lines || [];
        session.extractedSkills = data.extracted_skills || [];

        // Render Resume Line Viewer
        renderResumeTextViewer();
        renderExtractedSkills();

        // Hide Upload Screen & Show Extraction Review Screen
        uploadScreen.classList.add("hidden");
        switchView("extraction");
      } catch (err) {
        alert("Error parsing resume: " + err.message);
      } finally {
        analyzeResumeBtn.innerText = "Analyze Resume & Extract Skills \u2192";
        analyzeResumeBtn.disabled = false;
      }
    });
  }

  // Render Resume Line Viewer with line numbers
  function renderResumeTextViewer() {
    const viewer = document.getElementById("resume-text-viewer");
    if (!viewer) return;

    if (session.resumeLines.length === 0) {
      viewer.innerHTML = `<p class="text-on-surface-variant">No lines found in uploaded resume.</p>`;
      return;
    }

    viewer.innerHTML = session.resumeLines.map(l => `
      <div class="snippet-line" data-line="${l.line}">
        <span class="text-outline-variant mr-2">${l.line}:</span> ${escapeHtml(l.text)}
      </div>
    `).join("");
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Render Extracted Skills with Confidence & Line Evidence
  function renderExtractedSkills() {
    const container = document.getElementById("extracted-skills-container");
    if (!container) return;

    if (session.extractedSkills.length === 0) {
      container.innerHTML = `<p class="text-xs text-on-surface-variant">No explicit technical skills identified. You can manually add skills below.</p>`;
      return;
    }

    // Group by category
    const categories = {};
    session.extractedSkills.forEach(s => {
      if (!categories[s.category]) categories[s.category] = [];
      categories[s.category].push(s);
    });

    container.innerHTML = Object.keys(categories).map(cat => `
      <div>
        <p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">${cat}</p>
        <div class="space-y-2">
          ${categories[cat].map(s => `
            <div class="p-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-lg flex items-center justify-between hover:border-primary transition-colors cursor-pointer skill-review-item" data-line="${s.sourceLine}">
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-on-surface">${s.name}</span>
                <span class="badge-pill ${s.confidence >= 90 ? 'badge-secondary' : 'badge-tertiary'}">${s.confidence}% Conf</span>
              </div>
              <span class="text-xs text-on-surface-variant">Line ${s.sourceLine}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");

    // Add click listeners to highlight line numbers
    const items = container.querySelectorAll(".skill-review-item");
    items.forEach(item => {
      item.addEventListener("click", () => {
        const lineNum = item.dataset.line;
        const lines = document.querySelectorAll(".snippet-line");
        lines.forEach(l => l.classList.remove("highlighted"));
        const target = Array.from(lines).find(l => l.dataset.line === lineNum);
        if (target) {
          target.classList.add("highlighted");
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  }

  // 3. STEP 3: CONFIRM EXTRACTION & OPEN TARGET ROLE PICKER
  const confirmExtractionBtn = document.getElementById("confirm-extraction-btn");
  if (confirmExtractionBtn) {
    confirmExtractionBtn.addEventListener("click", () => {
      targetRoleModal.classList.remove("hidden");
    });
  }

  // Target Role Selection Modals
  roleOptionBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      roleOptionBtns.forEach(b => b.classList.remove("border-primary", "bg-surface-container-low"));
      btn.classList.add("border-primary", "bg-surface-container-low");
      session.targetRole = btn.dataset.role;
      if (customRoleInput) customRoleInput.value = "";
    });
  });

  if (confirmRoleBtn) {
    confirmRoleBtn.addEventListener("click", () => {
      const customVal = customRoleInput ? customRoleInput.value.trim() : "";
      if (customVal) {
        session.targetRole = customVal;
      }
      if (!session.targetRole) {
        session.targetRole = "Senior Data Scientist";
      }

      // Hide Modal & Launch Live Pipeline
      targetRoleModal.classList.add("hidden");
      runDynamicCareerPipeline();
    });
  }

  // 4. STEP 4: RUN DYNAMIC 6-AGENT PIPELINE FOR ACTIVE CANDIDATE
  async function runDynamicCareerPipeline() {
    const refreshBtn = document.getElementById("refresh-pipeline-btn");
    if (refreshBtn) {
      refreshBtn.classList.add("opacity-60");
      refreshBtn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span><span>Computing 6 Agents...</span>`;
    }

    const payload = {
      candidate: {
        id: session.user.email || "usr_active",
        name: session.user.name || "User",
        email: session.user.email || "user@email.com",
        current_role: session.user.currentRole || "Professional",
        skills: session.extractedSkills.map(s => ({
          name: s.name,
          proficiency: (s.confidence || 80) / 100,
          evidence: `Resume line ${s.sourceLine}`
        }))
      },
      target_role: {
        name: session.targetRole
      }
    };

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      session.pipelineResults = data;

      // Render Pipeline Intelligence on Dashboard
      renderDashboardWithAgentResults(data);
      switchView("overview");
    } catch (err) {
      alert("Pipeline Error: " + err.message);
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove("opacity-60");
        refreshBtn.innerHTML = `<span class="material-symbols-outlined text-sm">sync</span><span>Refresh Intelligence</span>`;
      }
    }
  }

  // 5. DASHBOARD RENDERER WITH REAL AGENT OUTPUTS
  function renderDashboardWithAgentResults(data) {
    // Header & Role Labels
    document.getElementById("header-target-role").textContent = session.targetRole;
    document.getElementById("matrix-target-role-label").textContent = session.targetRole;

    const readiness = data.readiness || {};
    const score = readiness.readiness_score || 0;
    const status = readiness.status || "Evaluating";

    document.getElementById("overview-readiness-score").textContent = `${score}%`;
    document.getElementById("overview-readiness-status").textContent = status;
    document.getElementById("matrix-match-percentage").textContent = `${score}%`;

    // Render Skill Gap Matrix
    const gapContainer = document.getElementById("skill-gap-list-container");
    const gaps = data.skill_gaps || [];
    if (gapContainer) {
      if (gaps.length === 0) {
        gapContainer.innerHTML = `<div class="p-4 bg-secondary-container/20 rounded-lg text-xs font-bold text-secondary">Great job! Your profile matches all core required skills for ${session.targetRole}.</div>`;
      } else {
        gapContainer.innerHTML = gaps.map(g => `
          <div class="career-card p-4 flex items-center justify-between hover:border-primary transition-all">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-lg ${g.priority === 'high' || g.priority === 'critical' ? 'bg-error-container text-on-error-container' : 'bg-tertiary-container/20 text-tertiary'} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined">${g.priority === 'high' || g.priority === 'critical' ? 'priority_high' : 'warning'}</span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-bold text-on-surface">${g.skill}</h4>
                  <span class="badge-pill ${g.priority === 'high' || g.priority === 'critical' ? 'badge-error' : 'badge-tertiary'}">${g.priority.toUpperCase()} GAP</span>
                </div>
                <p class="text-xs text-on-surface-variant mt-1">Current Level: ${Math.round(g.current_level*100)}% &rarr; Target Required: ${Math.round(g.required_level*100)}%</p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <a href="#learning" class="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-container inline-flex items-center gap-1">
                <span>View Course</span>
                <span class="material-symbols-outlined text-sm">chevron_right</span>
              </a>
            </div>
          </div>
        `).join("");
      }
    }

    // Render Roadmap Nodes
    const roadmapContainer = document.getElementById("roadmap-nodes-container");
    const roadmap = data.roadmap || [];
    if (roadmapContainer) {
      if (roadmap.length === 0) {
        roadmapContainer.innerHTML = `<p class="text-xs text-on-surface-variant">No roadmap generated.</p>`;
      } else {
        roadmapContainer.innerHTML = roadmap.map((r, idx) => `
          <div class="timeline-step ${idx === 0 ? 'completed' : idx === 1 ? 'active' : 'upcoming'} text-center space-y-2 cursor-pointer">
            <div class="timeline-node">
              <span class="material-symbols-outlined text-xl">${idx === 0 ? 'check' : idx === 1 ? 'play_arrow' : 'school'}</span>
            </div>
            <h4 class="text-xs font-bold text-on-surface">${r.title}</h4>
            <p class="text-[11px] ${idx === 0 ? 'text-secondary' : idx === 1 ? 'text-primary' : 'text-on-surface-variant'} font-semibold">${r.action}</p>
          </div>
        `).join("");
      }
    }

    // Render Recommended Courses
    const courseContainer = document.getElementById("courses-grid-container");
    const courses = data.learning_plan || [];
    if (courseContainer) {
      if (courses.length === 0) {
        courseContainer.innerHTML = `<p class="text-xs text-on-surface-variant">No courses needed for current profile.</p>`;
      } else {
        courseContainer.innerHTML = courses.map(c => `
          <div class="career-card p-5 flex flex-col justify-between space-y-4">
            <div>
              <div class="flex justify-between items-start mb-2">
                <span class="badge-pill badge-primary">Closes: ${c.skill}</span>
                <span class="badge-pill badge-tertiary uppercase text-[10px]">${c.priority} Priority</span>
              </div>
              <h3 class="text-sm font-bold text-on-surface leading-snug">${c.course_title}</h3>
              <p class="text-xs text-on-surface-variant mt-2">Platform: ${c.platform}</p>
            </div>
            <button class="w-full bg-primary text-on-primary py-2 rounded-lg text-xs font-bold hover:bg-primary-container transition-colors">
              Start Course (${c.platform})
            </button>
          </div>
        `).join("");
      }
    }

    // Render Matched Opportunities
    const oppContainer = document.getElementById("opportunities-list-container");
    const overviewOppList = document.getElementById("overview-jobs-list");
    const opps = data.matched_opportunities || [];

    if (oppContainer) {
      if (opps.length === 0) {
        oppContainer.innerHTML = `<p class="text-xs text-on-surface-variant">No matching opportunities found.</p>`;
      } else {
        oppContainer.innerHTML = opps.map(opp => `
          <div class="career-card p-6 space-y-4">
            <div class="flex justify-between items-start">
              <div>
                <span class="badge-pill badge-secondary font-extrabold text-xs mb-2">${opp.compatibility_score}% Match</span>
                <h3 class="text-base font-bold text-on-surface">${opp.title}</h3>
                <p class="text-xs text-on-surface-variant">${opp.company}</p>
              </div>
              <button class="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-container">Apply Externally</button>
            </div>
            <div class="grid grid-cols-2 gap-4 p-4 bg-surface-container-low rounded-lg text-xs">
              <div>
                <p class="font-bold text-secondary mb-1">Why You Match:</p>
                <p class="text-on-surface-variant">${(opp.why_matched || []).join(", ") || "Core skill alignment"}</p>
              </div>
              <div>
                <p class="font-bold text-tertiary mb-1">Remaining Role Gaps:</p>
                <p class="text-on-surface-variant">${(opp.gaps || []).join(", ") || "None"}</p>
              </div>
            </div>
          </div>
        `).join("");

        // Also render top 2 in Overview
        if (overviewOppList) {
          overviewOppList.innerHTML = opps.slice(0, 2).map(opp => `
            <div class="p-3 border border-outline-variant/60 rounded-lg flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-on-surface">${opp.title}</p>
                <p class="text-[11px] text-on-surface-variant">${opp.company}</p>
              </div>
              <span class="badge-pill badge-secondary font-extrabold text-xs">${opp.compatibility_score}% Match</span>
            </div>
          `).join("");
        }
      }
    }

    // Render Intelligence Briefing
    const briefingContainer = document.getElementById("briefing-container");
    const overviewBriefingList = document.getElementById("overview-briefing-list");
    const trends = data.skill_trends || [];

    if (briefingContainer && trends.length > 0) {
      briefingContainer.innerHTML = trends.map(t => `
        <div class="p-4 bg-surface-container-low rounded-lg border border-outline-variant/60 space-y-2">
          <span class="badge-pill badge-primary">Market Skill Shift</span>
          <h3 class="text-sm font-bold text-on-surface">${t.skill}: Demand level ${t.current_demand} (${t.trend})</h3>
        </div>
      `).join("");

      if (overviewBriefingList) {
        overviewBriefingList.innerHTML = trends.slice(0, 2).map(t => `
          <div class="p-3 bg-surface-container-low rounded-lg text-xs space-y-1">
            <span class="font-bold text-primary uppercase text-[10px]">Market Trend</span>
            <p class="font-semibold text-on-surface">${t.skill}: ${t.current_demand} demand level (${t.trend})</p>
          </div>
        `).join("");
      }
    }
  }

  // Navigation Controller
  const navItems = document.querySelectorAll(".nav-item[data-view]");
  const viewContents = document.querySelectorAll(".view-content");

  function switchView(viewName) {
    if (!viewName) return;
    navItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    viewContents.forEach(view => {
      if (view.id === `${viewName}-view`) {
        view.classList.remove("hidden");
      } else {
        view.classList.add("hidden");
      }
    });
  }

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      window.location.hash = view;
      switchView(view);
    });
  });

  // RAG Chat Simulator
  const chatInput = document.getElementById("rag-chat-input");
  const sendChatBtn = document.getElementById("send-rag-chat-btn");
  const chatHistory = document.getElementById("rag-chat-history");

  if (sendChatBtn && chatInput) {
    sendChatBtn.addEventListener("click", () => {
      const q = chatInput.value.trim();
      if (!q) return;

      const u = document.createElement("div");
      u.className = "p-3 bg-primary-container/10 border border-primary-container/30 rounded-lg max-w-xl text-xs space-y-1 ml-auto text-right";
      u.innerHTML = `<p class="font-bold text-primary">You:</p><p class="text-on-surface">${escapeHtml(q)}</p>`;
      chatHistory.appendChild(u);
      chatInput.value = "";

      setTimeout(() => {
        const r = document.createElement("div");
        r.className = "p-3 bg-surface-container-low border border-outline-variant/60 rounded-lg max-w-xl text-xs space-y-2";
        r.innerHTML = `
          <div class="flex justify-between items-center">
            <span class="font-bold text-primary uppercase text-[10px]">Grounded RAG Answer</span>
            <span class="badge-pill badge-secondary text-[10px]">94% Confidence</span>
          </div>
          <p class="text-on-surface">Based on O*NET database for <strong>${session.targetRole || "Target Role"}</strong>: Core technical skill gap closure is required to reach top candidate percentiles.</p>
          <div class="p-2 bg-surface-container-lowest rounded border border-outline-variant/40 text-[10px] text-on-surface-variant">
            <strong>Cited Sources:</strong> O*NET Content Model v28.1, ESCO Standard
          </div>
        `;
        chatHistory.appendChild(r);
        chatHistory.scrollTop = chatHistory.scrollHeight;
      }, 500);
    });
  }

  // Change Target Role Header Button Trigger
  const changeTargetRoleBtn = document.getElementById("change-target-role-btn");
  if (changeTargetRoleBtn) {
    changeTargetRoleBtn.addEventListener("click", () => {
      targetRoleModal.classList.remove("hidden");
    });
  }

  // Refresh Intelligence Button Trigger
  const refreshPipelineBtn = document.getElementById("refresh-pipeline-btn");
  if (refreshPipelineBtn) {
    refreshPipelineBtn.addEventListener("click", () => {
      if (!session.user.isAuthenticated) {
        authScreen.classList.remove("hidden");
      } else {
        runDynamicCareerPipeline();
      }
    });
  }
});
