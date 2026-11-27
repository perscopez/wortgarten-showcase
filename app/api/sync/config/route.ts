import {validateSyncConfig} from '../../../../lib/sync-provider';
export async function GET(){const vars=process.env;const config=validateSyncConfig({url:vars.SUPABASE_URL,publishableKey:vars.SUPABASE_PUBLISHABLE_KEY});return Response.json(config?{ready:true,...config}:{ready:false,code:'SYNC_PROVIDER_NOT_CONFIGURED'},{headers:{'Cache-Control':'no-store'}});}
