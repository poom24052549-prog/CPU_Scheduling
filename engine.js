/**
 * CPU Scheduling Core Engine
 * Algorithms: FCFS, SJF (Non-preemptive), Round Robin
 * Strictly follows the rules of the OS Mini-Project Lab Specification:
 * - 1 core CPU, single worker, BT > 0, AT >= 0, no I/O, context switch = 0
 * - Selects ready jobs (AT <= current time)
 * - If no job is ready, outputs Idle until the next arrival
 * - Tie-breaker: numeric Process ID ascending (e.g. P1 before P2)
 * - SJF: non-preemptive, smallest BT. Tie-break: smaller AT, then smaller PID
 * - RR: FIFO queue. If new job arrives at exact quantum completion, new job enters queue BEFORE preempted job.
 */

// PRNG: Mulberry32 for 100% reproducible seeds
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseSeed(seedInput) {
  if (typeof seedInput === 'number') return seedInput >>> 0;
  if (!seedInput) return Math.floor(Math.random() * 1000000);
  let hash = 0;
  for (let i = 0; i < seedInput.length; i++) {
    hash = Math.imul(31, hash) + seedInput.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}

// Extract numeric ID for tie breaking (e.g. 'P2' -> 2, 'P10' -> 10)
function getPidNum(pid) {
  const match = pid.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function comparePid(a, b) {
  const numA = getPidNum(a.id);
  const numB = getPidNum(b.id);
  if (numA !== numB) return numA - numB;
  return a.id.localeCompare(b.id);
}

// Deep copy process list
function cloneProcesses(processes) {
  return processes.map(p => ({
    id: p.id,
    name: p.name || p.id,
    at: parseInt(p.at, 10),
    bt: parseInt(p.bt, 10),
    color: p.color
  }));
}

/**
 * FCFS (First-Come, First-Served)
 */
function runFCFS(processes) {
  const procs = cloneProcesses(processes);
  // Sort by AT, then numeric PID
  procs.sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at;
    return comparePid(a, b);
  });

  let currentTime = 0;
  const gantt = [];
  const results = {};
  const steps = [];

  procs.forEach(p => {
    results[p.id] = { ...p, ct: 0, tat: 0, wt: 0, startTime: -1 };
  });

  for (const p of procs) {
    if (currentTime < p.at) {
      // Idle period
      gantt.push({
        id: 'Idle',
        name: 'ว่าง (Idle)',
        start: currentTime,
        end: p.at,
        isIdle: true
      });
      steps.push({
        time: currentTime,
        event: `CPU ว่าง (Idle) จนถึงเวลา ${p.at} เมื่องาน ${p.id} มาถึง`,
        queue: []
      });
      currentTime = p.at;
    }

    const start = currentTime;
    const end = currentTime + p.bt;
    gantt.push({
      id: p.id,
      name: p.name,
      start: start,
      end: end,
      color: p.color,
      isIdle: false
    });

    results[p.id].startTime = start;
    results[p.id].ct = end;
    results[p.id].tat = end - p.at;
    results[p.id].wt = results[p.id].tat - p.bt;

    steps.push({
      time: start,
      event: `เริ่มทำงาน ${p.id} (${p.name}) เวลา ${start} ถึง ${end} (เสร็จสมบูรณ์)`,
      running: p.id
    });

    currentTime = end;
  }

  // Calculate Averages
  const n = procs.length;
  const sumTAT = procs.reduce((acc, p) => acc + results[p.id].tat, 0);
  const sumWT = procs.reduce((acc, p) => acc + results[p.id].wt, 0);

  return {
    algorithm: 'FCFS',
    name: 'First-Come, First-Served',
    nameTh: 'มาก่อนได้ก่อน (FCFS)',
    gantt,
    results,
    steps,
    totalTime: currentTime,
    sumTAT,
    sumWT,
    avgTAT: n > 0 ? sumTAT / n : 0,
    avgWT: n > 0 ? sumWT / n : 0
  };
}

/**
 * SJF (Shortest Job First - Non-preemptive)
 * "SJF แบบไม่แย่งเลือก BT น้อยที่สุดเมื่อว่าง ถ้า BT เท่ากันให้เลือก AT ก่อน แล้วตามรหัส"
 */
function runSJF(processes) {
  const procs = cloneProcesses(processes);
  const unfinished = [...procs];
  let currentTime = 0;
  const gantt = [];
  const results = {};
  const steps = [];

  procs.forEach(p => {
    results[p.id] = { ...p, ct: 0, tat: 0, wt: 0, startTime: -1 };
  });

  while (unfinished.length > 0) {
    // Find ready processes (AT <= currentTime)
    const ready = unfinished.filter(p => p.at <= currentTime);

    if (ready.length === 0) {
      // Find next arrival time
      const nextAT = Math.min(...unfinished.map(p => p.at));
      gantt.push({
        id: 'Idle',
        name: 'ว่าง (Idle)',
        start: currentTime,
        end: nextAT,
        isIdle: true
      });
      steps.push({
        time: currentTime,
        event: `ไม่มีงานพร้อมทำ CPU ว่าง (Idle) จากเวลา ${currentTime} ถึง ${nextAT}`,
        queue: []
      });
      currentTime = nextAT;
      continue;
    }

    // Sort ready by:
    // 1. BT ascending
    // 2. AT ascending
    // 3. numeric PID ascending
    ready.sort((a, b) => {
      if (a.bt !== b.bt) return a.bt - b.bt;
      if (a.at !== b.at) return a.at - b.at;
      return comparePid(a, b);
    });

    const chosen = ready[0];
    const start = currentTime;
    const end = currentTime + chosen.bt;

    gantt.push({
      id: chosen.id,
      name: chosen.name,
      start: start,
      end: end,
      color: chosen.color,
      isIdle: false
    });

    results[chosen.id].startTime = start;
    results[chosen.id].ct = end;
    results[chosen.id].tat = end - chosen.at;
    results[chosen.id].wt = results[chosen.id].tat - chosen.bt;

    steps.push({
      time: start,
      event: `เลือกงาน ${chosen.id} (BT=${chosen.bt}) จากคิวที่พร้อม (${ready.map(r => r.id).join(', ')}) ทำงานจนเสร็จเวลา ${end}`,
      running: chosen.id,
      readyQueue: ready.map(r => r.id)
    });

    currentTime = end;
    // Remove chosen from unfinished
    const idx = unfinished.findIndex(p => p.id === chosen.id);
    unfinished.splice(idx, 1);
  }

  const n = procs.length;
  const sumTAT = procs.reduce((acc, p) => acc + results[p.id].tat, 0);
  const sumWT = procs.reduce((acc, p) => acc + results[p.id].wt, 0);

  return {
    algorithm: 'SJF',
    name: 'Shortest Job First (Non-preemptive)',
    nameTh: 'งานสั้นที่สุดก่อน แบบไม่แย่งงาน (SJF)',
    gantt,
    results,
    steps,
    totalTime: currentTime,
    sumTAT,
    sumWT,
    avgTAT: n > 0 ? sumTAT / n : 0,
    avgWT: n > 0 ? sumWT / n : 0
  };
}

/**
 * Round Robin (RR)
 * Rule:
 * - Uses FIFO queue.
 * - Max slice = q.
 * - When current job slice expires:
 *   NEW arrivals at or before current time (currentTime < arrival <= sliceEnd)
 *   MUST ENTER THE QUEUE BEFORE the preempted job is re-added!
 *   If the preempted job completed, it is not re-added.
 * - New arrivals arriving at the same time are ordered by AT, then numeric PID.
 */
function runRR(processes, quantum) {
  const q = parseInt(quantum, 10);
  if (isNaN(q) || q <= 0) {
    throw new Error('ค่า Time Quantum (q) ต้องเป็นจำนวนเต็มบวก 1-4');
  }

  const procs = cloneProcesses(processes).map(p => ({
    ...p,
    remainingBT: p.bt
  }));

  const results = {};
  procs.forEach(p => {
    results[p.id] = { ...p, ct: 0, tat: 0, wt: 0, firstStart: -1 };
  });

  const unarrived = [...procs].sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at;
    return comparePid(a, b);
  });

  let currentTime = 0;
  const readyQueue = [];
  const gantt = [];
  const steps = [];

  // Enqueue initial arrivals at t = 0
  const initialArrivals = [];
  while (unarrived.length > 0 && unarrived[0].at <= 0) {
    initialArrivals.push(unarrived.shift());
  }
  initialArrivals.sort((a, b) => comparePid(a, b));
  initialArrivals.forEach(p => readyQueue.push(p));

  if (readyQueue.length > 0) {
    steps.push({
      time: 0,
      event: `เวลา 0: งาน ${initialArrivals.map(p => p.id).join(', ')} เข้าสู่คิวพร้อม (Ready Queue: [${readyQueue.map(p => p.id).join(', ')}])`,
      readyQueue: readyQueue.map(p => p.id)
    });
  }

  while (readyQueue.length > 0 || unarrived.length > 0) {
    if (readyQueue.length === 0) {
      // Idle gap until next arrival
      const nextAT = unarrived[0].at;
      gantt.push({
        id: 'Idle',
        name: 'ว่าง (Idle)',
        start: currentTime,
        end: nextAT,
        isIdle: true
      });

      steps.push({
        time: currentTime,
        event: `คิวว่าง CPU พัก (Idle) จากเวลา ${currentTime} ถึง ${nextAT}`,
        readyQueue: []
      });

      currentTime = nextAT;
      // Arriving jobs at nextAT
      const newArrivals = [];
      while (unarrived.length > 0 && unarrived[0].at <= currentTime) {
        newArrivals.push(unarrived.shift());
      }
      newArrivals.sort((a, b) => {
        if (a.at !== b.at) return a.at - b.at;
        return comparePid(a, b);
      });
      newArrivals.forEach(p => readyQueue.push(p));
      continue;
    }

    // Pop the next job from FIFO queue
    const current = readyQueue.shift();
    if (results[current.id].firstStart === -1) {
      results[current.id].firstStart = currentTime;
    }

    const execTime = Math.min(q, current.remainingBT);
    const start = currentTime;
    const end = currentTime + execTime;

    gantt.push({
      id: current.id,
      name: current.name,
      start: start,
      end: end,
      color: current.color,
      isIdle: false
    });

    current.remainingBT -= execTime;

    // Check newly arrived jobs during (start, end]
    // Crucial rule: new jobs arriving up to end must enter queue BEFORE current is re-enqueued!
    const newArrivals = [];
    while (unarrived.length > 0 && unarrived[0].at <= end) {
      newArrivals.push(unarrived.shift());
    }
    // Sort new arrivals by AT, then numeric PID
    newArrivals.sort((a, b) => {
      if (a.at !== b.at) return a.at - b.at;
      return comparePid(a, b);
    });

    newArrivals.forEach(p => readyQueue.push(p));

    let eventDesc = `เวลา ${start}-${end}: ทำงาน ${current.id} จำนวน ${execTime} หน่วย (เหลือ ${current.remainingBT})`;

    if (newArrivals.length > 0) {
      eventDesc += ` | มีงานใหม่เข้า: ${newArrivals.map(p => `${p.id}(AT=${p.at})`).join(', ')}`;
    }

    if (current.remainingBT === 0) {
      // Completed!
      results[current.id].ct = end;
      results[current.id].tat = end - current.at;
      results[current.id].wt = results[current.id].tat - current.bt;
      eventDesc += ` | ${current.id} ทำเสร็จสมบูรณ์ที่เวลา ${end}!`;
    } else {
      // Re-enqueue preempted job
      readyQueue.push(current);
      eventDesc += ` | ${current.id} ครบ Quantum ${q} ถูกนำกลับไปต่อท้ายคิว`;
    }

    steps.push({
      time: start,
      endTime: end,
      running: current.id,
      event: eventDesc,
      readyQueue: readyQueue.map(p => p.id),
      remainingBT: current.remainingBT
    });

    currentTime = end;
  }

  const n = procs.length;
  const sumTAT = procs.reduce((acc, p) => acc + results[p.id].tat, 0);
  const sumWT = procs.reduce((acc, p) => acc + results[p.id].wt, 0);

  return {
    algorithm: 'RR',
    name: `Round Robin (q = ${q})`,
    nameTh: `ราวนด์โรบิน (Round Robin, q = ${q})`,
    quantum: q,
    gantt,
    results,
    steps,
    totalTime: currentTime,
    sumTAT,
    sumWT,
    avgTAT: n > 0 ? sumTAT / n : 0,
    avgWT: n > 0 ? sumWT / n : 0
  };
}

// Export for module or browser window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mulberry32,
    parseSeed,
    comparePid,
    runFCFS,
    runSJF,
    runRR
  };
}
