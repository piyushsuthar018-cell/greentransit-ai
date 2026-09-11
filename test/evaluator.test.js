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
