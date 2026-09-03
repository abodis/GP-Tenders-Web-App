import type { TenderDetailResponse } from '@/api/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TeamTab } from './tabs/team-tab'
import { ReferencesTab } from './tabs/references-tab'
import { ExclusionTab } from './tabs/exclusion-tab'

interface MatchFitnessTabsProps {
  tender: TenderDetailResponse
  state: 'fully_analyzed' | 'legacy_analyzed'
  sourceId: string
  tenderId: string
}

export function MatchFitnessTabs({ tender, state }: MatchFitnessTabsProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Match Fitness</h2>
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="references">References</TabsTrigger>
          <TabsTrigger value="exclusion">Exclusion</TabsTrigger>
        </TabsList>
        <TabsContent value="team">
          <TeamTab tender={tender} state={state} />
        </TabsContent>
        <TabsContent value="references">
          <ReferencesTab tender={tender} state={state} />
        </TabsContent>
        <TabsContent value="exclusion">
          <ExclusionTab tender={tender} state={state} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
