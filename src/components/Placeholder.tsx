import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/ui'
import { Hammer } from 'lucide-react'

/** Temporary scaffold for a feature page still being built in a later phase. */
export function Placeholder({ title, icon }: { title: string; icon?: LucideIcon }) {
  return (
    <div className="space-y-4 pt-2">
      <PageHeader title={title} icon={icon} />
      <EmptyState icon={Hammer} title="Coming together" body="This tool is being built in the next step." />
    </div>
  )
}
