const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    process.env[key] = value;
  }
});

// Import predictor logic directly using custom transpilation/require wrapper or relative mock since we want to run in Node
async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Get profile / household ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .limit(1)
    .single();

  if (!profile?.household_id) {
    console.error("Household ID not found.");
    return;
  }

  // 2. Fetch all bills
  const { data: bills } = await supabase
    .from('bills')
    .select('*')
    .eq('household_id', profile.household_id);

  if (!bills || bills.length === 0) {
    console.log("No bills found to predict.");
    return;
  }

  // Define prediction function manually to run inside this Node script
  async function predictNextDueDate(billName, householdId) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 120);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: txs } = await supabase
      .from('transactions')
      .select('date, amount, description, normalized_merchant')
      .eq('household_id', householdId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (!txs || txs.length === 0) return null;

    const cleanName = billName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matches = txs.filter(tx => {
      const descClean = (tx.description || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const merchantClean = (tx.normalized_merchant || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return descClean.includes(cleanName) || cleanName.includes(descClean) ||
             merchantClean.includes(cleanName) || cleanName.includes(merchantClean);
    });

    if (matches.length < 2) return null;

    const days = matches.map(tx => {
      const d = new Date(tx.date + 'T12:00:00');
      return d.getDate();
    });

    const sortedDays = [...days].sort((a, b) => a - b);
    const mid = Math.floor(sortedDays.length / 2);
    const predictedDay = sortedDays.length % 2 !== 0 ? sortedDays[mid] : Math.round((sortedDays[mid - 1] + sortedDays[mid]) / 2);

    const spread = Math.max(...days) - Math.min(...days);
    let adjustedSpread = spread;
    if (spread > 20) {
      const wrappedDays = days.map(d => d < 10 ? d + 31 : d);
      adjustedSpread = Math.max(...wrappedDays) - Math.min(...wrappedDays);
    }

    let confidence = 'none';
    if (adjustedSpread <= 3) confidence = 'high';
    else if (adjustedSpread <= 6) confidence = 'medium';
    else return null;

    const today = new Date();
    let targetYear = today.getFullYear();
    let targetMonth = today.getMonth();

    const daysInCurrentMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const currentMonthDay = Math.min(predictedDay, daysInCurrentMonth);
    const currentMonthDueDate = new Date(targetYear, targetMonth, currentMonthDay, 12, 0, 0);

    if (currentMonthDueDate < today) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const finalDay = Math.min(predictedDay, daysInTargetMonth);
    
    const mm = String(targetMonth + 1).padStart(2, '0');
    const dd = String(finalDay).padStart(2, '0');
    
    return {
      predictedDay,
      confidence,
      lastPayments: matches.map(m => `${m.date} ($${Number(m.amount).toFixed(2)})`).slice(0, 3),
      nextDueDate: `${targetYear}-${mm}-${dd}`
    };
  }

  console.log("Analyzing last 3 months of checking transactions...");
  console.log("--------------------------------------------------");

  for (const bill of bills) {
    const prediction = await predictNextDueDate(bill.name, profile.household_id);
    if (prediction) {
      console.log(`\n📦 Bill: "${bill.name}"`);
      console.log(`   - Predicted Day of Month: ${prediction.predictedDay}th`);
      console.log(`   - Next Auto-Pay Prediction: ${prediction.nextDueDate} (Confidence: ${prediction.confidence.toUpperCase()})`);
      console.log(`   - Detected Historical Payments:`, prediction.lastPayments);
    } else {
      console.log(`\n❌ Bill: "${bill.name}" -> No historical payment pattern detected in last 3 months.`);
    }
  }
}

run();
