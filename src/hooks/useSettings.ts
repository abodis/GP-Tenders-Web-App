import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, putSetting } from '@/api/endpoints'
import type {
  SettingType,
  SettingResponse,
  SelectionCriteriaSettings,
  AnalysisSettings,
  CompanyProfileSettings,
  RecipientsSettings,
} from '@/api/types'

const SETTINGS_KEY = ['settings'] as const

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: getSettings,
    select: (data) => {
      const map = new Map<string, SettingResponse>()
      for (const item of data.items) {
        map.set(item.setting_type, item)
      }
      return {
        selectionCriteria: map.get('selection-criteria') as SelectionCriteriaSettings | undefined,
        analysis: map.get('analysis') as AnalysisSettings | undefined,
        companyProfile: map.get('company-profile') as CompanyProfileSettings | undefined,
        recipients: map.get('recipients') as RecipientsSettings | undefined,
      }
    },
  })
}

export function useSaveSetting<T extends SettingResponse>(type: SettingType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: Omit<T, 'setting_type' | 'updated_at'>) =>
      putSetting<T>(type, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY })
    },
  })
}
