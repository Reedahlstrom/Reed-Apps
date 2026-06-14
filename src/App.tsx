import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { JoinPage } from '@/pages/JoinPage'
import { LauncherPage } from '@/pages/LauncherPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { TripDashboard } from '@/pages/TripDashboard'
import { FoodPage } from '@/pages/FoodPage'
import { BusPage } from '@/pages/BusPage'
import { PoopPage } from '@/pages/PoopPage'
import { ToolsPage } from '@/pages/ToolsPage'
import { MeetingsPage } from '@/pages/MeetingsPage'
import { NotesPage } from '@/pages/NotesPage'
import { RoomsPage } from '@/pages/RoomsPage'
import { GroupsPage } from '@/pages/GroupsPage'
import { CommitteesPage } from '@/pages/CommitteesPage'
import { DevotionalsPage } from '@/pages/DevotionalsPage'
import { FlightsPage } from '@/pages/FlightsPage'
import { PeoplePage } from '@/pages/PeoplePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { RequireOnboarded } from '@/components/RequireOnboarded'
import { AuthGate } from '@/components/AuthGate'

export function App() {
  const loc = useLocation()
  // Capture an invite code from the URL even before sign-in, so it survives the
  // login step and is redeemed right after.
  useEffect(() => {
    const m = loc.pathname.match(/^\/join\/([A-Za-z0-9]+)/)
    if (m) localStorage.setItem('pending_invite', m[1].toUpperCase())
  }, [loc.pathname])

  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<LauncherPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/trip/onboarding" element={<OnboardingPage />} />
        <Route
          path="/trip"
          element={
            <RequireOnboarded>
              <AppShell />
            </RequireOnboarded>
          }
        >
          <Route index element={<TripDashboard />} />
          <Route path="food" element={<FoodPage />} />
          <Route path="bus" element={<BusPage />} />
          <Route path="poop" element={<PoopPage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="committees" element={<CommitteesPage />} />
          <Route path="devotionals" element={<DevotionalsPage />} />
          <Route path="flights" element={<FlightsPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  )
}
