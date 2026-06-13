const sessions = [
  'Sat 06 Jul', 'Sun 07 Jul', 'Sat 13 Jul', 'Sun 14 Jul',
  'Sat 20 Jul', 'Sun 21 Jul', 'Sat 27 Jul', 'Sun 28 Jul',
  'Sat 03 Aug', 'Sun 04 Aug', 'Sat 10 Aug', 'Sun 11 Aug',
  'Sat 17 Aug', 'Sun 18 Aug', 'Sat 24 Aug', 'Sun 25 Aug'
].map((date, i) => ({ id: `S${i + 1}`, date, capacity: 10 }));

const sampleNames = ['Aisha Khan','Bilal Ahmed','Sara Ali','Omar Siddiqui','Fatima Noor','Hamza Malik','Maya Shah','Usman Raza','Zara Hussain','Danish Iqbal','Hira Sheikh','Ahmed Khan'];
let volunteers = JSON.parse(localStorage.getItem('volunteers') || '[]');
let assignments = JSON.parse(localStorage.getItem('assignments') || '[]');
let sessionConfig = JSON.parse(localStorage.getItem('sessions') || JSON.stringify(sessions));

const save = () => {
  localStorage.setItem('volunteers', JSON.stringify(volunteers));
  localStorage.setItem('assignments', JSON.stringify(assignments));
  localStorage.setItem('sessions', JSON.stringify(sessionConfig));
};

const $ = id => document.getElementById(id);

function renderAvailabilityList() {
  $('availabilityList').innerHTML = sessionConfig.map(s => `
    <label class="date-option">
      <input type="checkbox" value="${s.id}" />
      <span>${s.date}</span>
    </label>`).join('');
}

function renderStats() {
  $('volunteerCount').textContent = volunteers.length;
  $('sessionCount').textContent = sessionConfig.length;
  const totalCapacity = sessionConfig.reduce((sum, s) => sum + Number(s.capacity), 0);
  const required = volunteers.length * 8;
  const complete = volunteers.filter(v => assignments.filter(a => a.volunteerId === v.id).length === 8).length;
  $('adminStats').innerHTML = [
    ['Required assignments', required],
    ['Total capacity', totalCapacity],
    ['Fully scheduled', complete]
  ].map(([label, value]) => `<article class="card stat"><span>${value}</span><p>${label}</p></article>`).join('');
}

function renderSessions() {
  const counts = Object.fromEntries(sessionConfig.map(s => [s.id, assignments.filter(a => a.sessionId === s.id).length]));
  $('sessionsTable').innerHTML = `<thead><tr><th>Date</th><th>Capacity</th><th>Assigned</th><th>Remaining</th></tr></thead><tbody>` +
    sessionConfig.map(s => `
      <tr>
        <td>${s.date}</td>
        <td><input type="number" min="1" value="${s.capacity}" data-capacity="${s.id}" /></td>
        <td>${counts[s.id] || 0}</td>
        <td>${Number(s.capacity) - (counts[s.id] || 0)}</td>
      </tr>`).join('') + '</tbody>';
  document.querySelectorAll('[data-capacity]').forEach(input => {
    input.addEventListener('change', e => {
      const session = sessionConfig.find(s => s.id === e.target.dataset.capacity);
      session.capacity = Math.max(1, Number(e.target.value));
      save(); renderAll();
    });
  });
}

function renderVolunteers() {
  $('volunteersTable').innerHTML = `<thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Available dates</th></tr></thead><tbody>` +
    volunteers.map(v => `<tr><td>${v.name}</td><td>${v.email}</td><td>${v.phone}</td><td><span class="pill">${v.availability.length}</span></td></tr>`).join('') +
    '</tbody>';
}

function renderSchedule() {
  const rows = volunteers.map(v => {
    const assigned = assignments.filter(a => a.volunteerId === v.id).map(a => sessionConfig.find(s => s.id === a.sessionId)?.date).filter(Boolean);
    const status = assigned.length === 8 ? '<span class="pill">Complete</span>' : `<span class="bad">Needs ${8 - assigned.length}</span>`;
    return `<tr><td>${v.name}</td><td>${assigned.join(', ') || 'Not scheduled'}</td><td>${assigned.length}/8</td><td>${status}</td></tr>`;
  }).join('');
  $('scheduleTable').innerHTML = `<thead><tr><th>Volunteer</th><th>Assigned sessions</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows}</tbody>`;
}

function renderConflicts(messages = []) {
  $('conflicts').innerHTML = messages.map(m => `<div class="conflict">${m}</div>`).join('');
}

function renderAll() {
  renderStats(); renderSessions(); renderVolunteers(); renderSchedule();
}

function generateSchedule() {
  assignments = [];
  const messages = [];
  const sessionLoad = Object.fromEntries(sessionConfig.map(s => [s.id, 0]));
  const ordered = [...volunteers].sort((a, b) => a.availability.length - b.availability.length);

  ordered.forEach(v => {
    if (v.availability.length < 8) {
      messages.push(`${v.name} selected fewer than 8 available dates.`);
      return;
    }
    const options = v.availability
      .filter(id => sessionLoad[id] < sessionConfig.find(s => s.id === id).capacity)
      .sort((a, b) => sessionLoad[a] - sessionLoad[b]);
    const chosen = options.slice(0, 8);
    chosen.forEach(sessionId => {
      assignments.push({ volunteerId: v.id, sessionId });
      sessionLoad[sessionId] += 1;
    });
    if (chosen.length < 8) messages.push(`${v.name} could only be assigned ${chosen.length} of 8 sessions because available sessions were full.`);
  });

  save();
  renderAll();
  renderConflicts(messages.length ? messages : ['No conflicts found. All possible volunteers were scheduled successfully.']);
}

function addVolunteer(volunteer) {
  const exists = volunteers.some(v => v.email.toLowerCase() === volunteer.email.toLowerCase());
  if (exists) throw new Error('A volunteer with this email is already registered.');
  volunteers.push({ id: crypto.randomUUID(), ...volunteer });
  assignments = [];
  save(); renderAll();
}

$('volunteerForm').addEventListener('submit', e => {
  e.preventDefault();
  const availability = [...document.querySelectorAll('#availabilityList input:checked')].map(i => i.value);
  const msg = $('formMessage');
  try {
    if (availability.length < 8) throw new Error('Please select at least 8 available dates.');
    addVolunteer({ name: $('name').value.trim(), email: $('email').value.trim(), phone: $('phone').value.trim(), availability });
    e.target.reset();
    msg.textContent = 'Registration saved successfully.';
    msg.className = 'message ok';
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'message bad';
  }
});

$('loadSample').addEventListener('click', () => {
  sampleNames.forEach((name, index) => {
    const availability = sessionConfig.filter((_, i) => (i + index) % 3 !== 0).map(s => s.id).slice(0, 12);
    const email = name.toLowerCase().replaceAll(' ', '.') + '@example.com';
    if (!volunteers.some(v => v.email === email)) volunteers.push({ id: crypto.randomUUID(), name, email, phone: `0300-000-${String(index).padStart(4, '0')}`, availability });
  });
  assignments = [];
  save(); renderAll(); renderConflicts([]);
});

$('generate').addEventListener('click', generateSchedule);
$('reset').addEventListener('click', () => {
  volunteers = []; assignments = []; sessionConfig = sessions;
  localStorage.clear(); save(); renderAvailabilityList(); renderAll(); renderConflicts([]);
});
$('exportCsv').addEventListener('click', () => {
  const header = 'Volunteer,Email,Assigned Sessions\n';
  const body = volunteers.map(v => {
    const dates = assignments.filter(a => a.volunteerId === v.id).map(a => sessionConfig.find(s => s.id === a.sessionId)?.date).join(' | ');
    return `"${v.name}","${v.email}","${dates}"`;
  }).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'volunteer-schedule.csv'; a.click();
  URL.revokeObjectURL(url);
});

renderAvailabilityList();
renderAll();
