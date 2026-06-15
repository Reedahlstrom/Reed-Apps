import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Mountain, ArrowRight, ArrowLeft, User, UserCog, Users2, Tent, Check, CalendarRange, Plus, KeyRound } from 'lucide-react'
import { Mountains } from '@/components/Mountains'
import { Intro } from '@/components/Intro'
import { Sheet } from '@/components/Sheet'
import { JoinByCode } from '@/components/JoinByCode'
import { Button, Input, Textarea, Field } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { prettyDay } from '@/lib/dates'

function parseNames(block: string): string[] {
  return block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const trip = useActiveTrip()
  const addPerson = useTripStore((s) => s.addPerson)
  const addPeople = useTripStore((s) => s.addPeople)
  const updateTripMeta = useTripStore((s) => s.updateTripMeta)
  const renameTrip = useTripStore((s) => s.renameTrip)
  const setOnboarded = useTripStore((s) => s.setOnboarded)

  const [intro, setIntro] = useState(() => !trip?.onboarded)
  const [joinOpen, setJoinOpen] = useState(false)

  // If the active trip is already set up (e.g. synced from another device, or
  // joined via a code), don't sit on onboarding — go straight to the trip.
  useEffect(() => {
    if (trip?.onboarded) navigate('/trip', { replace: true })
  }, [trip?.onboarded, navigate])
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [leader, setLeader] = useState('')
  const [coleader, setColeader] = useState('')
  const [parents, setParents] = useState('')
  const [builders, setBuilders] = useState('')
  const [tripName, setTripName] = useState(trip?.name ?? 'My Trip')
  const [start, setStart] = useState(trip?.meta.startDate ?? '')
  const [end, setEnd] = useState(trip?.meta.endDate ?? '')
  const [destination, setDestination] = useState(trip?.meta.destination ?? '')

  const parentList = useMemo(() => parseNames(parents), [parents])
  const builderList = useMemo(() => parseNames(builders), [builders])

  const go = (next: number) => {
    setDir(next > step ? 1 : -1)
    setStep(next)
  }

  const finish = () => {
    if (!trip) return
    renameTrip(trip.id, tripName.trim() || 'Trip 1')
    updateTripMeta({ startDate: start, endDate: end, destination: destination.trim() })
    if (leader.trim()) addPerson(leader.trim(), 'leader')
    if (coleader.trim()) addPerson(coleader.trim(), 'coleader')
    addPeople(parentList, 'parent')
    addPeople(builderList, 'builder')
    setOnboarded(true)
    navigate('/trip', { replace: true })
  }

  const steps = [
    // 0 — choose: new trip or join with a code
    {
      valid: true,
      body: (
        <div className="flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl glass text-glacier-500">
            <Mountain size={30} strokeWidth={1.8} />
          </span>
          <h1 className="mt-6 font-display text-4xl leading-[1.02]">Let's get<br />you set up.</h1>
          <p className="mt-3 max-w-xs text-[15px] text-ice-300/70">
            Start your own trip, or join the one your co-leader already made.
          </p>

          <div className="mt-8 w-full space-y-3 text-left">
            <button onClick={() => go(1)} className="glass flex w-full items-center gap-3.5 rounded-2xl p-4 active:scale-[0.99]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl btn-glacier"><Plus size={22} /></span>
              <div className="flex-1">
                <p className="font-display text-[15px] leading-tight">Start a new trip</p>
                <p className="text-xs text-ice-300/55">Build your roster from scratch</p>
              </div>
              <ArrowRight size={18} className="text-ice-300/40" />
            </button>

            <button onClick={() => setJoinOpen(true)} className="glass flex w-full items-center gap-3.5 rounded-2xl p-4 active:scale-[0.99]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl glass-soft text-glacier-500"><KeyRound size={20} /></span>
              <div className="flex-1">
                <p className="font-display text-[15px] leading-tight">Join with a code</p>
                <p className="text-xs text-ice-300/55">Your co already started it</p>
              </div>
              <ArrowRight size={18} className="text-ice-300/40" />
            </button>
          </div>

          <p className="mt-4 max-w-xs text-xs text-ice-300/50">
            If your co-leader already created the trip, ask them for the code in their <span className="text-ice-200">Settings</span>.
          </p>
        </div>
      ),
    },
    // 1 — leader
    {
      valid: leader.trim().length > 0,
      icon: User,
      title: 'You, the leader',
      sub: 'The name shown across the app.',
      body: (
        <Field label="Your name">
          <Input autoFocus value={leader} onChange={(e) => setLeader(e.target.value)} placeholder="e.g. Reed Ahlstrom" />
        </Field>
      ),
    },
    // 2 — co-leader
    {
      valid: true,
      icon: UserCog,
      title: 'Your co-leader',
      sub: 'The young adult leading alongside you.',
      body: (
        <Field label="Co-leader name" hint="You can add this later if unsure.">
          <Input autoFocus value={coleader} onChange={(e) => setColeader(e.target.value)} placeholder="Co-leader name" />
        </Field>
      ),
    },
    // 3 — parents
    {
      valid: true,
      icon: Users2,
      title: 'Parent builders',
      sub: 'The two parents helping on the trip.',
      body: (
        <div className="space-y-3">
          <Field label="One name per line" hint={`${parentList.length} added`}>
            <Textarea autoFocus rows={4} value={parents} onChange={(e) => setParents(e.target.value)} placeholder={'Parent one\nParent two'} />
          </Field>
          <NamePreview names={parentList} />
        </div>
      ),
    },
    // 4 — builders
    {
      valid: builderList.length > 0,
      icon: Tent,
      title: 'The builders',
      sub: 'Every youth on the trip. Paste the whole list.',
      body: (
        <div className="space-y-3">
          <Field label="One name per line" hint={`${builderList.length} builders`}>
            <Textarea autoFocus rows={8} value={builders} onChange={(e) => setBuilders(e.target.value)} placeholder={'Maddie\nJoshua\nElena\n…'} />
          </Field>
          <NamePreview names={builderList} />
        </div>
      ),
    },
    // 5 — dates
    {
      valid: start <= end,
      icon: CalendarRange,
      title: 'Trip dates',
      sub: 'Used across food, bus, meetings and health.',
      body: (
        <div className="space-y-4">
          <Field label="Trip name">
            <Input value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="Trip 1" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="End"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          </div>
          <Field label="Where">
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" />
          </Field>
          <p className="text-center text-xs text-ice-300/50">{prettyDay(start)} — {prettyDay(end)}</p>
        </div>
      ),
    },
    // 6 — review
    {
      valid: true,
      icon: Check,
      title: 'Ready to go',
      sub: 'You can edit any of this later.',
      body: (
        <div className="space-y-3">
          <ReviewRow label="Leader" value={leader || '—'} />
          <ReviewRow label="Co-leader" value={coleader || '—'} />
          <ReviewRow label="Parent builders" value={`${parentList.length}`} />
          <ReviewRow label="Builders" value={`${builderList.length}`} />
          <ReviewRow label="Total on trip" value={`${(leader ? 1 : 0) + (coleader ? 1 : 0) + parentList.length + builderList.length}`} />
          <ReviewRow label="Dates" value={`${prettyDay(start)} — ${prettyDay(end)}`} />
        </div>
      ),
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1
  const Icon = current.icon

  return (
    <>
    <AnimatePresence>{intro && <Intro onDone={() => setIntro(false)} />}</AnimatePresence>
    <div className="alpine-backdrop grain relative flex min-h-dvh flex-col overflow-hidden">
      {/* progress */}
      <div className="pt-safe px-5">
        <div className="mx-auto flex max-w-md gap-1.5 pt-4">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-glacier-400' : 'bg-slate-200/70'}`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-8">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1"
          >
            {step > 0 && (
              <div className="mb-6 flex items-center gap-3">
                {Icon && (
                  <span className="grid h-12 w-12 place-items-center rounded-2xl glass text-glacier-400">
                    <Icon size={24} strokeWidth={2} />
                  </span>
                )}
                <div>
                  <h1 className="text-2xl leading-tight">{current.title}</h1>
                  <p className="text-sm text-ice-300/60">{current.sub}</p>
                </div>
              </div>
            )}
            {current.body}
          </motion.div>
        </AnimatePresence>

        {/* nav — hidden on the choice step (its buttons live in the body) */}
        {step > 0 && (
          <div className="pb-safe sticky bottom-0 flex items-center gap-3 bg-gradient-to-t from-night-950 to-transparent py-5">
            <Button variant="soft" icon={ArrowLeft} onClick={() => go(step - 1)} aria-label="Back" />
            {isLast ? (
              <Button full icon={Check} onClick={finish}>Enter trip</Button>
            ) : (
              <Button full disabled={!current.valid} onClick={() => go(step + 1)}>
                Continue <ArrowRight size={18} />
              </Button>
            )}
          </div>
        )}
      </div>

      <Sheet open={joinOpen} onClose={() => setJoinOpen(false)} title="Join a trip">
        <div className="space-y-3 pt-1">
          <p className="text-sm text-ice-300/60">Enter the code your co-leader shared. It’s in their <span className="text-ice-200">Settings</span>.</p>
          <JoinByCode onJoined={() => navigate('/trip', { replace: true })} />
        </div>
      </Sheet>

      <Mountains className="absolute inset-x-0 bottom-0 h-40 opacity-60" />
    </div>
    </>
  )
}

function NamePreview({ names }: { names: string[] }) {
  if (names.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((n, i) => (
        <span key={i} className="flex items-center gap-1.5 rounded-full glass-soft py-1 pl-1 pr-2.5 text-sm">
          <Avatar name={n} size={22} />
          {n}
        </span>
      ))}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl glass-soft px-4 py-3">
      <span className="text-sm text-ice-300/70">{label}</span>
      <span className="font-display text-ice-50">{value}</span>
    </div>
  )
}
