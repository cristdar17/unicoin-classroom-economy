import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

export const createServerSupabaseClient = (event: H3Event) => {
  return serverSupabaseServiceRole(event)
}
