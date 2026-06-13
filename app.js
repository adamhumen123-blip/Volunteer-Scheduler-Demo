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
let isPublished = JSON.parse(localStorage.getItem('isPublished') || 'false');
let lastConflicts = JSON.parse(localStorage.getItem('lastConflicts') || '[]');

const save = () => {
  localStorage.setItem('volunteers', JSON.stringify(volunteers));
  localStorage.setItem('assignments', JSON.stringify(assignments));
  localStorage.setItem('sessions', JSON.stringify(sessionConfig));
  localStorage.setItem('isPublished', JSON.stringify(isPublished));
  localStorage.setItem('lastConflicts', JSON.stringify(lastConflicts));
};

const $ = id => document.getElementById(id);

function renderAvailabilityList() {
  $('availabilityList').innerHTML = sessionConfig.map(s => `
    <label class="date-option">
      <input type="checkbox" value="${s.id}" />
      <span>${s.date}</span>
    </label>`).join('');
}

function renderPublishStatus() {
  const status = $('publishStatus');
  status.textContent = isPublished ? 'Published schedule' : 'Draft schedule';
  status.className = isPublished ? 'pill success' : 'pill';
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
  $('sessionsTable').innerHTML = `<thead><tr><th>Date</th><th>Capacity</th><th>Assigned</th><th>Remaining</th><th>Status</th></tr></thead><tbody>` +
    sessionConfig.map(s => {
      const assigned = counts[s.id] || 0;
      const remaining = Number(s.capacity) - assigned;
      return `<tr>
        <td>${s.date}</td>
        <td><input type="number" min="1" value="${s.capacity}" data-capacity="${s.id}" /></td>
        <td>${assigned}</td>
        <td>${remaining}</td>
        <td>${remaining === 0 ? '<span class="pill">Full</span>' : '<span class="pill">Open</span>'}</td>
      </tr>`;
    }).join('') + '</tbody>';
  document.querySelectorAll('[data-capacity]').forEach(input => {
    input.addEventListener('change', e => {
      const session = sessionConfig.find(s => s.id === e.target.dataset.capacity);
      session.capacity = Math.max(1, Number(e.target.value));
      isPublished = false;
      save(); renderAll();
    });
  });
}

function renderVolunteers() {
  $('volunteersTable').innerHTML = `<thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Available dates</th><th>Assigned</th></tr></thead><tbody>` +
    volunteers.map(v => {
      const assigned = assignments.filter(a => a.volunteerId === v.id).length;
      return `<tr><td>${v.name}</td><td>${v.email}</td><td>${v.phone}</td><td><span class="pill">${v.availability.length}</span></td><td>${assigned}/8</td></tr>`;
    }).join('') + '</tbody>';
}

function renderSchedule() {
  const rows = volunteers.map(v => {
    const assigned = assignments.filter(a => a.volunteerId === v.id).map(a => sessionConfig.find(s => s.id === a.sessionId)?.date).filter(Boolean);
    const status = assigned.length === 8 ? '<span class="pill">Complete</span>' : `<span class="bad">Needs ${8 - assigned.length}</span>`;
    return `<tr><td>${v.name}</td><td>${assigned.join(', ') || 'Not scheduled'}</td><td>${assigned.length}/8</td><td>${status}</td></tr>`;
  }).join('');
  $('scheduleTable').innerHTML = `<thead><tr><th>Volunteer</th><th>Assigned sessions</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows}</tbody>`;
}

function renderConflicts(messages = lastConflicts) {
  lastConflicts = messages;
  if (!messages.length) {
    $('conflicts').innerHTML = '<div class="conflict notice">Run the scheduler to see conflicts and suggested fixes.</div>';
    return;
  }
  $('conflicts').innerHTML = messages.map(item => `
    <div class="conflict ${item.type === 'success' ? 'okbox' : item.type === 'error' ? 'badbox' : ''}">
      <strong>${item.title}</strong>
      <p>${item.detail}</p>
      <p><b>Suggested fix:</b> ${item.fix}</p>
    </div>`).join('');
}

function renderAll() {
  renderPublishStatus(); renderStats(); renderSessions(); renderVolunteers(); renderSchedule(); renderConflicts();
}

function generateSchedule() {
  assignments = [];
  isPublished = false;
  const messages = [];
  const totalCapacity = sessionConfig.reduce((sum, s) => sum + Number(s.capacity), 0);
  const required = volunteers.length * 8;
  if (totalCapacity < required) {
    messages.push({ type: 'error', title: 'Programme capacity is too low', detail: `The programme needs ${required} seats but only ${totalCapacity} seats are available.`, fix: 'Increase session capacity, add more training dates, or reduce required sessions.' });
  }

  const sessionLoad = Object.fromEntries(sessionConfig.map(s => [s.id, 0]));
  const ordered = [...volunteers].sort((a, b) => a.availability.length - b.availability.length);

  ordered.forEach(v => {
    if (v.availability.length < 8) {
      messages.push({ type: 'error', title: `${v.name} cannot be scheduled yet`, detail: `${v.name} selected only ${v.availability.length} available dates, but each volunteer needs exactly 8 sessions.`, fix: 'Ask the volunteer to select more dates or add an admin override.' });
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
    if (chosen.length < 8) {
      const blocked = v.availability.filter(id => sessionLoad[id] >= sessionConfig.find(s => s.id === id).capacity).map(id => sessionConfig.find(s => s.id === id).date);
      messages.push({ type: 'error', title: `${v.name} is short by ${8 - chosen.length} session(s)`, detail: `The volunteer was assigned ${chosen.length}/8 sessions. Full or unavailable dates include: ${blocked.join(', ') || 'none listed'}.`, fix: 'Increase capacity on the listed dates, ask for more availability, or manually move another volunteer.' });
    }
  });

  const fullSessions = sessionConfig.filter(s => sessionLoad[s.id] >= Number(s.capacity)).map(s => s.date);
  if (fullSessions.length) {
    messages.push({ type: 'warning', title: 'Some sessions are full', detail: `${fullSessions.length} session(s) reached capacity: ${fullSessions.join(', ')}.`, fix: 'Review full sessions before publishing and increase capacity if those dates are critical.' });
  }
  if (!messages.some(m => m.type === 'error')) {
    messages.unshift({ type: 'success', title: 'Schedule is ready to publish', detail: 'Every registered volunteer who had enough availability was assigned exactly 8 sessions without exceeding capacity.', fix: 'Click Publish schedule to make the volunteer lookup page show assignments.' });
  }

  lastConflicts = messages;
  save(); renderAll();
}

function addVolunteer(volunteer) {
  const exists = volunteers.some(v => v.email.toLowerCase() === volunteer.email.toLowerCase());
  if (exists) throw new Error('A volunteer with this email is already registered.');
  volunteers.push({ id: crypto.randomUUID(), ...volunteer });
  assignments = [];
  isPublished = false;
  lastConflicts = [];
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
    msg.textContent = 'Registration saved successfully. Admin must regenerate and publish the schedule.';
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
  isPublished = false;
  lastConflicts = [];
  save(); renderAll();
});

$('adminLogin').addEventListener('click', () => {
  $('adminPanel').className = 'unlocked';
  $('loginMessage').textContent = 'Mock login successful. Dashboard unlocked.';
  $('loginMessage').className = 'message small ok';
});

$('generate').addEventListener('click', generateSchedule);
$('publish').addEventListener('click', () => {
  const errors = lastConflicts.filter(m => m.type === 'error');
  if (!assignments.length) {
    lastConflicts = [{ type: 'error', title: 'Nothing to publish', detail: 'No schedule has been generated yet.', fix: 'Click Generate schedule first.' }];
    save(); renderAll(); return;
  }
  if (errors.length) {
    lastConflicts.unshift({ type: 'error', title: 'Publish blocked', detail: 'The schedule still has unresolved errors.', fix: 'Resolve conflicts before publishing, or add a production admin override workflow.' });
    save(); renderAll(); return;
  }
  isPublished = true;
  lastConflicts.unshift({ type: 'success', title: 'Schedule published', detail: 'The volunteer lookup page now displays assigned training dates by email.', fix: 'Export the CSV or notify volunteers in the production version.' });
  save(); renderAll();
});

$('lookupBtn').addEventListener('click', () => {
  const email = $('lookupEmail').value.trim().toLowerCase();
  const volunteer = volunteers.find(v => v.email.toLowerCase() === email);
  if (!volunteer) {
    $('lookupResult').innerHTML = '<div class="notice bad">No volunteer found with that email address.</div>'; return;
  }
  if (!isPublished) {
    $('lookupResult').innerHTML = '<div class="notice warn">Your registration exists, but the final schedule has not been published yet.</div>'; return;
  }
  const dates = assignments.filter(a => a.volunteerId === volunteer.id).map(a => sessionConfig.find(s => s.id === a.sessionId)?.date).filter(Boolean);
  $('lookupResult').innerHTML = `<div class="notice"><h3>${volunteer.name}</h3><p>${dates.length}/8 sessions assigned.</p><div class="schedule-list">${dates.map(d => `<span>${d}</span>`).join('')}</div></div>`;
});

$('reset').addEventListener('click', () => {
  volunteers = []; assignments = []; sessionConfig = sessions; isPublished = false; lastConflicts = [];
  localStorage.clear(); save(); renderAvailabilityList(); renderAll();
});
$('exportCsv').addEventListener('click', () => {
  const header = 'Volunteer,Email,Assigned Sessions,Published\n';
  const body = volunteers.map(v => {
    const dates = assignments.filter(a => a.volunteerId === v.id).map(a => sessionConfig.find(s => s.id === a.sessionId)?.date).join(' | ');
    return `"${v.name}","${v.email}","${dates}","${isPublished ? 'Yes' : 'No'}"`;
  }).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'volunteer-schedule.csv'; a.click();
  URL.revokeObjectURL(url);
});

renderAvailabilityList();
renderAll();
