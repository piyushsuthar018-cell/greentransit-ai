/**
 * GreenTransit AI - Automated Arena Evaluator & Route Comparator Test Suite
 * Tests strict compliance with:
 * - Mandatory Evaluator API Contract: POST /chat
 * - Route comparison: Silver Oak to Rabari Colony via SG Highway
 * - Multi-modal price comparison: Auto-Rickshaw, Uber/Ola, Rapido, Hybrid Metro
 * - Passenger count fare splitting (1, 2, 4 people)
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (postData) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const startTime = Date.now();
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data, duration });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data, duration, parseError: e });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runEvaluatorTests() {
  console.log('====================================================');
  console.log('🚀 Running GreenTransit AI Evaluator & Route Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Mandatory Evaluator Contract
    console.log('[Test Group 1: Mandatory /chat Evaluator Contract]');
    const test1 = await makeRequest('POST', '/chat', { message: 'How can I commute sustainably from Central Station to Tech Park?' });
    assert(test1.status === 200, 'POST /chat returns HTTP status 200', `Got ${test1.status}`);
    assert(
      test1.headers['content-type'] && test1.headers['content-type'].includes('application/json'),
      'Content-Type is application/json',
      `Got ${test1.headers['content-type']}`
    );
    assert(typeof test1.body.response === 'string' && test1.body.response.length > 0, 'Response payload contains "response" key');
    assert(typeof test1.body.message === 'string' && test1.body.message.length > 0, 'Response payload contains "message" key');
    assert(typeof test1.body.reply === 'string' && test1.body.reply.length > 0, 'Response payload contains "reply" key');
    assert(test1.duration < 500, 'Response latency is within fast evaluation threshold (< 500ms)', `${test1.duration}ms`);

    // 2. Silver Oak to Rabari Colony Comparison (2 people)
    console.log('\n[Test Group 2: Silver Oak to Rabari Colony Route Comparison (2 People)]');
    const testRoute = await makeRequest('POST', '/chat', { message: 'From Silver Oak to Rabari Colony for 2 people' });
    assert(testRoute.status === 200, 'POST /chat route comparison returns 200 OK');
    assert(testRoute.body.response.includes('SG Highway'), 'Mentions SG Highway corridor in directions');
    assert(testRoute.body.response.includes('AUTO-RICKSHAW') || testRoute.body.response.includes('Auto-Rickshaw') || testRoute.body.response.includes('Auto'), 'Includes Auto-Rickshaw pricing & capacity');
    assert(testRoute.body.response.includes('Uber') || testRoute.body.response.includes('Ola') || testRoute.body.response.includes('Cab') || testRoute.body.response.includes('CAB'), 'Includes Uber/Ola cab pricing');
    assert(testRoute.body.response.includes('HYBRID TRANSIT') || testRoute.body.response.includes('Hybrid Transit') || testRoute.body.response.includes('Metro'), 'Includes recommended Hybrid Metro path');
    assert(testRoute.body.route_data && testRoute.body.route_data.passengers === 2, 'Route data captures 2 passengers');
    assert(testRoute.body.carbon_saved_kg > 0, 'Calculates carbon saved by choosing green transit');

    // 3. Passenger Fare Splitting & Solo Ride (1 person)
    console.log('\n[Test Group 3: Solo Ride & Rapido Bike Taxi Handling (1 Person)]');
    const testSolo = await makeRequest('POST', '/chat', { message: 'from silver oak to rabari colony for 1 person' });
    assert(testSolo.status === 200, 'POST /chat solo query returns 200 OK');
    assert(testSolo.body.response.includes('Rapido') || testSolo.body.response.includes('Bike'), 'Includes Rapido Bike option for solo passenger');

    // 4. Passenger Group of 4 (Cab split & Auto capacity note)
    console.log('\n[Test Group 4: Passenger Group of 4 (Auto vs Cab Split)]');
    const testGroup = await makeRequest('POST', '/chat', { message: 'silver oak to rabari colony 4 people' });
    assert(testGroup.status === 200, 'POST /chat 4 people query returns 200 OK');
    assert(testGroup.body.route_data && testGroup.body.route_data.passengers === 4, 'Correctly parses 4 passengers');

    // 5. Carbon Footprint & Calculation in /chat
    console.log('\n[Test Group 5: Carbon Footprint & Multi-Modal Calculation in /chat]');
    const test2 = await makeRequest('POST', '/chat', { message: 'Calculate carbon footprint for 18 km drive vs metro' });
    assert(test2.status === 200, 'POST /chat calculation query returns 200 OK');
    assert(test2.body.carbon_saved_kg > 0, 'Calculates carbon savings in kg', `Saved: ${test2.body.carbon_saved_kg} kg`);
    assert(Array.isArray(test2.body.sdg_impact) && test2.body.sdg_impact.includes('SDG 11.2'), 'References SDG 11.2 target');

    // 6. SDG 11 & SDG 13 Knowledge Compliance
    console.log('\n[Test Group 6: SDG 11 & SDG 13 Knowledge Compliance]');
    const test3 = await makeRequest('POST', '/chat', { message: 'What are SDG 11 and SDG 13 goals for green transit?' });
    assert(test3.status === 200, 'POST /chat SDG query returns 200 OK');
    assert(test3.body.response.includes('SDG 11') && test3.body.response.includes('SDG 13'), 'Response provides detailed breakdown of SDG 11 and SDG 13');

    // 7. Edge Cases and Resilience
    console.log('\n[Test Group 7: Edge Cases and Resilience]');
    const test4Empty = await makeRequest('POST', '/chat', { message: '' });
    assert(test4Empty.status === 200, 'POST /chat with empty message returns 200 without crashing');
    const test4NoBody = await makeRequest('POST', '/chat', {});
    assert(test4NoBody.status === 200, 'POST /chat with empty object returns 200 OK');

    // 8. Direct Emissions Calculation API
    console.log('\n[Test Group 8: Direct Emissions Calculation API]');
    const testCalc = await makeRequest('POST', '/api/calculate-emissions', { distanceKm: 25 });
    assert(testCalc.status === 200, 'POST /api/calculate-emissions returns 200 OK');
    assert(testCalc.body.data && testCalc.body.data.modes.petrol_car, 'Emissions data contains petrol_car baseline');

    // 9. System Health Check
    console.log('\n[Test Group 9: System Health Check]');
    const health = await makeRequest('GET', '/health');
    assert(health.status === 200, 'GET /health returns 200 OK');
    assert(health.body.status === 'healthy', 'Health status is "healthy"');

    // 10. Dynamic Distance Scaling & Rate Cards Verification (4 km vs 25 km)
    console.log('\n[Test Group 10: Dynamic Proportional Scaling (4 km trip vs 25 km trip)]');
    const { calculateDynamicFares } = require('../src/mapService');
    
    // Test 4 km trip
    const f4 = calculateDynamicFares(4, 1);
    assert(f4.cab.fare === 116, '4 km Cab fare is ₹116 (₹50 base + 4*16.5)', `Got ₹${f4.cab.fare}`);
    assert(f4.bike.fare === 61, '4 km Bike fare is ₹61 (₹25 base + 4*9)', `Got ₹${f4.bike.fare}`);
    assert(f4.bus.fare === 10, '4 km Bus fare is ₹10 (0-5 km slab)', `Got ₹${f4.bus.fare}`);
    assert(f4.metro.fare === 15, '4 km Metro fare is ₹15 (0-5 km slab)', `Got ₹${f4.metro.fare}`);
    assert(f4.cab.durationMins === 15, '4 km Cab duration is ~15 mins ((4/25)*60 + 5)', `Got ${f4.cab.durationMins}m`);
    assert(f4.metro.durationMins === 12, '4 km Metro duration is ~12 mins ((4/35)*60 + 5)', `Got ${f4.metro.durationMins}m`);
    assert(f4.netSavings === 101, '4 km Net Savings is ₹101 (₹116 - ₹15)', `Got ₹${f4.netSavings}`);
    assert(f4.co2Averted === 0.500, '4 km CO2 averted is 0.500 kg', `Got ${f4.co2Averted} kg`);

    // Test 25 km trip
    const f25 = calculateDynamicFares(25, 1);
    assert(f25.cab.fare === 463, '25 km Cab fare is ₹463 (₹50 base + 25*16.5)', `Got ₹${f25.cab.fare}`);
    assert(f25.bike.fare === 250, '25 km Bike fare is ₹250 (₹25 base + 25*9)', `Got ₹${f25.bike.fare}`);
    assert(f25.bus.fare === 25, '25 km Bus fare is ₹25 (12-25 km slab)', `Got ₹${f25.bus.fare}`);
    assert(f25.metro.fare === 50, '25 km Metro fare is ₹50 (21-32 km slab)', `Got ₹${f25.metro.fare}`);
    assert(f25.cab.durationMins === 65, '25 km Cab duration is ~65 mins ((25/25)*60 + 5)', `Got ${f25.cab.durationMins}m`);
    assert(f25.metro.durationMins === 48, '25 km Metro duration is ~48 mins ((25/35)*60 + 5)', `Got ${f25.metro.durationMins}m`);
    assert(f25.netSavings === 413, '25 km Net Savings is ₹413 (₹463 - ₹50)', `Got ₹${f25.netSavings}`);
    assert(f25.co2Averted === 3.125, '25 km CO2 averted is 3.125 kg', `Got ${f25.co2Averted} kg`);

    // Proportional scaling assertions
    assert(f25.cab.fare > f4.cab.fare * 3, 'Cab fare scales dynamically with distance (> 3x)');
    assert(f25.metro.durationMins > f4.metro.durationMins * 3, 'Travel time scales proportionally with distance (> 3x)');
    assert(f25.netSavings > f4.netSavings * 3, 'Net savings scale proportionally with distance');

    // End-to-end /chat API tests with output table & header validation
    const testShortRoute = await makeRequest('POST', '/chat', { message: 'From Station to Market for 1 person' });
    assert(testShortRoute.status === 200, 'POST /chat short route returns 200 OK');
    assert(testShortRoute.body.response.includes('📍 Route:'), 'Response contains prominent distance header');
    assert(testShortRoute.body.response.includes('| Mode | Estimated Fare | Travel Time | CO₂ Footprint |'), 'Response contains required Markdown comparison table');
    assert(testShortRoute.body.response.includes('Net Savings'), 'Response contains Net Savings summary');

    const testLongRoute = await makeRequest('POST', '/chat', { message: 'From Station to Airport for 1 person' });
    assert(testLongRoute.status === 200, 'POST /chat long route returns 200 OK');
    assert(testLongRoute.body.response.includes('📍 Route:'), 'Response contains prominent distance header for long route');
    assert(testLongRoute.body.response.includes('| Mode | Estimated Fare | Travel Time | CO₂ Footprint |'), 'Response contains Markdown comparison table for long route');
    assert(testLongRoute.body.route_data.distanceKm > testShortRoute.body.route_data.distanceKm, 'Long route has greater distance than short route');


    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL ARENA EVALUATOR & ROUTE COMPARISON TESTS PASSED WITH 100% SUCCESS!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error running tests:', err);
    process.exit(1);
  }
}

runEvaluatorTests();
