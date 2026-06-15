import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, CalendarRange, Check, Plus, Trash2, Luggage, ChevronRight, UserPlus, Copy, Share2, Cloud, CloudOff, LogOut, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Field, Card } from '@/components/ui'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { prettyDay, todayISO, todayPlusISO } from '@/lib/dates'
import { isSupabaseConfigured } from '@/lib/supabase'
import { fetchMemberCount } from '@/lib/collab'
import { createInvite, inviteLink } from '@/lib/invites'
import { currentUserEmail, signOut } from '@/lib/auth'

export function SettingsPage() {
  const navigate = useNavigate()
  const trip = useActiveTrip()
  const trips = useTripStore((s) => s.trips)
  const activeId = useTripStore((s) => s.activeTripId)
  const renameTrip = useTripStore((s) => s.renameTrip)
  const updateTripMeta = useTripStore((s) => s.updateTripMeta)
  const setActiveTrip = useTripStore((s) => s.setActiveTrip)
  const createTrip = useTripStore((s) => s.createTrip)
  const deleteTrip = useTripStore((s) => s.deleteTrip)

  const [newOpen, setNewOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!trip) return null

  const save = (patch: Partial<typeof trip.meta>) => {
    updateTripMeta(patch)
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  const startFresh = () => {
    // A clean new trip — onboard a fresh roster.
    const id = createTrip('New Trip', todayISO(), todayPlusISO(14), '')
    setActiveTrip(id)
    setNewOpen(false)
    navigate('/trip/onboarding', { replace: true })
  }

  return (
    <div className="space-y-6 pt-2">
      <PageHeader title="Trip Settings" subtitle={trip.name} icon={Settings} />

      {/* trip details */}
      <Card className="space-y-4 p-4">
        <Field label="Trip name">
          <Input defaultValue={trip.name} onBlur={(e) => renameTrip(trip.id, e.target.value.trim() || trip.name)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start"><Input type="date" defaultValue={trip.meta.startDate} onChange={(e) => save({ startDate: e.target.value })} /></Field>
          <Field label="End"><Input type="date" defaultValue={trip.meta.endDate} onChange={(e) => save({ endDate: e.target.value })} /></Field>
        </div>
        <Field label="Destination">
          <Input defaultValue={trip.meta.destination} onBlur={(e) => save({ destination: e.target.value })} />
        </Field>
        <p className="flex items-center gap-2 text-xs text-ice-300/60">
          <CalendarRange size={14} className="text-glacier-400" />
          {prettyDay(trip.meta.startDate)} — {prettyDay(trip.meta.endDate)}
          {saved && <span className="ml-auto flex items-center gap-1 text-status-good"><Check size={13} /> Saved</span>}
        </p>
      </Card>

      {/* account / sync */}
      <AccountCard />

      {/* invite a co-leader to this trip */}
      <InviteCard tripId={trip.id} tripName={trip.name} />

      {/* trips list */}
      <div className="space-y-2">
        <p className="px-1 text-xs font-medium uppercase tracking-wider text-ice-300/60">Trips</p>
        {trips.map((t) => (
          <div key={t.id} className={`glass flex items-center gap-3 rounded-2xl p-4 ${t.id === activeId ? 'ring-1 ring-glacier-400/50' : ''}`}>
            <span className="grid h-10 w-10 place-items-center rounded-xl glass-soft text-glacier-400"><Luggage size={19} /></span>
            <button className="min-w-0 flex-1 text-left" onClick={() => setActiveTrip(t.id)}>
              <p className="font-display leading-tight">{t.name}</p>
              <p className="text-xs text-ice-300/55">{prettyDay(t.meta.startDate)} — {prettyDay(t.meta.endDate)} · {t.people.length} people</p>
            </button>
            {t.id === activeId ? (
              <span className="rounded-full bg-glacier-500/20 px-2.5 py-1 text-xs text-glacier-400">Active</span>
            ) : (
              <button onClick={() => setActiveTrip(t.id)} className="text-ice-300/50"><ChevronRight size={18} /></button>
            )}
            {trips.length > 1 && (
              <button onClick={() => setConfirmDelete(t.id)} className="text-status-bad/70 hover:text-status-bad"><Trash2 size={17} /></button>
            )}
          </div>
        ))}
      </div>

      <Button full variant="soft" icon={Plus} onClick={() => setNewOpen(true)}>Start a fresh trip</Button>

      {/* start fresh sheet */}
      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="Start a fresh trip" footer={<Button full icon={Plus} onClick={startFresh}>Create &amp; set up</Button>}>
        <p className="pt-1 text-[15px] leading-relaxed text-ice-200">
          This creates a brand-new trip with an empty roster and takes you through setup again. Your current trip
          (<span className="text-ice-50">{trip.name}</span>) stays saved and untouched — switch back to it any time.
        </p>
      </Sheet>

      {/* delete confirm */}
      <Sheet
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this trip?"
        footer={
          <div className="flex gap-2">
            <Button full variant="soft" onClick={() => setConfirmDelete(null)}>Keep it</Button>
            <Button full variant="danger" icon={Trash2} onClick={() => { if (confirmDelete) deleteTrip(confirmDelete); setConfirmDelete(null) }}>Delete</Button>
          </div>
        }
      >
        <p className="pt-1 text-[15px] leading-relaxed text-ice-200">
          This permanently removes <span className="text-ice-50">{trips.find((t) => t.id === confirmDelete)?.name}</span> and all its
          data — orders, pairings, meetings, notes, everything. This can't be undone.
        </p>
      </Sheet>
    </div>
  )
}

/* ---------------- invite a co-leader to THIS trip ---------------- */

function InviteCard({ tripId, tripName }: { tripId: string; tripName: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [members, setMembers] = useState<number | null>(null)

  useEffect(() => {
    if (isSupabaseConfigured) fetchMemberCount(tripId).then(setMembers)
  }, [tripId])

  if (!isSupabaseConfigured) {
    return (
      <Card className="space-y-1 p-4">
        <p className="flex items-center gap-2 font-display text-[15px]"><UserPlus size={17} className="text-glacier-500" /> Invite your co-leader</p>
        <p className="text-sm text-ice-300/60">Sign in (top of the app) to create a share link for this trip.</p>
      </Card>
    )
  }

  const make = async () => {
    setBusy(true)
    const code = await createInvite(tripId)
    setBusy(false)
    if (code) setLink(inviteLink(code))
  }
  const copy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const share = async () => {
    if (link && navigator.share) await navigator.share({ title: `Join ${tripName}`, url: link }).catch(() => {})
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl glass-soft text-glacier-500"><UserPlus size={18} /></span>
        <div className="flex-1">
          <p className="font-display text-[15px] leading-tight">Invite your co-leader</p>
          <p className="text-xs text-ice-300/55">Send a link — they join this exact trip, live</p>
        </div>
        {members != null && members > 1 && <span className="rounded-full bg-status-good/15 px-2.5 py-1 text-xs text-status-good">{members} on it</span>}
      </div>

      {link ? (
        <div className="space-y-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-ice-200 break-all">{link}</div>
          <div className="flex gap-2">
            <Button full variant="soft" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
            {typeof navigator !== 'undefined' && 'share' in navigator && <Button icon={Share2} onClick={share} aria-label="Share" />}
          </div>
          <p className="text-center text-xs text-ice-300/45">They open the link, make a quick login, and they’re in {tripName}.</p>
        </div>
      ) : (
        <Button full icon={busy ? Loader2 : UserPlus} onClick={make} disabled={busy} className={busy ? '[&_svg]:animate-spin' : ''}>{busy ? 'Creating…' : 'Create invite link'}</Button>
      )}
    </Card>
  )
}

/* ---------------- account / sync state ---------------- */

function AccountCard() {
  const [email, setEmail] = useState<string | null>(null)
  const offline = typeof localStorage !== 'undefined' && localStorage.getItem('reed-offline') === '1'

  useEffect(() => {
    if (isSupabaseConfigured && !offline) currentUserEmail().then(setEmail)
  }, [offline])

  if (!isSupabaseConfigured) return null

  const goOnline = () => { localStorage.removeItem('reed-offline'); window.location.reload() }
  const out = async () => { await signOut(); window.location.reload() }

  if (offline) {
    return (
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl glass-soft text-ice-300/70"><CloudOff size={18} /></span>
          <div>
            <p className="font-display text-[15px] leading-tight">Offline on this device</p>
            <p className="text-xs text-ice-300/55">Changes save here only — not synced with your co-leader</p>
          </div>
        </div>
        <Button full icon={Cloud} onClick={goOnline}>Sign in to sync live</Button>
      </Card>
    )
  }

  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-status-good/15 text-status-good"><Cloud size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] leading-tight">Synced live</p>
        <p className="truncate text-xs text-ice-300/55">{email ?? 'Signed in'}</p>
      </div>
      <button onClick={out} className="flex items-center gap-1.5 rounded-xl glass-soft px-3 py-2 text-sm text-ice-200"><LogOut size={15} /> Sign out</button>
    </Card>
  )
}
