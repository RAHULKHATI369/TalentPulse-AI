// ==========================================================================
// TALENTPULSE AI CORE FRONTEND HANDLER
// Single Page Application State Machine & AI Simulator Controller
// ==========================================================================

const API_BASE = ""; // Relative path, serves from backend server

// Global Client State
const state = {
  activeTab: "upload",
  candidates: [],
  interviews: [],
  stats: {
    total_candidates: 0,
    total_anomalies: 0,
    completed_interviews: 0,
    average_performance_index: 0.0
  },
  // Interview Wizard state
  wizard: {
    candidateId: null,
    candidateName: "",
    questions: [],
    answers: ["", "", ""],
    currentStep: 0
  }
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initUploadHandlers();
  initScreeningHandlers();
  initAnalyticsHandlers();
  initSimulatorHandlers();
  
  // Initial data pull
  fetchStats();
  fetchAndRenderCandidates();
  fetchAndRenderInterviews();
});

// ==========================================================================
// CLIENT ROUTING & NAVIGATION
// ==========================================================================

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const tabViews = document.querySelectorAll(".tab-view");

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute("data-tab");
      
      // Update sidebar state
      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      // Update views state
      tabViews.forEach(view => {
        view.classList.remove("active");
        if (view.id === `view-${targetTab}`) {
          view.classList.add("active");
        }
      });

      state.activeTab = targetTab;
      
      // Trigger refreshes depending on view
      if (targetTab === "screening") {
        fetchAndRenderCandidates();
      } else if (targetTab === "analytics") {
        renderAnalyticsView();
      } else if (targetTab === "simulator") {
        fetchAndRenderInterviews();
      }
    });
  });
}

// ==========================================
// STATS / METRICS UPDATE
// ==========================================

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (res.ok) {
      const data = await res.json();
      state.stats = data;
      
      // Update UI elements
      document.getElementById("stat-total-candidates").innerText = data.total_candidates;
      document.getElementById("stat-total-anomalies").innerText = data.total_anomalies;
      document.getElementById("stat-total-interviews").innerText = data.completed_interviews;
      document.getElementById("stat-avg-performance").innerText = `${data.average_performance_index}%`;
    }
  } catch (err) {
    console.error("Failed to fetch dashboard stats:", err);
  }
}

function initUploadHandlers() {
  const dropzone = document.getElementById("upload-dropzone");
  const fileInput = document.getElementById("upload-file-input");
  const progressPanel = document.getElementById("upload-progress-panel");

  // Prevent browser drag/drop default actions
  ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => e.preventDefault(), false);
  });

  dropzone.addEventListener("dragover", () => dropzone.classList.add("dragover"));
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  
  // Click dropzone to trigger hidden file selector
  dropzone.addEventListener("click", () => {
    fileInput.click();
  });

  // Handle files selected via file dialog
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      handleFilesSelected(fileInput.files);
    }
  });

  // Handle files dropped
  dropzone.addEventListener("drop", (e) => {
    dropzone.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesSelected(files);
    }
  });
}

async function handleFilesSelected(fileList) {
  const progressPanel = document.getElementById("upload-progress-panel");
  const progressBar = document.getElementById("upload-progress-bar");
  const statusTitle = document.getElementById("progress-status-title");
  const statusPercent = document.getElementById("progress-status-percentage");

  const stepSchema = document.getElementById("step-schema");
  const stepEmbeddings = document.getElementById("step-embeddings");
  const stepPersona = document.getElementById("step-persona");
  const stepZScore = document.getElementById("step-zscore");

  // Convert FileList to array and filter for PDFs, DOCXs, and ZIPs case-insensitively
  const files = Array.from(fileList).filter(f => 
    f.name.toLowerCase().endsWith(".pdf") || 
    f.name.toLowerCase().endsWith(".docx") || 
    f.name.toLowerCase().endsWith(".zip") || 
    f.type === "application/pdf" || 
    f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    f.type === "application/msword" ||
    f.type === "application/zip" || 
    f.type === "application/x-zip-compressed"
  );
  
  if (files.length === 0) {
    alert("Please upload valid PDF, Word (.docx), or ZIP files.");
    return;
  }

  // Reset Progress panel & steps
  progressPanel.classList.remove("hidden");
  progressBar.style.backgroundColor = "";
  [stepSchema, stepEmbeddings, stepPersona, stepZScore].forEach(el => {
    el.className = "step-item";
  });

  const updateProgress = (percentage, title, activeStep, completedSteps = []) => {
    progressBar.style.width = `${percentage}%`;
    statusPercent.innerText = `${percentage}%`;
    statusTitle.innerText = title;
    
    if (activeStep) activeStep.className = "step-item active";
    completedSteps.forEach(s => s.className = "step-item completed");
  };

  // Determine endpoint and package form data
  const isZip = files.some(f => f.name.toLowerCase().endsWith(".zip"));
  const formData = new FormData();
  let uploadUrl = "";
  let uploadLabel = "";

  if (isZip) {
    const zipFile = files.find(f => f.name.toLowerCase().endsWith(".zip"));
    formData.append("file", zipFile);
    uploadUrl = `${API_BASE}/api/candidates/upload-zip`;
    uploadLabel = `ZIP archive (${zipFile.name})`;
  } else {
    files.forEach(f => {
      formData.append("files", f);
    });
    uploadUrl = `${API_BASE}/api/candidates/upload-pdf`;
    uploadLabel = `${files.length} resume document(s)`;
  }

  // Execute upload via XHR to capture real upload progress metrics
  const xhr = new XMLHttpRequest();
  xhr.open("POST", uploadUrl);

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 35); // Upload is first 35%
      updateProgress(pct, `Uploading ${uploadLabel}...`, stepSchema);
    }
  };

  const showUploadError = (message) => {
    statusTitle.innerText = message;
    statusPercent.innerText = "Error";
    progressBar.style.backgroundColor = "var(--anomaly)";
    progressBar.style.width = "100%";
  };

  xhr.onload = async () => {
    if (xhr.status === 200) {
      try {
        const result = JSON.parse(xhr.responseText);
        
        // Step 2: Unpacked / Extracted
        const msgStep2 = isZip ? "ZIP unpacked. Extracting documents text..." : "PDF extraction complete. Extracting candidate structured JSON (Gemini)...";
        updateProgress(60, msgStep2, stepEmbeddings, [stepSchema]);
        await sleep(1500);

        // Step 3: Structured Ingestion
        const msgStep3 = isZip ? "Resume text parsed. Querying Gemini JSON model..." : "Gemini JSON parsing complete. Executing vector embeds and tone analysis...";
        updateProgress(85, msgStep3, stepPersona, [stepSchema, stepEmbeddings]);
        await sleep(1200);

        // Step 4: Z-score calculations
        updateProgress(95, "Recalculating global candidate Z-Scores...", stepZScore, [stepSchema, stepEmbeddings, stepPersona]);
        await sleep(800);

        // Done
        updateProgress(100, `Successfully processed ${result.processed_count} candidates from ingestion stream!`, null, [stepSchema, stepEmbeddings, stepPersona, stepZScore]);
        await sleep(800);

        // Refresh stats and candidate list
        await fetchStats();
        await fetchAndRenderCandidates();

        // Route to screening tab automatically
        document.getElementById("nav-screening").click();
      } catch (err) {
        showUploadError("Ingestion Error: Failed to parse server response.");
        console.error(err);
      }
    } else {
      let errorMsg = `Ingestion Failure: Server responded with status ${xhr.status}`;
      try {
        const errJson = JSON.parse(xhr.responseText);
        if (errJson && errJson.detail) {
          errorMsg = `Ingestion Failure: ${errJson.detail}`;
        }
      } catch (e) {}
      showUploadError(errorMsg);
    }
  };

  xhr.onerror = () => {
    showUploadError("Network connection error. Server unreachable.");
  };

  xhr.send(formData);
}

// ==========================================================================
// TAB 2: CANDIDATE SCREENING
// ==========================================================================

function initScreeningHandlers() {
  const runBtn = document.getElementById("btn-run-screening");
  runBtn.addEventListener("click", executeScreeningMatch);
}

async function executeScreeningMatch() {
  const title = document.getElementById("job-title").value;
  const requirements = document.getElementById("job-requirements").value;
  const runBtn = document.getElementById("btn-run-screening");

  runBtn.disabled = true;
  runBtn.innerText = "Matching Profiles...";

  try {
    const res = await fetch(`${API_BASE}/api/screen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_title: title, requirements })
    });
    
    if (res.ok) {
      const candidates = await res.json();
      renderCandidatesList(candidates);
      fetchStats(); // Update stats since matching might trigger state changes
    }
  } catch (err) {
    console.error("Screening request failed:", err);
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      Execute Screening Match
    `;
  }
}

async function fetchAndRenderCandidates() {
  try {
    const res = await fetch(`${API_BASE}/api/candidates`);
    if (res.ok) {
      const candidates = await res.json();
      state.candidates = candidates;
      renderCandidatesList(candidates);
    }
  } catch (err) {
    console.error("Failed to fetch candidates:", err);
  }
}

function renderCandidatesList(candidates) {
  const container = document.getElementById("candidates-list");
  const countBadge = document.getElementById("ranked-count");
  
  countBadge.innerText = `${candidates.length} candidates processed`;

  if (!candidates || candidates.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <p>No candidates processed. Please load candidate records in the Bulk Upload tab first.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  
  candidates.forEach((cand, idx) => {
    const hasMatchScore = cand.match_score !== null && cand.match_score > 0;
    const isAnomaly = cand.is_anomaly;
    const personaClass = getPersonaClass(cand.resume_tone);
    
    const card = document.createElement("div");
    card.className = "candidate-card";
    
    // Parse Markdown why report to clean HTML list tags
    const formattedReport = formatMarkdownToHTML(cand.why_report || "No evaluation report generated.");
    
    card.innerHTML = `
      <div class="candidate-main-info">
        <div class="cand-profile">
          <div class="cand-rank">#${idx + 1}</div>
          <div class="cand-details">
            <div class="cand-name">
              ${cand.name}
              ${isAnomaly ? '<span class="badge badge-anomaly">Anomaly Detected</span>' : ''}
            </div>
            <div class="cand-email">${cand.email}</div>
            <div class="cand-tags">
              <span class="badge badge-exp">${cand.experience_years} Yrs Exp</span>
              ${cand.resume_tone ? `<span class="badge ${personaClass}">${cand.resume_tone}</span>` : '<span class="badge">Awaiting Analysis</span>'}
              <span class="badge" style="background: rgba(255,255,255,0.03)">Z-Score: ${(cand.z_score || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div class="cand-scoring">
          <div class="cand-match-ring">
            <div class="match-score-pill ${cand.match_score < 70 ? 'low' : ''}">
              ${hasMatchScore ? `${cand.match_score}% Match` : 'Awaiting Match'}
            </div>
          </div>
          <button class="btn btn-secondary btn-interview-trigger" data-id="${cand.id}" id="btn-screen-${cand.id}">
            Start Screening Simulation
          </button>
        </div>
      </div>

      <!-- Expandable evaluation report panel -->
      <div class="cand-report-toggle" id="toggle-${cand.id}">
        <button class="btn-toggle-report" onclick="toggleReportPanel(${cand.id})">
          <svg class="report-icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          ${cand.why_report ? 'View Evaluation Report' : 'Evaluation Report Generating...'}
        </button>
        <div class="report-content-box">
          <div class="report-markdown">${formattedReport}</div>
        </div>
      </div>
    `;
    
    container.appendChild(card);
    
    // Setup Interview dispatch button action
    const triggerBtn = card.querySelector(".btn-interview-trigger");
    triggerBtn.addEventListener("click", () => handleInterviewTrigger(cand.id, triggerBtn));
  });

  // Check and update button labels based on interview log status
  updateInterviewButtonsState();
}

function getPersonaClass(persona) {
  if (!persona) return "";
  const p = persona.toLowerCase();
  if (p.includes("leader")) return "persona-leadership";
  if (p.includes("solo")) return "persona-solo";
  if (p.includes("thinker")) return "persona-thinker";
  return "persona-collaborator";
}

function toggleReportPanel(candidateId) {
  const panel = document.getElementById(`toggle-${candidateId}`);
  panel.classList.toggle("expanded");
}

function formatMarkdownToHTML(md) {
  if (!md) return "";
  let html = md;
  
  // Format Headings
  html = html.replace(/###\s+(.*)/g, '<h3>$1</h3>');
  html = html.replace(/\*\*(Pros|Cons|Alignment Reason)\*\*/gi, '<h3>$1</h3>');
  
  // Format bold tags
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Format bullet lines into lists
  // Split lines
  const lines = html.split("\n");
  let inList = false;
  const processedLines = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (!inList) {
        processedLines.push("<ul>");
        inList = true;
      }
      processedLines.push(`<li>${trimmed.substring(1).trim()}</li>`);
    } else {
      if (inList) {
        processedLines.push("</ul>");
        inList = false;
      }
      if (trimmed) {
        processedLines.push(`<p>${trimmed}</p>`);
      }
    }
  });
  
  if (inList) processedLines.push("</ul>");
  return processedLines.join("\n");
}

// ==========================================================================
// TAB 3: BEHAVIORAL ANALYTICS
// ==========================================================================

function initAnalyticsHandlers() {
  const filterBtns = document.querySelectorAll(".persona-tab-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const filter = btn.getAttribute("data-filter");
      renderAnalyticsTable(filter);
    });
  });

  // Scale hooks button trigger
  const scaleBtn = document.getElementById("btn-trigger-scaling");
  scaleBtn.addEventListener("click", triggerDynamicScalingEvaluation);
}

function renderAnalyticsView() {
  // 1. Calculate distributions
  const counts = {
    Leadership: 0,
    "Solo Builder": 0,
    "Critical Thinker": 0,
    Collaborator: 0
  };

  let totalMapped = 0;

  state.candidates.forEach(c => {
    if (c.resume_tone) {
      const matched = Object.keys(counts).find(k => c.resume_tone.toLowerCase().includes(k.toLowerCase().split(" ")[0]));
      if (matched) {
        counts[matched]++;
        totalMapped++;
      } else {
        counts.Collaborator++;
        totalMapped++;
      }
    }
  });

  // Update percentages
  Object.keys(counts).forEach(persona => {
    const count = counts[persona];
    const pct = totalMapped > 0 ? (count / totalMapped) * 100 : 0;
    
    // Update counter text
    const key = persona.toLowerCase().split(" ")[0];
    const countLabel = document.getElementById(`count-${key}`);
    const barFill = document.getElementById(`bar-${key}`);
    
    if (countLabel) countLabel.innerText = count;
    if (barFill) barFill.style.width = `${pct}%`;
  });

  // Render Table
  renderAnalyticsTable("all");
}

function renderAnalyticsTable(filter = "all") {
  const tableBody = document.getElementById("analytics-table-body");
  
  // Filter candidates list
  const filtered = state.candidates.filter(c => {
    if (filter === "all") return true;
    return c.resume_tone && c.resume_tone.toLowerCase().includes(filter.toLowerCase().split(" ")[0]);
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center;">No candidates match this persona criteria.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = "";
  
  filtered.forEach(c => {
    const density = lenSkills(c.skills) / Math.max(c.experience_years, 0.5);
    const row = document.createElement("tr");
    
    row.innerHTML = `
      <td>
        <strong style="color: white; display:block;">${c.name}</strong>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${c.email}</span>
      </td>
      <td>${c.experience_years} years</td>
      <td><span class="badge ${getPersonaClass(c.resume_tone)}">${c.resume_tone || 'Unmapped'}</span></td>
      <td>
        ${density.toFixed(1)} skills/yr
        <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 8px;">(Z: ${(c.z_score || 0).toFixed(1)})</span>
      </td>
      <td>
        ${c.is_anomaly ? 
          '<span class="badge badge-anomaly">Anomaly Flagged</span>' : 
          '<span class="badge" style="background:rgba(16,185,129,0.1); color:var(--emerald);">Verified</span>'
        }
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function lenSkills(skillsStr) {
  if (!skillsStr) return 0;
  return skillsStr.split(",").filter(s => s.trim()).length;
}

async function triggerDynamicScalingEvaluation() {
  const scaleBtn = document.getElementById("btn-trigger-scaling");
  scaleBtn.disabled = true;
  scaleBtn.innerText = "Evaluating Load...";

  try {
    const res = await fetch(`${API_BASE}/api/hooks/scale`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const assessment = data.scale_assessment;
      
      // Update UI replicas details
      document.getElementById("hook-scale-replicas").innerText = `${assessment.current_replicas} Pods`;
      document.getElementById("hook-scale-cpu").innerText = `${assessment.cpu_allocated} Cores`;
      
      alert(`Dynamic scaling evaluation completed!\nQueue Ingest depth: ${assessment.queue_depth}\nReplica pods: ${assessment.current_replicas}\nCores Allocated: ${assessment.cpu_allocated}`);
    }
  } catch (err) {
    console.error("Scale assessment failed:", err);
  } finally {
    scaleBtn.disabled = false;
    scaleBtn.innerText = "Trigger Dynamic Scaling Evaluation";
  }
}

// ==========================================================================
// TAB 4: INTERVIEW SIMULATOR PIPELINE
// ==========================================================================

function initSimulatorHandlers() {
  document.getElementById("btn-wizard-back").addEventListener("click", exitWizard);
  document.getElementById("btn-wizard-next").addEventListener("click", handleWizardNext);
  document.getElementById("btn-close-result").addEventListener("click", exitResultView);
  
  const textarea = document.getElementById("wizard-response-input");
  textarea.addEventListener("input", (e) => {
    document.getElementById("wizard-word-count").innerText = `${e.target.value.length} characters`;
  });
}

async function fetchAndRenderInterviews() {
  try {
    const res = await fetch(`${API_BASE}/api/interviews`);
    if (res.ok) {
      const interviews = await res.json();
      state.interviews = interviews;
      renderInterviewsTable(interviews);
    }
  } catch (err) {
    console.error("Failed to fetch interviews:", err);
  }
}

function renderInterviewsTable(interviews) {
  const tableBody = document.getElementById("interviews-table-body");
  
  if (!state.candidates || state.candidates.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center;">No candidate data. Ingest seeds to view details.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = "";
  
  state.candidates.forEach(cand => {
    const log = interviews.find(i => i.candidate_id === cand.id);
    const isCompleted = log && log.status === "Completed";
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${cand.name}</strong></td>
      <td>${cand.email}</td>
      <td><span class="badge ${getPersonaClass(cand.resume_tone)}">${cand.resume_tone || 'Unmapped'}</span></td>
      <td>
        <span class="badge-status ${isCompleted ? 'status-completed' : 'status-pending'}">
          ${isCompleted ? 'Completed' : 'Pending Link'}
        </span>
      </td>
      <td>
        <strong>${isCompleted ? `${log.simulated_performance_index.toFixed(1)}%` : '0.0%'}</strong>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm-wizard" onclick="initiateWizardSession(${cand.id}, '${cand.name.replace(/'/g, "\\'")}')">
          ${isCompleted ? 'Re-run Simulation' : 'Enter Screening Wizard'}
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function handleInterviewTrigger(candidateId, buttonElement) {
  buttonElement.disabled = true;
  buttonElement.innerText = "Dispatching...";
  
  try {
    const res = await fetch(`${API_BASE}/api/interviews/dispatch/${candidateId}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      alert(`Automated screening email dispatched to candidate!\nLink: ${data.invite_link}`);
      
      // Update local state and logs table
      await fetchAndRenderInterviews();
      updateInterviewButtonsState();
    }
  } catch (err) {
    console.error("Failed to dispatch screening link:", err);
    buttonElement.disabled = false;
    buttonElement.innerText = "Start Screening Simulation";
  }
}

function updateInterviewButtonsState() {
  state.candidates.forEach(cand => {
    const btn = document.getElementById(`btn-screen-${cand.id}`);
    if (!btn) return;
    
    const log = state.interviews.find(i => i.candidate_id === cand.id);
    if (log) {
      btn.innerText = "Enter Simulation Wizard";
      btn.className = "btn btn-primary btn-interview-trigger";
    } else {
      btn.innerText = "Start Screening Simulation";
      btn.className = "btn btn-secondary btn-interview-trigger";
    }
  });
}

// Wizard state actions
async function initiateWizardSession(candidateId, name) {
  // Navigate to simulator tab if initiated from screening tab
  document.getElementById("nav-simulator").click();
  
  // 1. Fetch questions/log details from backend
  try {
    const res = await fetch(`${API_BASE}/api/interviews/${candidateId}`);
    if (res.ok) {
      const log = await res.json();
      
      // Initialize wizard state
      state.wizard.candidateId = candidateId;
      state.wizard.candidateName = name;
      state.wizard.questions = [log.question_1, log.question_2, log.question_3];
      state.wizard.answers = ["", "", ""];
      state.wizard.currentStep = 0;
      
      // Show wizard screen
      document.getElementById("simulator-main-panel").classList.add("hidden");
      document.getElementById("interview-wizard-panel").classList.remove("hidden");
      
      renderWizardStep();
    }
  } catch (err) {
    console.error("Could not load wizard session details:", err);
  }
}

function renderWizardStep() {
  const stepIdx = state.wizard.currentStep;
  document.getElementById("wizard-candidate-name").innerText = `${state.wizard.candidateName}`;
  document.getElementById("wizard-current-step").innerText = stepIdx + 1;
  document.getElementById("wizard-question-text").innerText = state.wizard.questions[stepIdx];
  
  const responseTextarea = document.getElementById("wizard-response-input");
  responseTextarea.value = state.wizard.answers[stepIdx];
  document.getElementById("wizard-word-count").innerText = `${responseTextarea.value.length} characters`;
  
  // Update button text
  const nextBtn = document.getElementById("btn-wizard-next");
  if (stepIdx === 2) {
    nextBtn.innerHTML = `
      Submit Evaluation
      <svg class="btn-icon-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
    `;
  } else {
    nextBtn.innerHTML = `
      Next Question
      <svg class="btn-icon-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    `;
  }
}

function handleWizardNext() {
  const textInput = document.getElementById("wizard-response-input").value;
  if (!textInput || textInput.trim().length < 10) {
    alert("Please write a detailed response (at least 10 characters) before continuing.");
    return;
  }
  
  const stepIdx = state.wizard.currentStep;
  state.wizard.answers[stepIdx] = textInput;
  
  if (stepIdx === 2) {
    submitEvaluationResponses();
  } else {
    state.wizard.currentStep++;
    renderWizardStep();
  }
}

async function submitEvaluationResponses() {
  const nextBtn = document.getElementById("btn-wizard-next");
  nextBtn.disabled = true;
  nextBtn.innerText = "Evaluating Performance...";
  
  const payload = {
    answer_1: state.wizard.answers[0],
    answer_2: state.wizard.answers[1],
    answer_3: state.wizard.answers[2]
  };

  try {
    const res = await fetch(`${API_BASE}/api/interviews/${state.wizard.candidateId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      const data = await res.json();
      
      // Update completion screen scores
      document.getElementById("result-score-percent").innerText = `${data.simulated_performance_index}%`;
      
      // Hide wizard, show success modal
      document.getElementById("interview-wizard-panel").classList.add("hidden");
      document.getElementById("interview-result-panel").classList.remove("hidden");
      
      // Refresh backend datasets
      await fetchStats();
      await fetchAndRenderInterviews();
    }
  } catch (err) {
    console.error("Wizard submission failed:", err);
    nextBtn.disabled = false;
    nextBtn.innerText = "Submit Evaluation";
  }
}

function exitWizard() {
  document.getElementById("interview-wizard-panel").classList.add("hidden");
  document.getElementById("simulator-main-panel").classList.remove("hidden");
}

function exitResultView() {
  document.getElementById("interview-result-panel").classList.add("hidden");
  document.getElementById("simulator-main-panel").classList.remove("hidden");
}

// Helper Sleep function for async simulation loops
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
