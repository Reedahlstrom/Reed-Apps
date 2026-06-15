// Concurrent-edit safety: two devices add different things to the SAME trip at
// the same moment → optimistic-concurrency + merge must keep BOTH (no loss).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { mergeTrips } from '/tmp/merge.mjs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
let failures = 0
const check = (c, m) => { if (!c) failures++; console.log(`${c ? '✅' : '❌'} ${m}`) }

// client-side CAS push with conflict→merge→retry (mirrors SyncProvider)
async function cas(client, trip, expected) {
  const { data } = await client.from('trips').update({ name: trip.name, rev: expected + 1, data: trip }).eq('id', trip.id).eq('rev', expected).select('rev').maybeSingle()
  if (data) return { ok: true, rev: data.rev }
  const { data: cur } = await client.from('trips').select('rev,data').eq('id', trip.id).maybeSingle()
  return { conflict: true, remote: cur.data, remoteRev: cur.rev }
}
async function pushMerged(client, local, startRev) {
  let trip = local, expected = startRev
  for (let i = 0; i < 8; i++) {
    const r = await cas(client, trip, expected)
    if (r.ok) return r.rev
    trip = mergeTrips(trip, r.remote); expected = r.remoteRev
  }
  throw new Error('did not converge')
}

const email = `cc-${Date.now()}@example.com`
let userId
try {
  const u = await admin.auth.admin.createUser({ email, password: 'Test123456!', email_confirm: true })
  userId = u.data.user.id
  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  await client.auth.signInWithPassword({ email, password: 'Test123456!' })

  const id = crypto.randomUUID()
  const base = { id, name: 'CC Trip', people: [{ id: 'm', name: 'Maddie', role: 'builder' }], foodDays: [{ id: 'f1', label: 'Lunch', menu: [{ id: 'mn1', number: 1, name: 'Lomo' }], orders: [] }], onboarded: true, updatedAt: new Date(Date.now() - 5000).toISOString() }
  await client.from('trips').insert({ id, name: base.name, rev: 1, data: base })
  check(true, 'trip created (rev 1)')

  // both devices start from rev 1; each makes a DIFFERENT edit at the same time
  const A = { ...base, people: [...base.people, { id: 'x', name: 'BuilderX', role: 'builder' }], foodDays: [{ ...base.foodDays[0], orders: [{ personId: 'm', itemId: 'mn1' }] }], updatedAt: new Date().toISOString() }
  const B = { ...base, people: [...base.people, { id: 'y', name: 'BuilderY', role: 'builder' }], foodDays: [{ ...base.foodDays[0], orders: [{ personId: 'x', itemId: 'mn1' }] }], updatedAt: new Date(Date.now() + 1).toISOString() }

  await Promise.all([pushMerged(client, A, 1), pushMerged(client, B, 1)])

  const { data: final } = await client.from('trips').select('data').eq('id', id).maybeSingle()
  const names = final.data.people.map((p) => p.name).sort()
  check(names.includes('Maddie') && names.includes('BuilderX') && names.includes('BuilderY'), `both concurrent builders survived: [${names}]`)
  check(final.data.people.length === 3, `exactly 3 people (no duplicate/no loss): ${final.data.people.length}`)
  const orders = final.data.foodDays[0].orders.map((o) => o.personId).sort()
  check(orders.length === 2 && orders.includes('m') && orders.includes('x'), `both concurrent food orders survived: [${orders}]`)

  // run 5 rapid concurrent adds to stress the CAS loop
  let rev = (await client.from('trips').select('rev').eq('id', id).maybeSingle()).data.rev
  const cur = (await client.from('trips').select('data').eq('id', id).maybeSingle()).data.data
  await Promise.all([0, 1, 2, 3, 4].map((k) =>
    pushMerged(client, { ...cur, people: [...cur.people, { id: 'z' + k, name: 'Z' + k, role: 'builder' }], updatedAt: new Date(Date.now() + k).toISOString() }, rev)))
  const { data: f2 } = await client.from('trips').select('data').eq('id', id).maybeSingle()
  check(f2.data.people.length === 8, `5 simultaneous adds all survived (3+5=8): got ${f2.data.people.length}`)

  await admin.from('trips').delete().eq('id', id)
} catch (e) {
  failures++; console.log('❌ EXCEPTION:', e.message)
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId)
  console.log(`\n${failures === 0 ? '✅ NO DATA LOSS UNDER CONCURRENT EDITS' : `❌ ${failures} FAILURE(S)`}`)
  process.exit(failures === 0 ? 0 : 1)
}
