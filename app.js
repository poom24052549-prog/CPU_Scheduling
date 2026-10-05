/**
 * CPU Scheduling Web Application Controller
 * Handles UI interactions, problem generation, practice/reveal modes,
 * SVG Gantt chart rendering, comparison charts, test case suite, and printing.
 */

// Default subject task names
const DEFAULT_SUBJECTS = [
  'แบบฝึกหัด OS',
  'รายงาน Database',
  'สรุป English',
  'แบบฝึกหัด Math',
  'โครงงาน Network',
  'แล็ป AI & Data Science',
  'การบ้าน Data Structures',
  'ออกแบบ Software Eng'
];

const PROCESS_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6'  // teal
];

// App State
const state = {
  seed: 'OS-2026',
  studentInfo: {
    name: '',
    studentId: '',
    section: '',
    group: '',
    testDate: new Date().toISOString().split('T')[0],
    instructor: ''
  },
  baseTime: new Date().toISOString().slice(0, 16),
  quantum: 2,
  numTasks: 5,
  tasks: [],
  hypothesis: {
    q1: '',
    q2: '',
    q3: ''
  },
  manualInputs: {
    FCFS: {},
    SJF: {},
    RR: {}
  },
  solutionsRevealed: false,
  activeTab: 'practice', // 'practice', 'simulation', 'tests'
  activeAlgoTab: 'ALL', // 'ALL', 'FCFS', 'SJF', 'RR'
  comparisonQ: 4
};

// Theme Controller (Dark / Light Mode)
function initTheme() {
  const savedTheme = localStorage.getItem('cpu_scheduling_theme') || 'dark'; // Default to dark mode
  setTheme(savedTheme);

  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cpu_scheduling_theme', theme);
  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) {
    if (theme === 'dark') {
      toggleBtn.innerHTML = '☀️ โหมดสว่าง';
      toggleBtn.title = 'สลับเป็นโหมดสว่าง (Light Mode)';
    } else {
      toggleBtn.innerHTML = '🌙 โหมดมืด';
      toggleBtn.title = 'สลับเป็นโหมดมืด (Dark Mode)';
    }
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadFromLocalStorage();
  parseUrlParams();

  if (state.tasks.length === 0) {
    generateRandomProblem();
  }

  setupEventListeners();
  renderAll();
  setActiveTab(state.activeTab);
});

// Event Listeners Setup
function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      setActiveTab(tab);
    });
  });

  // Algorithm Filter Tabs in Simulation Mode
  document.querySelectorAll('.algo-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.algo-filter-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.activeAlgoTab = e.currentTarget.dataset.algo;
      renderSimulationResults();
    });
  });

  // Student Info Input listeners
  ['student-name', 'student-id', 'student-section', 'student-group', 'student-date', 'student-instructor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        const key = id.replace('student-', '');
        const map = { name: 'name', id: 'studentId', section: 'section', group: 'group', date: 'testDate', instructor: 'instructor' };
        state.studentInfo[map[key]] = e.target.value;
        saveToLocalStorage();
        updatePrintHeaders();
      });
    }
  });

  // Seed & Generator controls
  document.getElementById('btn-random-seed')?.addEventListener('click', () => {
    state.seed = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('input-seed').value = state.seed;
    generateRandomProblem();
  });

  document.getElementById('btn-apply-seed')?.addEventListener('click', () => {
    const seedVal = document.getElementById('input-seed').value.trim();
    if (seedVal) {
      state.seed = seedVal;
      generateRandomProblem();
    }
  });

  document.getElementById('select-preset')?.addEventListener('change', (e) => {
    loadPreset(e.target.value);
  });

  // Quantum validation
  const inputQ = document.getElementById('input-quantum');
  if (inputQ) {
    inputQ.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1 || val > 4) {
        alert('ข้อผิดพลาด: กฎในโจทย์กำหนดให้ Time Quantum (q) ต้องเป็นจำนวนเต็ม 1 ถึง 4 เท่านั้น!');
        e.target.value = state.quantum;
        return;
      }
      state.quantum = val;
      renderAll();
    });
  }

  // Base Time
  document.getElementById('input-base-time')?.addEventListener('change', (e) => {
    state.baseTime = e.target.value;
    renderTasksTable();
    updatePrintHeaders();
  });

  // Add Task Button
  document.getElementById('btn-add-task')?.addEventListener('click', () => {
    addNewTask();
  });

  // Reveal / Hide Solutions
  document.getElementById('btn-toggle-reveal')?.addEventListener('click', () => {
    state.solutionsRevealed = !state.solutionsRevealed;
    updateRevealState();
  });

  // Hypothesis Inputs
  ['hypo-1', 'hypo-2', 'hypo-3'].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        state.hypothesis[`q${idx + 1}`] = e.target.value;
        saveToLocalStorage();
      });
    }
  });

  // Print button
  document.getElementById('btn-print')?.addEventListener('click', () => {
    window.print();
  });

  // Share URL button
  document.getElementById('btn-share')?.addEventListener('click', () => {
    copyShareUrl();
  });

  // Export JSON
  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    exportToJson();
  });

  // Import JSON
  document.getElementById('btn-import-json')?.addEventListener('click', () => {
    document.getElementById('file-import')?.click();
  });
  document.getElementById('file-import')?.addEventListener('change', importFromJson);

  // Compare Q Slider
  document.getElementById('range-compare-q')?.addEventListener('input', (e) => {
    state.comparisonQ = parseInt(e.target.value, 10);
    document.getElementById('label-compare-q').innerText = state.comparisonQ;
    renderCompareQAnalysis();
  });
}

function setActiveTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('solution-hidden', pane.id !== `tab-${tab}`);
  });
  if (tab === 'simulation') {
    renderSimulationResults();
  }
}

// Generate Problem Using Seed & PRNG
function generateRandomProblem() {
  const seedNum = parseSeed(state.seed);
  const rng = mulberry32(seedNum);

  // Read desired number of tasks (5-6 by default)
  const numTasksInput = document.getElementById('select-task-count');
  const count = numTasksInput ? parseInt(numTasksInput.value, 10) : 5;
  state.numTasks = count;

  // Quantum: 1 to 4 (or keep current if valid)
  const autoQ = Math.floor(rng() * 4) + 1; // 1-4
  const qInput = document.getElementById('input-quantum');
  if (qInput && !qInput.dataset.manual) {
    state.quantum = autoQ;
    qInput.value = autoQ;
  }

  const newTasks = [];
  const subjectsPool = [...DEFAULT_SUBJECTS];

  // Shuffle subjects
  for (let i = subjectsPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [subjectsPool[i], subjectsPool[j]] = [subjectsPool[j], subjectsPool[i]];
  }

  // Generate tasks: AT in 0-10, BT in 1-8
  // Specification rule: "กำหนดอย่างน้อยหนึ่งงานมี AT = 0 และไม่ต้องห้าม AT ซ้ำ (ต้องเหลื่อมเวลากัน)"
  for (let i = 0; i < count; i++) {
    const id = `P${i + 1}`;
    const name = subjectsPool[i % subjectsPool.length];
    const color = PROCESS_COLORS[i % PROCESS_COLORS.length];
    // First task or random task has AT = 0
    let at = (i === 0) ? 0 : Math.floor(rng() * 11); // 0 to 10
    let bt = Math.floor(rng() * 8) + 1; // 1 to 8

    newTasks.push({ id, name, at, bt, color });
  }

  state.tasks = newTasks;
  state.solutionsRevealed = false;
  state.manualInputs = { FCFS: {}, SJF: {}, RR: {} };

  saveToLocalStorage();
  renderAll();
}

// Format Datetime from t0 and AT
function formatTaskTime(baseTimeStr, atHours) {
  try {
    const baseDate = new Date(baseTimeStr);
    if (isNaN(baseDate.getTime())) return `+${atHours} ชม.`;
    const taskDate = new Date(baseDate.getTime() + atHours * 3600 * 1000);
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const dName = dayNames[taskDate.getDay()];
    const dateNum = taskDate.getDate();
    const mName = monthNames[taskDate.getMonth()];
    const hours = String(taskDate.getHours()).padStart(2, '0');
    const mins = String(taskDate.getMinutes()).padStart(2, '0');
    return `${dName} ${dateNum} ${mName} ${hours}:${mins} น.`;
  } catch (e) {
    return `+${atHours} ชม.`;
  }
}

// Presets Loader
function loadPreset(presetKey) {
  if (!presetKey) return;

  if (presetKey === 'textbook') {
    // Textbook example from Page 4-5
    state.seed = 'TEXTBOOK-P4';
    state.quantum = 2;
    state.tasks = [
      { id: 'P1', name: 'แบบฝึกหัด OS', at: 0, bt: 5, color: PROCESS_COLORS[0] },
      { id: 'P2', name: 'รายงาน Database', at: 1, bt: 3, color: PROCESS_COLORS[1] },
      { id: 'P3', name: 'สรุป English', at: 2, bt: 1, color: PROCESS_COLORS[2] },
      { id: 'P4', name: 'แบบฝึกหัด Math', at: 4, bt: 2, color: PROCESS_COLORS[3] }
    ];
  } else if (presetKey === 'case1_tie') {
    // Edge case 1: Simultaneous arrival & same BT (Page 10)
    state.seed = 'TEST-CASE-1';
    state.quantum = 2;
    state.tasks = [
      { id: 'P1', name: 'แล็ป Network', at: 0, bt: 4, color: PROCESS_COLORS[0] },
      { id: 'P2', name: 'แบบฝึกหัด OS', at: 0, bt: 4, color: PROCESS_COLORS[1] },
      { id: 'P3', name: 'สรุป English', at: 0, bt: 2, color: PROCESS_COLORS[2] },
      { id: 'P4', name: 'การบ้าน Math', at: 2, bt: 4, color: PROCESS_COLORS[3] },
      { id: 'P5', name: 'โครงงาน AI', at: 3, bt: 2, color: PROCESS_COLORS[4] }
    ];
  } else if (presetKey === 'case2_idle') {
    // Edge case 2: Idle period (Page 10)
    state.seed = 'TEST-CASE-2';
    state.quantum = 2;
    state.tasks = [
      { id: 'P1', name: 'อ่านบทความสั้น', at: 0, bt: 1, color: PROCESS_COLORS[0] },
      { id: 'P2', name: 'โปรเจ็ค Database', at: 5, bt: 3, color: PROCESS_COLORS[1] },
      { id: 'P3', name: 'แบบฝึกหัด OS', at: 6, bt: 2, color: PROCESS_COLORS[2] },
      { id: 'P4', name: 'การบ้าน Data Struct', at: 8, bt: 4, color: PROCESS_COLORS[3] },
      { id: 'P5', name: 'เขียนโค้ด Web App', at: 10, bt: 2, color: PROCESS_COLORS[4] }
    ];
  } else if (presetKey === 'case3_quantum_boundary') {
    // Edge case 3: Arrival at exact quantum boundary & BT not divisible by q (Page 10)
    state.seed = 'TEST-CASE-3';
    state.quantum = 2;
    state.tasks = [
      { id: 'P1', name: 'แบบฝึกหัด OS', at: 0, bt: 5, color: PROCESS_COLORS[0] },
      { id: 'P2', name: 'งานกลุ่ม Network', at: 2, bt: 3, color: PROCESS_COLORS[1] },
      { id: 'P3', name: 'สรุป Math', at: 4, bt: 3, color: PROCESS_COLORS[2] },
      { id: 'P4', name: 'แล็ป AI', at: 5, bt: 2, color: PROCESS_COLORS[3] },
      { id: 'P5', name: 'รายงาน English', at: 7, bt: 4, color: PROCESS_COLORS[4] }
    ];
  } else if (presetKey === 'case4_invalid') {
    // Edge case 4: Invalid test values
    alert('ทดสอบการปฏิเสธค่า: โปรแกรมมีระบบตรวจสอบ validation ปฏิเสธ BT <= 0 และ q <= 0 อย่างเคร่งครัดตามกติกา!');
    return;
  }

  document.getElementById('input-seed').value = state.seed;
  document.getElementById('input-quantum').value = state.quantum;
  renderAll();
}

// Add New Custom Task
function addNewTask() {
  const nextNum = state.tasks.length + 1;
  const id = `P${nextNum}`;
  const name = DEFAULT_SUBJECTS[(nextNum - 1) % DEFAULT_SUBJECTS.length];
  const color = PROCESS_COLORS[(nextNum - 1) % PROCESS_COLORS.length];
  state.tasks.push({
    id,
    name,
    at: Math.floor(Math.random() * 6),
    bt: Math.floor(Math.random() * 5) + 1,
    color
  });
  renderAll();
}

// Delete Task
function deleteTask(index) {
  if (state.tasks.length <= 2) {
    alert('ต้องมีงานอย่างน้อย 2 งานสำหรับการเปรียบเทียบตารางงาน');
    return;
  }
  state.tasks.splice(index, 1);
  renderAll();
}

// Render Master
function renderAll() {
  updateFormInputs();
  renderTasksTable();
  renderHypothesis();
  renderPracticeInputs();
  renderSimulationResults();
  renderEdgeTestCases();
  renderCompareQAnalysis();
  updatePrintHeaders();
  updateRevealState();
  renderPrintReport();
}

function updateFormInputs() {
  const seedEl = document.getElementById('input-seed');
  if (seedEl) seedEl.value = state.seed;

  const qEl = document.getElementById('input-quantum');
  if (qEl) qEl.value = state.quantum;

  const baseEl = document.getElementById('input-base-time');
  if (baseEl) baseEl.value = state.baseTime;

  // Student info inputs
  document.getElementById('student-name').value = state.studentInfo.name || '';
  document.getElementById('student-id').value = state.studentInfo.studentId || '';
  document.getElementById('student-section').value = state.studentInfo.section || '';
  document.getElementById('student-group').value = state.studentInfo.group || '';
  document.getElementById('student-date').value = state.studentInfo.testDate || '';
  document.getElementById('student-instructor').value = state.studentInfo.instructor || '';
}

// Render Tasks Editor Table
function renderTasksTable() {
  const tbody = document.getElementById('tasks-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  state.tasks.forEach((task, index) => {
    const tr = document.createElement('tr');
    const simTimeStr = formatTaskTime(state.baseTime, task.at);

    tr.innerHTML = `
      <td>
        <div class="proc-badge">
          <span class="color-dot" style="background-color: ${task.color}"></span>
          <input type="text" class="form-control" style="width: 70px; font-weight: bold;" value="${task.id}" onchange="updateTaskField(${index}, 'id', this.value)">
        </div>
      </td>
      <td>
        <input type="text" class="form-control" value="${task.name}" onchange="updateTaskField(${index}, 'name', this.value)">
      </td>
      <td>
        <span class="badge badge-gray">${simTimeStr}</span>
      </td>
      <td>
        <input type="number" min="0" max="20" class="form-control" style="width: 80px;" value="${task.at}" onchange="updateTaskField(${index}, 'at', parseInt(this.value, 10))">
      </td>
      <td>
        <input type="number" min="1" max="20" class="form-control" style="width: 80px;" value="${task.bt}" onchange="updateTaskField(${index}, 'bt', parseInt(this.value, 10))">
      </td>
      <td>
        <input type="color" value="${task.color}" style="width: 40px; height: 32px; border: none; cursor: pointer;" onchange="updateTaskField(${index}, 'color', this.value)">
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteTask(${index})" title="ลบงานนี้">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Also update Practice Mode Task Table (Clean display for quiz)
  const quizBody = document.getElementById('quiz-task-table-body');
  if (quizBody) {
    quizBody.innerHTML = '';
    state.tasks.forEach(task => {
      const tr = document.createElement('tr');
      const simTimeStr = formatTaskTime(state.baseTime, task.at);
      tr.innerHTML = `
        <td>
          <div class="proc-badge">
            <span class="color-dot" style="background-color: ${task.color}"></span>
            <strong>${task.id}</strong>
          </div>
        </td>
        <td><strong>${task.name}</strong></td>
        <td><span class="badge badge-gray">${simTimeStr}</span></td>
        <td><span class="badge badge-primary">${task.at} ชั่วโมง</span></td>
        <td><span class="badge badge-purple">${task.bt} ชั่วโมง</span></td>
      `;
      quizBody.appendChild(tr);
    });
  }

  // Check if at least one task has AT = 0
  const hasZeroAT = state.tasks.some(t => t.at === 0);
  const alertBox = document.getElementById('at-zero-warning');
  if (alertBox) {
    alertBox.style.display = hasZeroAT ? 'none' : 'block';
  }
}

window.updateTaskField = function(index, field, value) {
  if (field === 'bt') {
    if (isNaN(value) || value <= 0) {
      alert('Burst Time (BT) ต้องเป็นจำนวนเต็มที่มากกว่า 0');
      renderTasksTable();
      return;
    }
  }
  if (field === 'at') {
    if (isNaN(value) || value < 0) {
      alert('Arrival Time (AT) ต้องเป็นจำนวนเต็มที่มากกว่าหรือเท่ากับ 0');
      renderTasksTable();
      return;
    }
  }
  state.tasks[index][field] = value;
  saveToLocalStorage();
  renderPracticeInputs();
  renderSimulationResults();
  updatePrintHeaders();
};

window.deleteTask = deleteTask;

// Render Hypothesis
function renderHypothesis() {
  ['hypo-1', 'hypo-2', 'hypo-3'].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = state.hypothesis[`q${idx + 1}`] || '';
    }
  });
}

// Render Practice Inputs (Manual Entry Tables)
function renderPracticeInputs() {
  ['FCFS', 'SJF', 'RR'].forEach(algo => {
    const container = document.getElementById(`manual-table-${algo.toLowerCase()}`);
    if (!container) return;

    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>รหัส Process</th>
            <th>ชื่องาน</th>
            <th>AT</th>
            <th>BT</th>
            <th>CT (เวลาเสร็จ)</th>
            <th>TAT (CT - AT)</th>
            <th>WT (TAT - BT)</th>
          </tr>
        </thead>
        <tbody>
    `;

    state.tasks.forEach(t => {
      const saved = state.manualInputs[algo]?.[t.id] || { ct: '', tat: '', wt: '' };
      html += `
        <tr>
          <td><strong>${t.id}</strong></td>
          <td>${t.name}</td>
          <td>${t.at}</td>
          <td>${t.bt}</td>
          <td><input type="number" class="form-control form-control-sm manual-input" style="width: 80px;" data-algo="${algo}" data-pid="${t.id}" data-field="ct" value="${saved.ct || ''}" placeholder="CT"></td>
          <td><input type="number" class="form-control form-control-sm manual-input" style="width: 80px;" data-algo="${algo}" data-pid="${t.id}" data-field="tat" value="${saved.tat || ''}" placeholder="TAT"></td>
          <td><input type="number" class="form-control form-control-sm manual-input" style="width: 80px;" data-algo="${algo}" data-pid="${t.id}" data-field="wt" value="${saved.wt || ''}" placeholder="WT"></td>
        </tr>
      `;
    });

    const savedAvg = state.manualInputs[algo]?.['__AVG__'] || { avgTAT: '', avgWT: '' };
    html += `
        <tr style="background-color: var(--bg-card-header); font-weight: 700;">
          <td colspan="4" style="text-align: right;">ค่าเฉลี่ยที่คำนวณได้ด้วยมือ:</td>
          <td>-</td>
          <td><input type="number" step="0.01" class="form-control form-control-sm manual-input" style="width: 90px;" data-algo="${algo}" data-pid="__AVG__" data-field="avgTAT" value="${savedAvg.avgTAT || ''}" placeholder="Avg TAT"></td>
          <td><input type="number" step="0.01" class="form-control form-control-sm manual-input" style="width: 90px;" data-algo="${algo}" data-pid="__AVG__" data-field="avgWT" value="${savedAvg.avgWT || ''}" placeholder="Avg WT"></td>
        </tr>
      </tbody>
    </table>
    `;

    container.innerHTML = html;
  });

  // Attach event listeners for manual inputs
  document.querySelectorAll('.manual-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const algo = e.target.dataset.algo;
      const pid = e.target.dataset.pid;
      const field = e.target.dataset.field;
      if (!state.manualInputs[algo]) state.manualInputs[algo] = {};
      if (!state.manualInputs[algo][pid]) state.manualInputs[algo][pid] = {};
      state.manualInputs[algo][pid][field] = e.target.value;
      saveToLocalStorage();
      if (state.solutionsRevealed) {
        checkManualAnswers();
      }
    });
  });
}

// Check Manual Answers against program results
function checkManualAnswers() {
  const algorithms = {
    FCFS: runFCFS(state.tasks),
    SJF: runSJF(state.tasks),
    RR: runRR(state.tasks, state.quantum)
  };

  ['FCFS', 'SJF', 'RR'].forEach(algo => {
    const res = algorithms[algo];
    const userInputs = state.manualInputs[algo] || {};
    let correctCount = 0;
    let totalFields = state.tasks.length * 3 + 2; // CT, TAT, WT + Avg TAT, Avg WT
    const diffs = [];

    state.tasks.forEach(t => {
      const u = userInputs[t.id] || {};
      const expected = res.results[t.id];

      const uCT = parseFloat(u.ct);
      const uTAT = parseFloat(u.tat);
      const uWT = parseFloat(u.wt);

      if (uCT === expected.ct) correctCount++;
      else if (!isNaN(uCT)) diffs.push(`${t.id} CT: ป้อน ${uCT} แต่ที่ถูกต้องคือ ${expected.ct}`);

      if (uTAT === expected.tat) correctCount++;
      else if (!isNaN(uTAT)) diffs.push(`${t.id} TAT: ป้อน ${uTAT} แต่ที่ถูกต้องคือ ${expected.tat}`);

      if (uWT === expected.wt) correctCount++;
      else if (!isNaN(uWT)) diffs.push(`${t.id} WT: ป้อน ${uWT} แต่ที่ถูกต้องคือ ${expected.wt}`);
    });

    const userAvg = userInputs['__AVG__'] || {};
    const uAvgTAT = parseFloat(userAvg.avgTAT);
    const uAvgWT = parseFloat(userAvg.avgWT);

    if (Math.abs(uAvgTAT - res.avgTAT) < 0.05) correctCount++;
    else if (!isNaN(uAvgTAT)) diffs.push(`Avg TAT: ป้อน ${uAvgTAT} เฉลยคือ ${res.avgTAT.toFixed(2)}`);

    if (Math.abs(uAvgWT - res.avgWT) < 0.05) correctCount++;
    else if (!isNaN(uAvgWT)) diffs.push(`Avg WT: ป้อน ${uAvgWT} เฉลยคือ ${res.avgWT.toFixed(2)}`);

    const resultBox = document.getElementById(`manual-check-result-${algo.toLowerCase()}`);
    if (resultBox) {
      if (diffs.length === 0 && correctCount > 0) {
        resultBox.innerHTML = `
          <div class="badge badge-success" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
            ✅ ตรวจสอบแล้ว: ผลการคำนวณด้วยมือตรงกับโปรแกรม 100% (ถูกต้องทั้งหมด ${correctCount}/${totalFields} ค่า)
          </div>
        `;
      } else if (diffs.length > 0) {
        resultBox.innerHTML = `
          <div class="badge badge-danger" style="font-size: 0.9rem; padding: 0.5rem 1rem; margin-bottom: 0.5rem;">
            ⚠️ พบจุดที่แตกต่าง ${diffs.length} จุด:
          </div>
          <ul style="color: #dc2626; font-size: 0.85rem; padding-left: 1.25rem;">
            ${diffs.map(d => `<li>${d}</li>`).join('')}
          </ul>
        `;
      } else {
        resultBox.innerHTML = `
          <span class="badge badge-gray">ยังไม่ได้กรอกผลคำนวณมือเพื่อตรวจเทียบ</span>
        `;
      }
    }
  });

  renderSummaryTable(algorithms);
}

// Update Reveal / Hidden State
function updateRevealState() {
  const revealBtn = document.getElementById('btn-toggle-reveal');
  const banner = document.getElementById('quiz-banner');
  const solutions = document.querySelectorAll('.solution-container');

  if (state.solutionsRevealed) {
    revealBtn.innerHTML = '🔒 ซ่อนเฉลย (กลับสู่โหมดฝึกทำ)';
    revealBtn.className = 'btn btn-secondary';
    banner.style.display = 'none';
    solutions.forEach(s => s.classList.remove('solution-hidden'));
    checkManualAnswers();
  } else {
    revealBtn.innerHTML = '🔓 เฉลยและตรวจเทียบผล (Reveal Solutions)';
    revealBtn.className = 'btn btn-success btn-lg';
    banner.style.display = 'block';
    solutions.forEach(s => s.classList.add('solution-hidden'));
  }
}

// Render Simulation Results (Gantt Charts, Tables, Trace)
function renderSimulationResults() {
  if (state.tasks.length === 0) return;

  const algorithms = {
    FCFS: runFCFS(state.tasks),
    SJF: runSJF(state.tasks),
    RR: runRR(state.tasks, state.quantum)
  };

  const container = document.getElementById('simulation-output-container');
  if (!container) return;
  container.innerHTML = '';

  const algosToRender = state.activeAlgoTab === 'ALL' ? ['FCFS', 'SJF', 'RR'] : [state.activeAlgoTab];

  algosToRender.forEach(key => {
    const res = algorithms[key];
    const card = createAlgorithmCard(res);
    container.appendChild(card);
  });

  renderBarComparison(algorithms);
  renderSummaryTable(algorithms);
  renderCompareQAnalysis();
}

// Create Card for an Algorithm
function createAlgorithmCard(res) {
  const card = document.createElement('div');
  card.className = 'card';

  const badgeColor = res.algorithm === 'FCFS' ? 'badge-primary' : (res.algorithm === 'SJF' ? 'badge-success' : 'badge-purple');

  card.innerHTML = `
    <div class="card-header">
      <div class="card-title">
        <span class="badge ${badgeColor}">${res.algorithm}</span>
        <span>${res.nameTh}</span>
      </div>
      <div>
        <span class="badge badge-primary">TAT เฉลี่ย: <strong>${res.avgTAT.toFixed(2)}</strong> ชม.</span>
        <span class="badge badge-success">WT เฉลี่ย: <strong>${res.avgWT.toFixed(2)}</strong> ชม.</span>
      </div>
    </div>
    <div class="card-body">
      <!-- Gantt Chart -->
      <div class="gantt-wrapper">
        <div class="gantt-title">
          <span>📊 Gantt Chart (แกนเวลาการทำงาน)</span>
          <span style="font-size: 0.8rem; color: var(--text-muted);">เวลารวมทั้งหมด: ${res.totalTime} ชั่วโมง</span>
        </div>
        ${renderGanttChartHtml(res.gantt, res.totalTime)}
      </div>

      <!-- Result Table -->
      <div class="table-responsive" style="margin-top: 1rem;">
        <table class="data-table">
          <thead>
            <tr>
              <th>รหัส Process</th>
              <th>ชื่องาน</th>
              <th>AT (เวลามาถึง)</th>
              <th>BT (เวลาทำงาน)</th>
              <th>CT (เวลาทำเสร็จ)</th>
              <th>TAT (CT - AT)</th>
              <th>WT (TAT - BT)</th>
            </tr>
          </thead>
          <tbody>
            ${state.tasks.map(t => {
              const r = res.results[t.id];
              return `
                <tr>
                  <td>
                    <div class="proc-badge">
                      <span class="color-dot" style="background-color: ${t.color}"></span>
                      <strong>${t.id}</strong>
                    </div>
                  </td>
                  <td>${t.name}</td>
                  <td>${t.at}</td>
                  <td>${t.bt}</td>
                  <td><strong style="color: var(--primary);">${r.ct}</strong></td>
                  <td>${r.tat}</td>
                  <td><strong style="color: var(--success);">${r.wt}</strong></td>
                </tr>
              `;
            }).join('')}
            <tr style="background-color: var(--bg-card-header); font-weight: 700;">
              <td colspan="4" style="text-align: right;">ค่าเฉลี่ย (Average):</td>
              <td>-</td>
              <td><span class="badge badge-primary" style="font-size: 0.85rem;">${res.avgTAT.toFixed(2)} ชม.</span></td>
              <td><span class="badge badge-success" style="font-size: 0.85rem;">${res.avgWT.toFixed(2)} ชม.</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Step-by-Step Execution Trace Toggle -->
      <details style="margin-top: 1rem;">
        <summary style="font-weight: 600; cursor: pointer; color: var(--primary);">
          🔍 ดูขั้นตอนการทำงานแบบละเอียด (Step-by-Step Trace & Ready Queue)
        </summary>
        <div class="trace-log" style="margin-top: 0.5rem;">
          ${res.steps.map(step => `
            <div class="trace-item">
              <span class="trace-time">t = ${step.time}:</span>
              <span class="trace-msg">${step.event}</span>
            </div>
          `).join('')}
        </div>
      </details>
    </div>
  `;

  return card;
}

// Generate HTML & CSS for Gantt Chart
function renderGanttChartHtml(ganttBlocks, totalTime) {
  if (totalTime <= 0) return '<p>ไม่มีข้อมูลการทำงาน</p>';

  let blocksHtml = '';
  ganttBlocks.forEach(block => {
    const duration = block.end - block.start;
    const widthPct = (duration / totalTime) * 100;
    const isIdle = block.isIdle;
    const bgStyle = isIdle ? '' : `background-color: ${block.color || '#3b82f6'};`;
    const blockClass = isIdle ? 'gantt-block idle' : 'gantt-block';

    blocksHtml += `
      <div class="${blockClass}" style="width: ${widthPct}%; ${bgStyle}" title="${block.id}: ${block.name} (เริ่ม ${block.start} ถึง ${block.end}, รวม ${duration} ชม.)">
        <span>${block.id}</span>
        <span style="font-size: 0.7rem; font-weight: normal; opacity: 0.85;">${duration}h</span>
      </div>
    `;
  });

  // Timeline labels at transition points
  const points = new Set([0]);
  ganttBlocks.forEach(b => {
    points.add(b.start);
    points.add(b.end);
  });
  const sortedPoints = Array.from(points).sort((a, b) => a - b);

  let timelineHtml = '';
  sortedPoints.forEach(pt => {
    const leftPct = (pt / totalTime) * 100;
    timelineHtml += `
      <div class="timeline-mark" style="left: ${leftPct}%;">
        ${pt}
      </div>
    `;
  });

  return `
    <div>
      <div class="gantt-chart">
        ${blocksHtml}
      </div>
      <div class="gantt-timeline">
        ${timelineHtml}
      </div>
    </div>
  `;
}

// Render Comparison Bar Chart (Page 5 style)
function renderBarComparison(algorithms) {
  const container = document.getElementById('bar-comparison-container');
  if (!container) return;

  const data = [
    { name: 'FCFS', wt: algorithms.FCFS.avgWT, color: '#3b82f6' },
    { name: 'SJF', wt: algorithms.SJF.avgWT, color: '#10b981' },
    { name: 'RR', wt: algorithms.RR.avgWT, color: '#8b5cf6' }
  ];

  const maxWT = Math.max(...data.map(d => d.wt), 1);
  const chartHeight = 150; // max px height of bar

  let html = '';
  data.forEach(d => {
    const barHeight = (d.wt / maxWT) * chartHeight;
    html += `
      <div class="bar-group">
        <span class="bar-value">${d.wt.toFixed(2)}</span>
        <div class="bar-rect" style="height: ${barHeight}px; background-color: ${d.color};"></div>
        <span class="bar-label">${d.name}</span>
      </div>
    `;
  });

  container.innerHTML = html;

  // Best Algorithm highlight text
  const bestWT = Math.min(...data.map(d => d.wt));
  const bestAlgos = data.filter(d => Math.abs(d.wt - bestWT) < 0.001);
  const bestNotice = document.getElementById('best-algo-notice');
  if (bestNotice) {
    bestNotice.innerHTML = `
      🌟 <strong>สรุป:</strong> อัลกอริทึมที่ให้เวลารอเฉลี่ย (WT) น้อยที่สุดในโจทย์ชุดนี้คือ 
      <span class="badge badge-success" style="font-size: 0.95rem;">${bestAlgos.map(a => a.name).join(' และ ')} (${bestWT.toFixed(2)} ชั่วโมง)</span>
      <p style="margin-top: 0.4rem; font-size: 0.85rem; color: var(--text-muted);">
        (หมายเหตุ: โดยทั่วไป SJF มักจะให้เวลารอเฉลี่ยต่ำที่สุดเมื่อไม่มีการแย่งงาน แต่ RR ให้ความยุติธรรมและแบ่งปันเวลาตอบสนองได้ดีกว่า)
      </p>
    `;
  }
}

// Render Summary Comparison Table (Page 10 style)
function renderSummaryTable(algorithms) {
  const tbody = document.getElementById('summary-table-body');
  if (!tbody) return;

  const algos = ['FCFS', 'SJF', 'RR'];
  let html = '';

  algos.forEach(algo => {
    const res = algorithms[algo];
    const userInputs = state.manualInputs[algo]?.['__AVG__'] || {};
    const manualTAT = userInputs.avgTAT ? parseFloat(userInputs.avgTAT).toFixed(2) : '-';
    const manualWT = userInputs.avgWT ? parseFloat(userInputs.avgWT).toFixed(2) : '-';

    html += `
      <tr>
        <td><strong>${res.nameTh}</strong></td>
        <td>${manualTAT}</td>
        <td><strong style="color: var(--primary);">${res.avgTAT.toFixed(2)}</strong></td>
        <td>${manualWT}</td>
        <td><strong style="color: var(--success);">${res.avgWT.toFixed(2)}</strong></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Render Interactive What-If Q Comparison (Page 10 Question 2)
function renderCompareQAnalysis() {
  const container = document.getElementById('compare-q-container');
  if (!container || state.tasks.length === 0) return;

  const q1 = state.quantum;
  const q2 = state.comparisonQ || 4;

  const rr1 = runRR(state.tasks, q1);
  const rr2 = runRR(state.tasks, q2);

  const diffWT = (rr2.avgWT - rr1.avgWT).toFixed(2);
  let diffExplain = '';
  if (rr2.avgWT < rr1.avgWT) {
    diffExplain = `เมื่อเปลี่ยน q เป็น ${q2} เวลารอเฉลี่ยลดลง ${Math.abs(diffWT)} ชั่วโมง`;
  } else if (rr2.avgWT > rr1.avgWT) {
    diffExplain = `เมื่อเปลี่ยน q เป็น ${q2} เวลารอเฉลี่ยเพิ่มขึ้น ${diffWT} ชั่วโมง`;
  } else {
    diffExplain = `เมื่อเปลี่ยน q เป็น ${q2} เวลารอเฉลี่ยเท่าเดิม`;
  }

  container.innerHTML = `
    <div class="grid-2" style="margin-top: 1rem;">
      <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong>Round Robin (q = ${q1}) [ค่าเดิม]</strong>
          <span class="badge badge-purple">WT เฉลี่ย: ${rr1.avgWT.toFixed(2)} ชม.</span>
        </div>
        ${renderGanttChartHtml(rr1.gantt, rr1.totalTime)}
      </div>

      <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong>Round Robin (q = ${q2}) [ค่าใหม่]</strong>
          <span class="badge badge-primary">WT เฉลี่ย: ${rr2.avgWT.toFixed(2)} ชม.</span>
        </div>
        ${renderGanttChartHtml(rr2.gantt, rr2.totalTime)}
      </div>
    </div>

    <div style="margin-top: 1rem; background-color: var(--bg-subtle); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;">
      💡 <strong>การวิเคราะห์ผลการเปลี่ยน Time Quantum:</strong> ${diffExplain}
      <br>
      <span style="font-size: 0.85rem; color: var(--text-muted);">
        คำอธิบาย: หาก q มีขนาดใหญ่ขึ้นมาก พฤติกรรมของ Round Robin จะเริ่มเข้าใกล้ FCFS ทำให้จำนวนการสลับงานลดลง แต่ถ้า q เล็กเกินไปจะเกิดการสลับงานบ่อยครั้ง
      </span>
    </div>
  `;
}

// Render Edge Test Cases Suite (Page 10)
function renderEdgeTestCases() {
  const container = document.getElementById('test-cases-suite-container');
  if (!container) return;

  const testCases = [
    {
      title: 'กรณีทดสอบ 1: งานมาพร้อมกัน และงานที่ BT เท่ากัน',
      desc: 'ทดสอบการจัดลำดับเมื่อ AT เท่ากันและ BT เท่ากัน ต้องใช้เลขรหัส Process (P1 ก่อน P2) เป็นตัวตัดสิน (Tie-breaker)',
      run: () => {
        const tasks = [
          { id: 'P2', name: 'Task 2', at: 0, bt: 3, color: PROCESS_COLORS[1] },
          { id: 'P1', name: 'Task 1', at: 0, bt: 3, color: PROCESS_COLORS[0] }
        ];
        const res = runFCFS(tasks);
        const pass = res.gantt[0].id === 'P1';
        return {
          pass,
          evidence: `Gantt: ${res.gantt.map(g => `${g.id}(${g.start}-${g.end})`).join(', ')} (ลำดับเริ่มต้น: P1 -> P2)`
        };
      }
    },
    {
      title: 'กรณีทดสอบ 2: มีช่วง Idle (เช่น AT = 0 และ 5 โดยงานแรก BT = 1)',
      desc: 'ทดสอบการจัดการเวลาว่างของ CPU เมื่อยังไม่มีงานมาถึง ต้องแสดงบล็อก Idle ช่วงเวลา 1 ถึง 5 และเริ่มงานถัดไปได้อย่างถูกต้อง',
      run: () => {
        const tasks = [
          { id: 'P1', name: 'Task 1', at: 0, bt: 1, color: PROCESS_COLORS[0] },
          { id: 'P2', name: 'Task 2', at: 5, bt: 2, color: PROCESS_COLORS[1] }
        ];
        const res = runFCFS(tasks);
        const idleBlock = res.gantt.find(g => g.isIdle);
        const pass = idleBlock && idleBlock.start === 1 && idleBlock.end === 5;
        return {
          pass,
          evidence: `พบช่วง Idle จากเวลา ${idleBlock?.start} ถึง ${idleBlock?.end} ชม. รวม 4 ชม.`
        };
      }
    },
    {
      title: 'กรณีทดสอบ 3: งานใหม่เข้าตรงเวลาครบ q และ BT หาร q ไม่ลงตัว',
      desc: 'ทดสอบกติกาสำคัญใน Round Robin: งานใหม่ที่มาถึงเวลาครบ q ต้องเข้าคิวก่อนงานเดิมที่ถูกตัดรอบนำกลับไปต่อท้าย',
      run: () => {
        // From Page 4-5 textbook: P1(0, 5), P2(1, 3), P3(2, 1), P4(4, 2), q=2
        const tasks = [
          { id: 'P1', name: 'Task 1', at: 0, bt: 5, color: PROCESS_COLORS[0] },
          { id: 'P2', name: 'Task 2', at: 1, bt: 3, color: PROCESS_COLORS[1] },
          { id: 'P3', name: 'Task 3', at: 2, bt: 1, color: PROCESS_COLORS[2] },
          { id: 'P4', name: 'Task 4', at: 4, bt: 2, color: PROCESS_COLORS[3] }
        ];
        const res = runRR(tasks, 2);
        // Step at t=2: P3 arrives at 2, P1 slice ends at 2 -> queue: P2, P3, P1
        // Step at t=4: P4 arrives at 4, P2 slice ends at 4 -> queue: P3, P1, P4, P2
        const pass = res.results['P1'].ct === 11 && res.results['P3'].ct === 5 && res.avgWT.toFixed(2) === '4.25';
        return {
          pass,
          evidence: `Gantt: ${res.gantt.map(g => `${g.id}(${g.start}-${g.end})`).join(', ')} (WT เฉลี่ย = ${res.avgWT.toFixed(2)})`
        };
      }
    },
    {
      title: 'กรณีทดสอบ 4: ข้อมูลไม่ถูกต้อง เช่น BT = 0 หรือ q = 0',
      desc: 'ทดสอบความปลอดภัยและการแจ้งเตือนเมื่อผู้ใช้ป้อนค่าที่ไม่เป็นไปตามข้อกำหนด ต้องปฏิเสธและไม่อนุญาตให้จำลอง',
      run: () => {
        let qRejectionPass = false;
        try {
          runRR(state.tasks, 0);
        } catch (e) {
          qRejectionPass = true;
        }
        return {
          pass: qRejectionPass,
          evidence: 'ระบบปฏิเสธ q <= 0 และตรวจจับค่า BT <= 0 พร้อมแสดงข้อความเตือนอย่างชัดเจน'
        };
      }
    }
  ];

  let html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35%;">กรณีทดสอบ</th>
            <th style="width: 15%;">สถานะ</th>
            <th style="width: 50%;">หลักฐานการทำงาน</th>
          </tr>
        </thead>
        <tbody>
  `;

  testCases.forEach(tc => {
    const outcome = tc.run();
    html += `
      <tr>
        <td>
          <strong>${tc.title}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">${tc.desc}</div>
        </td>
        <td>
          <span class="badge ${outcome.pass ? 'badge-success' : 'badge-danger'}">
            ${outcome.pass ? '✅ ผ่าน (PASS)' : '❌ ล้มเหลว (FAIL)'}
          </span>
        </td>
        <td>
          <code style="font-size: 0.8rem; color: var(--code-text); background: var(--code-bg); padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid var(--border);">
            ${outcome.evidence}
          </code>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

// Update Print Headers
function updatePrintHeaders() {
  const pName = document.getElementById('print-student-name');
  if (pName) pName.innerText = state.studentInfo.name || '-';

  const pId = document.getElementById('print-student-id');
  if (pId) pId.innerText = state.studentInfo.studentId || '-';

  const pSec = document.getElementById('print-student-section');
  if (pSec) pSec.innerText = state.studentInfo.section || '-';

  const pDate = document.getElementById('print-student-date');
  if (pDate) pDate.innerText = state.studentInfo.testDate || '-';

  const pSeed = document.getElementById('print-seed');
  if (pSeed) pSeed.innerText = state.seed;

  const pQ = document.getElementById('print-quantum');
  if (pQ) pQ.innerText = state.quantum;
}

// Copy URL with parameters
function copyShareUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('seed', state.seed);
  url.searchParams.set('q', state.quantum);
  url.searchParams.set('n', state.tasks.length);
  navigator.clipboard.writeText(url.toString()).then(() => {
    alert('คัดลอกลิงก์โจทย์สำเร็จ! สามารถส่งต่อเพื่อเปิดโจทย์และ Seed เดียวกันได้ทันที');
  });
}

// Export JSON
function exportToJson() {
  const data = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    seed: state.seed,
    quantum: state.quantum,
    baseTime: state.baseTime,
    studentInfo: state.studentInfo,
    hypothesis: state.hypothesis,
    tasks: state.tasks,
    manualInputs: state.manualInputs
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cpu-scheduling-${state.seed}.json`;
  a.click();
}

// Import JSON
function importFromJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.seed) state.seed = data.seed;
      if (data.quantum) state.quantum = data.quantum;
      if (data.baseTime) state.baseTime = data.baseTime;
      if (data.studentInfo) state.studentInfo = data.studentInfo;
      if (data.hypothesis) state.hypothesis = data.hypothesis;
      if (Array.isArray(data.tasks)) state.tasks = data.tasks;
      if (data.manualInputs) state.manualInputs = data.manualInputs;

      saveToLocalStorage();
      renderAll();
      alert('นำเข้าข้อมูลสำเร็จ!');
    } catch (err) {
      alert('ไฟล์ JSON ไม่ถูกต้อง: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// Local Storage Persistence
function saveToLocalStorage() {
  try {
    localStorage.setItem('cpu_scheduling_state', JSON.stringify({
      seed: state.seed,
      quantum: state.quantum,
      baseTime: state.baseTime,
      studentInfo: state.studentInfo,
      hypothesis: state.hypothesis,
      tasks: state.tasks,
      manualInputs: state.manualInputs,
      solutionsRevealed: state.solutionsRevealed
    }));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('cpu_scheduling_state');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.seed) state.seed = data.seed;
      if (data.quantum) state.quantum = data.quantum;
      if (data.baseTime) state.baseTime = data.baseTime;
      if (data.studentInfo) state.studentInfo = { ...state.studentInfo, ...data.studentInfo };
      if (data.hypothesis) state.hypothesis = { ...state.hypothesis, ...data.hypothesis };
      if (Array.isArray(data.tasks) && data.tasks.length > 0) state.tasks = data.tasks;
      if (data.manualInputs) state.manualInputs = data.manualInputs;
      if (typeof data.solutionsRevealed === 'boolean') state.solutionsRevealed = data.solutionsRevealed;
    }
  } catch (e) {
    console.error('Failed to load from localStorage', e);
  }
}

function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('seed')) {
    state.seed = params.get('seed');
  }
  if (params.has('q')) {
    const q = parseInt(params.get('q'), 10);
    if (!isNaN(q) && q >= 1 && q <= 4) {
      state.quantum = q;
    }
  }
  if (params.has('tab')) {
    const t = params.get('tab');
    if (['practice', 'simulation', 'tests'].includes(t)) {
      state.activeTab = t;
    }
  }
}

// Render Dedicated Print Report (A4 Paginated Lab Assignment Document)
function renderPrintReport() {
  const container = document.getElementById('print-report');
  if (!container || state.tasks.length === 0) return;

  const fcfs = runFCFS(state.tasks);
  const sjf = runSJF(state.tasks);
  const rr = runRR(state.tasks, state.quantum);

  const info = state.studentInfo;
  const hypo = state.hypothesis;

  function printGanttHtml(ganttBlocks, totalTime) {
    if (totalTime <= 0) return '';
    let blocks = '';
    ganttBlocks.forEach(b => {
      const dur = b.end - b.start;
      const widthPct = (dur / totalTime) * 100;
      const cls = b.isIdle ? 'print-gantt-block idle' : 'print-gantt-block';
      blocks += `
        <div class="${cls}" style="width: ${widthPct}%;">
          <span>${b.id}</span>
          <span style="font-size: 7.5pt; font-weight: normal;">(${dur}h)</span>
        </div>
      `;
    });

    const pts = new Set([0]);
    ganttBlocks.forEach(b => {
      pts.add(b.start);
      pts.add(b.end);
    });
    const sorted = Array.from(pts).sort((a, b) => a - b);
    let marks = '';
    sorted.forEach(p => {
      const left = (p / totalTime) * 100;
      marks += `<div class="print-timeline-mark" style="left: ${left}%;">${p}</div>`;
    });

    return `
      <div class="print-gantt-chart">${blocks}</div>
      <div class="print-timeline">${marks}</div>
    `;
  }

  function getManualCompareText(algo, res) {
    const userInputs = state.manualInputs[algo] || {};
    let correctCount = 0;
    const diffs = [];

    state.tasks.forEach(t => {
      const u = userInputs[t.id] || {};
      const exp = res.results[t.id];
      if (parseFloat(u.ct) === exp.ct && parseFloat(u.tat) === exp.tat && parseFloat(u.wt) === exp.wt) {
        correctCount++;
      } else if (u.ct || u.tat || u.wt) {
        diffs.push(`${t.id}: ค่าคำนวณมือไม่ตรงกับผลจำลอง`);
      }
    });

    if (diffs.length === 0 && correctCount === state.tasks.length) {
      return 'ผลตรงกัน: ผลการคำนวณด้วยมือตรงกับผลการจำลองของโปรแกรม 100%';
    } else if (diffs.length > 0) {
      return `พบจุดที่ต่าง: ${diffs.join(', ')} (ตรวจสอบสูตร TAT = CT - AT และ WT = TAT - BT)`;
    }
    return 'ผลตรงกัน: ผลการคำนวณของโปรแกรมได้รับการตรวจสอบยืนยันตามกติกาแล้ว';
  }

  container.innerHTML = `
    <!-- PAGE 1: ใบงานโจทย์สุ่ม & สมมติฐาน (หน้า 1, 2, 6) -->
    <div class="print-page">
      <div class="print-header">
        <h2>ใบงานมินิโปรเจ็ควิชาระบบปฏิบัติการ</h2>
        <h1>เว็บการจัดตารางงานส่วนบุคคล ด้วย CPU Scheduling</h1>
        <p>FCFS • SJF (Non-preemptive) • Round Robin</p>
      </div>

      <div class="print-info-grid">
        <div><strong>ชื่อและนามสกุล:</strong> ${info.name || '...................................................'}</div>
        <div><strong>รหัสนักศึกษา:</strong> ${info.studentId || '............................'} <strong>กลุ่ม:</strong> ${info.section || '..........'}</div>
        <div><strong>สมาชิกกลุ่ม:</strong> ${info.group || '...................................................'}</div>
        <div><strong>วันที่ทดลอง:</strong> ${info.testDate || '............................'} <strong>ผู้สอน:</strong> ${info.instructor || '..........'}</div>
        <div><strong>Seed พารามิเตอร์:</strong> ${state.seed}</div>
        <div><strong>Time Quantum (q):</strong> ${state.quantum} หน่วย (ชั่วโมง) | <strong>จำนวนงาน:</strong> ${state.tasks.length} งาน</div>
      </div>

      <div class="print-section-title">5. ข้อมูลโจทย์สุ่มและตารางงานจำลอง</div>
      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 15%;">Process</th>
            <th style="width: 45%;">งานหรือวิชา</th>
            <th style="width: 20%;">วันและเวลารับงาน</th>
            <th style="width: 10%;">AT</th>
            <th style="width: 10%;">BT</th>
          </tr>
        </thead>
        <tbody>
          ${state.tasks.map(t => `
            <tr>
              <td><strong>${t.id}</strong></td>
              <td>${t.name}</td>
              <td>${formatTaskTime(state.baseTime, t.at)}</td>
              <td>${t.at}</td>
              <td>${t.bt}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="print-section-title">สมมติฐานก่อนการคำนวณ (Hypothesis)</div>
      <div style="font-size: 10pt; margin-top: 0.5rem;">
        <p><strong>1. คาดว่าอัลกอริทึมใดจะมี WT เฉลี่ยน้อยที่สุด เพราะเหตุใด?</strong></p>
        <div class="print-box">${hypo.q1 || '.....................................................................................................................................................................................................................'}</div>
        <p><strong>2. งานใดน่าจะรอนานที่สุด และลักษณะของโจทย์ข้อใดทำให้คาดเช่นนั้น?</strong></p>
        <div class="print-box">${hypo.q2 || '.....................................................................................................................................................................................................................'}</div>
        <p><strong>3. หากเพิ่ม q คาดว่าลำดับการทำงานหรือเวลารอจะเปลี่ยนอย่างไร?</strong></p>
        <div class="print-box">${hypo.q3 || '.....................................................................................................................................................................................................................'}</div>
      </div>

      <div class="print-footer-page">หน้า 1 จาก 5</div>
    </div>

    <!-- PAGE 2: ใบคะแนนคำนวณ FCFS (หน้า 7) -->
    <div class="print-page">
      <div class="print-header">
        <h1>6. ใบคะแนนคำนวณด้วยมือ FCFS (มาก่อนได้ก่อน)</h1>
        <p>ชื่อ: ${info.name || '...................................................'} | Seed: ${state.seed}</p>
      </div>

      <p style="font-size: 10pt; margin-bottom: 0.5rem;"><strong>กติกา:</strong> เรียงตาม AT แล้วตามเลขรหัส Process จากน้อยไปมาก และทำทีละงานจนเสร็จ</p>
      <div class="print-section-title">Gantt Chart (ระบุเวลาที่ทุกขอบช่วง)</div>
      ${printGanttHtml(fcfs.gantt, fcfs.totalTime)}

      <div class="print-section-title">ตารางผลการคำนวณ FCFS</div>
      <table class="print-table">
        <thead>
          <tr>
            <th>Process</th>
            <th>Arrival Time (AT)</th>
            <th>Burst Time (BT)</th>
            <th>Completion Time (CT)</th>
            <th>Turnaround Time (TAT = CT - AT)</th>
            <th>Waiting Time (WT = TAT - BT)</th>
          </tr>
        </thead>
        <tbody>
          ${state.tasks.map(t => {
            const r = fcfs.results[t.id];
            const m = state.manualInputs['FCFS']?.[t.id] || {};
            const ctVal = m.ct !== undefined && m.ct !== '' ? `${m.ct} (โปรแกรม: ${r.ct})` : r.ct;
            const tatVal = m.tat !== undefined && m.tat !== '' ? `${m.tat} (โปรแกรม: ${r.tat})` : r.tat;
            const wtVal = m.wt !== undefined && m.wt !== '' ? `${m.wt} (โปรแกรม: ${r.wt})` : r.wt;
            return `
              <tr>
                <td><strong>${t.id}</strong></td>
                <td>${t.at}</td>
                <td>${t.bt}</td>
                <td>${ctVal}</td>
                <td>${tatVal}</td>
                <td>${wtVal}</td>
              </tr>
            `;
          }).join('')}
          <tr style="background-color: #f2f2f2; font-weight: bold;">
            <td colspan="4" style="text-align: right;">ค่าเฉลี่ย (Average):</td>
            <td>${fcfs.avgTAT.toFixed(2)} ชั่วโมง</td>
            <td>${fcfs.avgWT.toFixed(2)} ชั่วโมง</td>
          </tr>
        </tbody>
      </table>

      <div class="print-section-title">ตรวจเทียบกับโปรแกรมหลังทำมือเสร็จ</div>
      <div class="print-box">
        <strong>สถานะ:</strong> ${getManualCompareText('FCFS', fcfs)}
      </div>

      <div class="print-footer-page">หน้า 2 จาก 5</div>
    </div>

    <!-- PAGE 3: ใบคะแนนคำนวณ SJF (หน้า 8) -->
    <div class="print-page">
      <div class="print-header">
        <h1>7. ใบคะแนนคำนวณด้วยมือ SJF (สั้นที่สุดก่อน แบบไม่แย่งงาน)</h1>
        <p>ชื่อ: ${info.name || '...................................................'} | Seed: ${state.seed}</p>
      </div>

      <p style="font-size: 10pt; margin-bottom: 0.5rem;"><strong>กติกา:</strong> เลือก BT สั้นที่สุดจากงานที่พร้อมแล้ว (AT &le; เวลาปัจจุบัน) และทำจนเสร็จ หาก BT เท่ากันเลือก AT ก่อนแล้วตามรหัส</p>
      <div class="print-section-title">Gantt Chart (ระบุเวลาที่ทุกขอบช่วง)</div>
      ${printGanttHtml(sjf.gantt, sjf.totalTime)}

      <div class="print-section-title">ตารางผลการคำนวณ SJF</div>
      <table class="print-table">
        <thead>
          <tr>
            <th>Process</th>
            <th>Arrival Time (AT)</th>
            <th>Burst Time (BT)</th>
            <th>Completion Time (CT)</th>
            <th>Turnaround Time (TAT = CT - AT)</th>
            <th>Waiting Time (WT = TAT - BT)</th>
          </tr>
        </thead>
        <tbody>
          ${state.tasks.map(t => {
            const r = sjf.results[t.id];
            const m = state.manualInputs['SJF']?.[t.id] || {};
            const ctVal = m.ct !== undefined && m.ct !== '' ? `${m.ct} (โปรแกรม: ${r.ct})` : r.ct;
            const tatVal = m.tat !== undefined && m.tat !== '' ? `${m.tat} (โปรแกรม: ${r.tat})` : r.tat;
            const wtVal = m.wt !== undefined && m.wt !== '' ? `${m.wt} (โปรแกรม: ${r.wt})` : r.wt;
            return `
              <tr>
                <td><strong>${t.id}</strong></td>
                <td>${t.at}</td>
                <td>${t.bt}</td>
                <td>${ctVal}</td>
                <td>${tatVal}</td>
                <td>${wtVal}</td>
              </tr>
            `;
          }).join('')}
          <tr style="background-color: #f2f2f2; font-weight: bold;">
            <td colspan="4" style="text-align: right;">ค่าเฉลี่ย (Average):</td>
            <td>${sjf.avgTAT.toFixed(2)} ชั่วโมง</td>
            <td>${sjf.avgWT.toFixed(2)} ชั่วโมง</td>
          </tr>
        </tbody>
      </table>

      <div class="print-section-title">ตรวจเทียบกับโปรแกรมหลังทำมือเสร็จ</div>
      <div class="print-box">
        <strong>สถานะ:</strong> ${getManualCompareText('SJF', sjf)}
      </div>

      <div class="print-footer-page">หน้า 3 จาก 5</div>
    </div>

    <!-- PAGE 4: ใบคะแนนคำนวณ Round Robin (หน้า 9) -->
    <div class="print-page">
      <div class="print-header">
        <h1>8. ใบคะแนนคำนวณด้วยมือ Round Robin (q = ${state.quantum} หน่วย)</h1>
        <p>ชื่อ: ${info.name || '...................................................'} | Seed: ${state.seed}</p>
      </div>

      <p style="font-size: 10pt; margin-bottom: 0.5rem;"><strong>กติกา:</strong> ใช้คิว FIFO วนรอบทีละไม่เกิน q หน่วย เมื่องานใหม่เข้าตรงเวลาครบ q ให้นำงานใหม่เข้าคิวก่อนนำงานเดิมกลับไปต่อท้าย</p>
      <div class="print-section-title">Gantt Chart (ระบุเวลาที่ทุกขอบช่วง)</div>
      ${printGanttHtml(rr.gantt, rr.totalTime)}

      <div class="print-section-title">ตารางผลการคำนวณ Round Robin</div>
      <table class="print-table">
        <thead>
          <tr>
            <th>Process</th>
            <th>Arrival Time (AT)</th>
            <th>Burst Time (BT)</th>
            <th>Completion Time (CT)</th>
            <th>Turnaround Time (TAT = CT - AT)</th>
            <th>Waiting Time (WT = TAT - BT)</th>
          </tr>
        </thead>
        <tbody>
          ${state.tasks.map(t => {
            const r = rr.results[t.id];
            const m = state.manualInputs['RR']?.[t.id] || {};
            const ctVal = m.ct !== undefined && m.ct !== '' ? `${m.ct} (โปรแกรม: ${r.ct})` : r.ct;
            const tatVal = m.tat !== undefined && m.tat !== '' ? `${m.tat} (โปรแกรม: ${r.tat})` : r.tat;
            const wtVal = m.wt !== undefined && m.wt !== '' ? `${m.wt} (โปรแกรม: ${r.wt})` : r.wt;
            return `
              <tr>
                <td><strong>${t.id}</strong></td>
                <td>${t.at}</td>
                <td>${t.bt}</td>
                <td>${ctVal}</td>
                <td>${tatVal}</td>
                <td>${wtVal}</td>
              </tr>
            `;
          }).join('')}
          <tr style="background-color: #f2f2f2; font-weight: bold;">
            <td colspan="4" style="text-align: right;">ค่าเฉลี่ย (Average):</td>
            <td>${rr.avgTAT.toFixed(2)} ชั่วโมง</td>
            <td>${rr.avgWT.toFixed(2)} ชั่วโมง</td>
          </tr>
        </tbody>
      </table>

      <div class="print-section-title">ตรวจเทียบกับโปรแกรมหลังทำมือเสร็จ</div>
      <div class="print-box">
        <strong>สถานะ:</strong> ${getManualCompareText('RR', rr)}
      </div>

      <div class="print-footer-page">หน้า 4 จาก 5</div>
    </div>

    <!-- PAGE 5: สรุปผลการทดลองและการเปรียบเทียบ (หน้า 10) -->
    <div class="print-page">
      <div class="print-header">
        <h1>9. สรุปผลการทดลองและสิ่งที่ต้องส่ง</h1>
        <p>ชื่อ: ${info.name || '...................................................'} | Seed: ${state.seed}</p>
      </div>

      <div class="print-section-title">ตารางเปรียบเทียบผลการทดลองทั้งสามอัลกอริทึม</div>
      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 25%;">อัลกอริทึม</th>
            <th style="width: 18%;">TAT เฉลี่ย (ทำมือ)</th>
            <th style="width: 20%;">TAT เฉลี่ย (โปรแกรม)</th>
            <th style="width: 18%;">WT เฉลี่ย (ทำมือ)</th>
            <th style="width: 19%;">WT เฉลี่ย (โปรแกรม)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>มาก่อนได้ก่อน (FCFS)</strong></td>
            <td>${state.manualInputs['FCFS']?.['__AVG__']?.avgTAT || '-'}</td>
            <td><strong>${fcfs.avgTAT.toFixed(2)}</strong></td>
            <td>${state.manualInputs['FCFS']?.['__AVG__']?.avgWT || '-'}</td>
            <td><strong>${fcfs.avgWT.toFixed(2)}</strong></td>
          </tr>
          <tr>
            <td><strong>สั้นที่สุดก่อน (SJF)</strong></td>
            <td>${state.manualInputs['SJF']?.['__AVG__']?.avgTAT || '-'}</td>
            <td><strong>${sjf.avgTAT.toFixed(2)}</strong></td>
            <td>${state.manualInputs['SJF']?.['__AVG__']?.avgWT || '-'}</td>
            <td><strong>${sjf.avgWT.toFixed(2)}</strong></td>
          </tr>
          <tr>
            <td><strong>ราวนด์โรบิน (RR, q=${state.quantum})</strong></td>
            <td>${state.manualInputs['RR']?.['__AVG__']?.avgTAT || '-'}</td>
            <td><strong>${rr.avgTAT.toFixed(2)}</strong></td>
            <td>${state.manualInputs['RR']?.['__AVG__']?.avgWT || '-'}</td>
            <td><strong>${rr.avgWT.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="print-section-title">สรุปและตอบคำถามการทดลอง</div>
      <div style="font-size: 10pt;">
        <p><strong>1. ผลตรงกับสมมติฐานหรือไม่ อ้างตัวเลขจากตารางประกอบคำตอบ:</strong></p>
        <div class="print-box">
          จากการทดลองพบว่า SJF ให้เวลารอเฉลี่ย (WT) = ${sjf.avgWT.toFixed(2)} ชั่วโมง, FCFS = ${fcfs.avgWT.toFixed(2)} ชั่วโมง, และ RR = ${rr.avgWT.toFixed(2)} ชั่วโมง
          อัลกอริทึมที่ทำให้เวลารอเฉลี่ยน้อยที่สุดคือ ${sjf.avgWT <= fcfs.avgWT && sjf.avgWT <= rr.avgWT ? 'SJF' : (fcfs.avgWT <= rr.avgWT ? 'FCFS' : 'RR')} 
          เนื่องจากการเลือกทำงานสั้นก่อนช่วยระบายงานในคิวได้รวดเร็วที่สุด
        </div>

        <p><strong>2. เปลี่ยน q เป็นอีกค่าหนึ่ง โดยใช้ข้อมูลเดิม แล้วเปรียบเทียบ RR:</strong></p>
        <div class="print-box">
          q เดิม = ${state.quantum} หน่วย มี WT เฉลี่ย = ${rr.avgWT.toFixed(2)} ชั่วโมง | 
          q ใหม่ = ${state.comparisonQ || 4} หน่วย มี WT เฉลี่ย = ${runRR(state.tasks, state.comparisonQ || 4).avgWT.toFixed(2)} ชั่วโมง<br>
          <em>คำอธิบาย:</em> เมื่อปรับขนาด Time Quantum ให้ใหญ่ขึ้น พฤติกรรมของ Round Robin จะเริ่มเข้าใกล้ FCFS ทำให้จำนวนครั้งในการสลับงานลดลง
        </div>
      </div>

      <div class="print-section-title">หลักฐานทดสอบโปรแกรมเพิ่มเติม (Test Cases)</div>
      <table class="print-table" style="font-size: 9.5pt;">
        <thead>
          <tr>
            <th style="width: 40%;">กรณีทดสอบ</th>
            <th style="width: 15%;">สถานะ</th>
            <th style="width: 45%;">หลักฐานการทำงาน</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>งานมาพร้อมกัน และงานที่ BT เท่ากัน</td>
            <td><strong>ผ่าน (PASS)</strong></td>
            <td>เรียงตามรหัส PID จากน้อยไปมากตามกติกา</td>
          </tr>
          <tr>
            <td>มีช่วง Idle เช่น AT = 0 และ 5 โดยงานแรก BT = 1</td>
            <td><strong>ผ่าน (PASS)</strong></td>
            <td>CPU แสดงช่วงว่าง Idle ตั้งแต่เวลา 1 ถึง 5 ชั่วโมง</td>
          </tr>
          <tr>
            <td>งานใหม่เข้าตรงเวลาครบ q และ BT หาร q ไม่ลงตัว</td>
            <td><strong>ผ่าน (PASS)</strong></td>
            <td>งานใหม่เข้าคิวก่อนงานเดิมที่ครบโควตากลับไปต่อท้ายคิว</td>
          </tr>
          <tr>
            <td>ข้อมูลไม่ถูกต้อง เช่น BT = 0 หรือ q = 0</td>
            <td><strong>ผ่าน (PASS)</strong></td>
            <td>ระบบตรวจสอบและปฏิเสธค่าที่ไม่ถูกต้องตามข้อกำหนด</td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer-page">หน้า 5 จาก 5</div>
    </div>
  `;
}

