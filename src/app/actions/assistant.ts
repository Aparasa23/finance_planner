'use server'

import { createClient } from '@/lib/supabase/server'
import { askFinancialAssistant as askGemini } from '@/lib/assistant/gemini'

export async function askFinancialAssistant(
  message: string,
  chatHistory: Array<{ role: 'user' | 'model'; parts: any[] }> = []
) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized user session' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { error: 'Household onboarding required' }
  }

  try {
    const result = await askGemini(profile.household_id, message, chatHistory)
    return { success: true, answer: result.answer, history: result.history }
  } catch (err: any) {
    console.error('Error in assistant Server Action:', err)
    return { error: err.message || 'Failed to generate assistant response' }
  }
}
