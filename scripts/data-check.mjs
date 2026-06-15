// Comprehensive multi-tenant plumbing + data-persistence check.
// Leader A creates a FULL trip → invites co-leader B → B joins and sees ALL data.
// Outsider C must see NOTHING. Edits persist both ways. Fresh sign-in loses nothing.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const SB_URL = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY, SECRET = env.SUPABASE_SECRET_KEY
const admin = createClient(SB_URL, SECRET, { auth: { persistSession: false } })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let failures = 0
const check = (cond, msg) => { if (!cond) failures++; console.log(`${cond ? '✅' : '❌'} ${msg}`) }

const stamp = Date.now()
const users = { A: `dc-a-${stamp}@x.com`, B: `dc-b-${stamp}@x.com`, C: `dc-c-${stamp}@x.com` }
const ids = []
async function mkUser(email) {
  const { data } = await admin.auth.admin.createUser({ email, password: 'Test123456!', email_confirm: true })
  ids.push(data.user.id)
  const c = createClient(SB_URL, ANON, { auth: { persistSession: false } })
  const { data: s } = await c.auth.signInWithPassword({ email, password: 'Test123456!' })
  c.realtime.setAuth(s.session.access_token)
  return c
}
const pull = async (c) => (await c.from('trips').select('id,data')).data
const push = async (c, t) => !(await c.from('trips').upsert({ id: t.id, name: t.name, rev: Date.parse(t.updatedAt), data: t }, { onConflict: 'id' })).error

// a builder roster
const P = (n, i, role = 'builder') => ({ id: `p${i}`, name: n, role })
const people = ['Maddie', 'Joshua', 'Elena', 'Caleb', 'Ana', 'Liam', 'Sofia', 'Noah', 'Grace', 'Ethan'].map((n, i) => P(n, i))
people.unshift({ id: 'lead', name: 'Reed', role: 'leader' })
const bid = people.map((p) => p.id)

const tripId = crypto.randomUUID()
const fullTrip = {
  id: tripId, name: 'Full Data Trip',
  meta: { startDate: '2026-06-15', endDate: '2026-07-01', destination: 'Chile' },
  people,
  foodDays: [{ id: 'f1', date: '2026-06-16', label: 'Lunch', menu: [{ id: 'm1', number: 1, name: 'Lomo' }, { id: 'm2', number: 2, name: 'Salmon' }], orders: [{ personId: 'p0', itemId: 'm1' }, { personId: 'p1', itemId: 'm2' }] }],
  busDays: [
    { id: 'b1', date: '2026-06-15', label: 'Day 1', locked: true, pods: [['p0', 'p1'], ['p2', 'p3'], ['p4', 'p5']] },
    { id: 'b2', date: '2026-06-16', label: 'Day 2', locked: true, pods: [['p0', 'p2'], ['p1', 'p3'], ['p4', 'p6']] },
  ],
  meetings: [{ personId: 'p0', status: 'done', followUps: [{ id: 'fu1', text: 'homesickness', done: false }], updatedAt: '2026-06-15T00:00:00Z' }],
  notes: [{ id: 'n1', category: 'contact', title: 'Driver', body: '7am', phone: '+56 9', pinned: true, createdAt: 'x', updatedAt: 'x' }],
  roomPlans: [{ phase: 'first', rooms: [{ id: 'r1', name: 'Cabin A', beds: 4, occupants: ['p0', 'p1', 'p2'] }] }],
  groupSets: [{ id: 'g1', label: 'Worksite teams', activity: 'Build', locked: true, groups: [['p0', 'p1', 'p2'], ['p3', 'p4', 'p5']], createdAt: 'x' }],
  committees: [{ id: 'c1', name: 'Devotional Crew', purpose: 'devos', memberIds: ['p0', 'p4'], notes: [{ id: 'cn1', text: 'note', createdAt: 'x' }], createdAt: 'x' }],
  devotionals: [{ id: 'd1', time: 'morning', title: 'Love God', giver: 'Reed', scriptures: ['Matt 22:37'], ideas: 'open strong', done: true, createdAt: 'x', updatedAt: 'x' }],
  flights: [{ id: 'fl1', personId: 'p3', code: 'LA841', date: '2026-06-14' }],
  letters: ['p0', 'p1', 'p2'],
  poopNights: [{ date: '2026-06-14', notPooped: ['p3'], createdAt: 'x' }],
  onboarded: true, updatedAt: new Date().toISOString(),
}

try {
  console.log('— full plumbing & multi-tenant data check —')
  const A = await mkUser(users.A)
  check(await push(A, fullTrip), 'A created a FULL trip (all features populated)')

  // A invites a co-leader
  const code = 'TEST' + stamp.toString().slice(-6)
  check(!(await A.from('trip_invites').insert({ code, trip_id: tripId })).error, 'A created an invite link')

  // B joins via the invite
  const B = await mkUser(users.B)
  const ev = []
  const ch = B.channel('dc').on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (p) => ev.push(p.eventType))
  await new Promise((r) => ch.subscribe((s) => s === 'SUBSCRIBED' && r()))
  const redeemed = (await B.rpc('redeem_invite', { invite_code: code })).data
  check(redeemed === tripId, 'B redeemed the invite and joined the trip')

  // B sees EVERYTHING
  await sleep(1000)
  const bt = (await pull(B))?.[0]?.data
  check(bt, 'B can read the shared trip')
  check(bt?.people?.length === 11, `people persisted (${bt?.people?.length}/11)`)
  check(bt?.busDays?.filter((d) => d.locked).length === 2, `locked bus-day history (old groups) persisted (${bt?.busDays?.length})`)
  check(bt?.groupSets?.[0]?.locked && bt?.groupSets?.[0]?.groups?.length === 2, 'locked group set (old groups) persisted')
  check(bt?.foodDays?.[0]?.orders?.length === 2, 'food orders persisted')
  check(bt?.roomPlans?.[0]?.rooms?.[0]?.occupants?.length === 3, 'room assignments persisted')
  check(bt?.committees?.[0]?.memberIds?.length === 2 && bt?.committees?.[0]?.notes?.length === 1, 'committees + notes persisted')
  check(bt?.devotionals?.[0]?.scriptures?.length === 1, 'devotionals + scriptures persisted')
  check(bt?.flights?.length === 1, 'flights persisted')
  check(bt?.letters?.length === 3, 'letters checklist persisted')
  check(bt?.poopNights?.length === 1, 'health log persisted')
  check(bt?.meetings?.[0]?.followUps?.length === 1, 'meetings + follow-ups persisted')

  // Outsider isolation
  const C = await mkUser(users.C)
  const ct = await pull(C)
  check((ct?.length ?? 0) === 0, `outsider C sees NOTHING (multi-tenant isolation) — saw ${ct?.length}`)

  // A edits → B sees live + persisted
  ev.length = 0
  fullTrip.people.push({ id: 'p11', name: 'New Builder', role: 'builder' })
  fullTrip.updatedAt = new Date().toISOString()
  await push(A, fullTrip)
  await sleep(2500)
  check(ev.length > 0, `B got a live realtime event from A's edit (${ev.join(',') || 'none'})`)
  check(((await pull(B))?.[0]?.data?.people?.length) === 12, 'B sees A\'s new builder (12)')

  // B edits → A sees
  const bEdit = { ...(await pull(B))[0].data, notes: [...bt.notes, { id: 'n2', category: 'reminder', title: 'Sunscreen', body: '', pinned: false, createdAt: 'x', updatedAt: 'x' }], updatedAt: new Date().toISOString() }
  await push(B, bEdit)
  await sleep(700)
  check(((await pull(A))?.[0]?.data?.notes?.length) === 2, 'A sees B\'s new note (bidirectional)')

  // Fresh sign-in — nothing lost
  const A2 = await mkUser(users.A + '.x') // separate session, same not needed; re-sign A
  void A2
  const Afresh = createClient(SB_URL, ANON, { auth: { persistSession: false } })
  await Afresh.auth.signInWithPassword({ email: users.A, password: 'Test123456!' })
  const ft = (await pull(Afresh))?.[0]?.data
  check(ft?.people?.length === 12 && ft?.notes?.length === 2 && ft?.busDays?.length === 2 && ft?.groupSets?.length === 1, 'fresh sign-in: ALL data intact (nothing lost)')

  await B.removeChannel(ch)
} catch (e) {
  failures++; console.log('❌ EXCEPTION:', e.message)
} finally {
  await admin.from('trips').delete().eq('id', tripId)
  for (const id of ids) await admin.auth.admin.deleteUser(id).catch(() => {})
  // delete the extra A2 user if created
  const { data: extra } = await admin.auth.admin.listUsers()
  for (const u of (extra?.users ?? [])) if (u.email?.startsWith('dc-') && u.email.includes(String(stamp))) await admin.auth.admin.deleteUser(u.id).catch(() => {})
  console.log(`\n${failures === 0 ? '✅ ALL PASSED — plumbing solid, nothing lost' : `❌ ${failures} FAILURE(S)`}`)
  process.exit(failures === 0 ? 0 : 1)
}
