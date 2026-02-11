
import { createClient } from '@supabase/supabase-js';

// Connection details updated to the functional node provided
export const supabaseUrl = 'https://uwgzufyfebdaxrpdzger.supabase.co';
export const supabaseAnonKey = 'sb_publishable_fxEyf7v-ShPhxj3E8CDixg_x6phMSrn';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
