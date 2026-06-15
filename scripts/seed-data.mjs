// Shared demo seed used by screenshot scripts. Mirrors the Zustand persist shape.
export function seedPayload() {
  const now = '2026-06-13T12:00:00.000Z'
  const p = (name, role, i) => ({ id: `p_${role}_${i}`, name, role, createdAt: now })
  const builders = ['Maddie Clark','Joshua Reed','Elena Voss','Caleb Stone','Ana Ruiz','Liam Park','Sofia Mendez','Noah Hale','Grace Kim','Ethan Brooks','Mia Torres','Owen Frost','Lucy Chen','Jonah Webb','Ivy Nash','Sam Quinn','Ruby Vance','Eli Dawson','Nina Holt']
    .map((n, i) => p(n, 'builder', i))
  const people = [
    p('Reed Ahlstrom', 'leader', 0),
    p('Hannah Lewis', 'coleader', 0),
    p('David Clark', 'parent', 0),
    p('Maria Ruiz', 'parent', 1),
    ...builders,
  ]
  const menu = [
    { id: 'm1', number: 1, name: 'Lomo a lo pobre' },
    { id: 'm2', number: 2, name: 'Salmón grillado' },
    { id: 'm3', number: 3, name: 'Empanadas (x3)' },
    { id: 'm4', number: 4, name: 'Ensalada chilena' },
  ]
  const picks = ['m1','m2','m1','m3','m2','m1','m4','m3','m2','m1','m3','m2','m1','m4','m2','m3','m1','m2']
  const foodDay = {
    id: 'food1', date: '2026-06-16', label: 'Lunch — Puerto Natales', menu,
    orders: builders.slice(0, picks.length).map((b, i) => ({ personId: b.id, itemId: picks[i] })),
    createdAt: now,
  }
  // two locked bus days of history + one fresh
  const allIds = people.map((x) => x.id)
  const pairUp = (ids, offset) => {
    const pods = []
    for (let i = 0; i < ids.length - 1; i += 2) pods.push([ids[(i + offset) % ids.length], ids[(i + 1 + offset) % ids.length]])
    return pods
  }
  const busDays = [
    { id: 'bus1', date: '2026-06-15', label: 'Day 1', pods: pairUp(allIds, 0), locked: true, createdAt: now },
    { id: 'bus2', date: '2026-06-16', label: 'Day 2', pods: pairUp(allIds, 1), locked: true, createdAt: now },
  ]
  const poopNights = [
    { date: '2026-06-11', notPooped: ['p_builder_3', 'p_builder_7'], createdAt: now },
    { date: '2026-06-12', notPooped: ['p_builder_3'], createdAt: now },
    { date: '2026-06-13', notPooped: ['p_builder_3', 'p_builder_11'], createdAt: now },
  ]
  const rooms = [
    { id: 'r1', name: 'Cabin A', beds: 4, occupants: [builders[0].id, builders[1].id, builders[2].id] },
    { id: 'r2', name: 'Cabin B', beds: 4, occupants: [builders[3].id, builders[4].id] },
    { id: 'r3', name: 'Cabin C', beds: 4, occupants: [builders[5].id] },
  ]
  const groupSets = [
    { id: 'g1', label: 'Worksite teams', activity: 'Classroom build', groups: [builders.slice(0,5).map(b=>b.id), builders.slice(5,10).map(b=>b.id), builders.slice(10,15).map(b=>b.id)], locked: true, createdAt: now },
  ]
  const notes = [
    { id: 'n1', category: 'contact', title: 'Bus driver — Rodrigo', body: 'Picks up 7am sharp at the hostel.', phone: '+56 9 1234 5678', pinned: true, createdAt: now, updatedAt: now },
    { id: 'n2', category: 'reminder', title: 'Sunscreen before park', body: 'Torres del Paine — high UV even when cold.', pinned: false, createdAt: now, updatedAt: now },
    { id: 'n3', category: 'note', title: 'Worksite contact', body: 'Sister Morales meets us at the school Monday 9am.', pinned: false, createdAt: now, updatedAt: now },
  ]
  const committees = [
    { id: 'c1', name: 'Devotional Crew', purpose: 'Plans and leads morning & night devos.', memberIds: [builders[0].id, builders[4].id, builders[8].id], notes: [{ id: 'cn1', text: 'Joshua wants to lead Thursday night.', createdAt: now }], createdAt: now },
    { id: 'c2', name: 'Safety Crew', purpose: 'Tools, first aid, headcounts on the worksite.', memberIds: [builders[3].id, builders[5].id], notes: [], createdAt: now },
    { id: 'c3', name: 'Game Crew', purpose: 'Runs evening games and bus activities.', memberIds: [builders[1].id, builders[6].id, builders[10].id], notes: [], createdAt: now },
  ]
  const devotionals = [
    { id: 'd1', time: 'morning', title: 'Love God, Love People', giver: 'Reed', date: '2026-06-16', scriptures: ['Matthew 22:37-39'], ideas: 'Open with the two greatest commandments. Tie to why we serve.', done: true, createdAt: now, updatedAt: now },
    { id: 'd2', time: 'evening', title: 'This Is Real', giver: 'Elena', date: '2026-06-16', scriptures: ['James 1:22'], ideas: 'Faith in action — the worksite is worship.', done: false, createdAt: now, updatedAt: now },
  ]
  const briefing = {
    vision: 'Leave the kids and the community changed — show up humble, work hard, love loud.',
    rules: 'Buddy system always. Phones away during devos and worksite. Be on the bus on time.',
    expectations: 'Everyone serves, everyone shares once, no one sits alone.',
  }
  const trip = {
    id: 'trip_demo', name: 'Trip 1',
    meta: { startDate: '2026-06-15', endDate: '2026-07-01', destination: 'Patagonia & Concepción, Chile' },
    people, foodDays: [foodDay], busDays, committees, devotionals, briefing,
    meetings: builders.map((b, i) => ({ personId: b.id, status: i < 3 ? 'done' : i < 5 ? 'scheduled' : 'pending', date: i >= 3 && i < 5 ? '2026-06-20' : undefined, followUps: i === 3 ? [{ id: 'fu1', text: 'Check in about homesickness', done: false }] : [], updatedAt: now })),
    notes, roomPlans: [{ phase: 'first', rooms }], groupSets, poopNights,
    prayers: [
      { id: 'pr1', kind: 'prayer', text: 'Maddie’s grandma is in the hospital back home', personId: builders[0].id, done: false, createdAt: now },
      { id: 'pr2', kind: 'shoutout', text: 'Joshua led the worksite cleanup unprompted', personId: builders[1].id, done: false, createdAt: now },
      { id: 'pr3', kind: 'prayer', text: 'Safe travels for the drive to Concepción', done: true, createdAt: now },
    ],
    onboarded: true, createdAt: now, updatedAt: now,
  }
  return JSON.stringify({ state: { trips: [trip], activeTripId: 'trip_demo', rev: 1 }, version: 1 })
}
