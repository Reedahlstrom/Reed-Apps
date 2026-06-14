// Live two-account sync test against the real Supabase backend.
// Simulates Reed (A) + Elena (B): auth, RLS, cross-user reads, realtime, persistence.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const SB_URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const SECRET = env.SUPABASE_SECRET_KEY
const admin = createClient(SB_URL, SECRET, { auth: { persistSession: false } })

const log = (ok, msg) => console.log(`${ok ? '✅' : '❌'} ${msg}`)
let failures = 0
const check = (cond, msg) => { if (!cond) failures++; log(cond, msg) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const stamp = Date.now()
const A_EMAIL = `synctest-a-${stamp}@example.com`
const B_EMAIL = `synctest-b-${stamp}@example.com`
const PASS = 'Test123456!'
const created = []

async function mkUser(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true })
  if (error) throw error
  created.push(data.user.id)
  await admin.from('allowed_emails').insert({ email, label: 'sync test' })
  const c = createClient(SB_URL, ANON, { auth: { persistSession: false } })
  const { data: s, error: e2 } = await c.auth.signInWithPassword({ email, password: PASS })
  if (e2) throw e2
  c.realtime.setAuth(s.session.access_token) // ensure realtime carries the user JWT for RLS
  return c
}

async function pull(c) {
  const { data, error } = await c.from('trips').select('id, data')
  if (error) { console.log('   pull error:', error.message); return null }
  return data
}
async function push(c, trip) {
  const { error } = await c.from('trips').upsert({ id: trip.id, name: trip.name, rev: Date.parse(trip.updatedAt), data: trip }, { onConflict: 'id' })
  if (error) console.log('   push error:', error.message)
  return !error
}

try {
  console.log('— setting up two allowlisted, signed-in users —')
  const A = await mkUser(A_EMAIL)
  const B = await mkUser(B_EMAIL)
  check(true, 'both users created, allowlisted, signed in')

  // B subscribes to realtime
  const events = []
  const channel = B.channel('trips-test').on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (p) => events.push(p.eventType))
  await new Promise((res, rej) => {
    channel.subscribe((status, err) => {
      console.log('   realtime status:', status, err ? '| ' + err.message : '')
      if (status === 'SUBSCRIBED') res()
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') rej(new Error('realtime ' + status + (err ? ': ' + err.message : '')))
    })
  })
  check(true, 'B subscribed to realtime')
  await sleep(1500) // let the server fully register the subscription before any writes

  // A creates the trip
  const tripId = crypto.randomUUID()
  const trip = { id: tripId, name: 'Shared Trip', people: [{ id: 'p1', name: 'Maddie', role: 'builder' }], onboarded: true, updatedAt: new Date().toISOString() }
  check(await push(A, trip), 'A pushed a trip with 1 builder')

  // B pulls — should see A's exact trip
  await sleep(1500)
  let bTrips = await pull(B)
  check(bTrips && bTrips.length === 1 && bTrips[0].id === tripId, 'B sees the SAME trip id (no fork)')
  check(bTrips && bTrips[0].data.people.length === 1, 'B sees the builder A added')

  // The real-world test: trip already exists, A edits it live → B gets an UPDATE
  events.length = 0
  trip.people.push({ id: 'p2', name: 'Joshua', role: 'builder' })
  trip.updatedAt = new Date().toISOString()
  check(await push(A, trip), 'A edited the trip (added a 2nd builder)')
  await sleep(2500)
  check(events.length > 0, `B received a live realtime event from A's edit (${events.join(',') || 'none'})`)
  bTrips = await pull(B)
  check(bTrips && bTrips[0].data.people.length === 2, 'B sees BOTH builders after A edits (live update)')

  // B edits the same trip (devotional) — write must be allowed for B
  const bTrip = { ...bTrips[0].data, devotionals: [{ id: 'd1', title: 'Love God', giver: 'Elena' }], updatedAt: new Date().toISOString() }
  check(await push(B, bTrip), 'B edited the trip (added a devotional)')
  await sleep(600)
  const aTrips = await pull(A)
  check(aTrips && aTrips[0].data.devotionals?.length === 1, 'A sees B\'s devotional (bidirectional)')

  // no duplicates: exactly one trip row total
  const all = await admin.from('trips').select('id')
  check((all.data?.length ?? 0) === 1, `exactly ONE trip row exists (found ${all.data?.length})`)

  // persistence: re-pull fresh client
  const A2 = createClient(SB_URL, ANON, { auth: { persistSession: false } })
  await A2.auth.signInWithPassword({ email: A_EMAIL, password: PASS })
  const fresh = await pull(A2)
  check(fresh && fresh[0].data.people.length === 2 && fresh[0].data.devotionals?.length === 1, 'fresh sign-in sees everything (persisted, nothing lost)')

  await B.removeChannel(channel)
  // cleanup trip
  await admin.from('trips').delete().eq('id', tripId)
} catch (e) {
  failures++
  console.log('❌ EXCEPTION:', e.message)
} finally {
  // cleanup users + allowlist
  await admin.from('allowed_emails').delete().in('email', [A_EMAIL, B_EMAIL])
  for (const id of created) await admin.auth.admin.deleteUser(id)
  console.log(`\n${failures === 0 ? '✅ ALL PASSED' : `❌ ${failures} FAILURE(S)`}`)
  process.exit(failures === 0 ? 0 : 1)
}
