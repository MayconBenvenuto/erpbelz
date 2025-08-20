import { Module, Global } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'

@Global()
@Module({
  providers: [
    {
      provide: 'SUPABASE',
      useFactory: () => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !key) {
          throw new Error('Supabase URL/Key não configurados')
        }
        return createClient(url, key)
      },
    },
  ],
  exports: ['SUPABASE'],
})
export class SupabaseModule {}
