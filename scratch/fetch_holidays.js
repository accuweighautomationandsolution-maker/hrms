import { supabase } from './src/utils/supabaseClient.js';
import { dataService } from './src/utils/dataService.js';

async function test() {
  const hols = await dataService.getCustomHolidays();
  console.log("Current Holidays in DB:", hols);
}
test();
