import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 20 },  // Ramp up to 20 users
    { duration: '40s', target: 50 },  // Steady test at 50 users
    { duration: '20s', target: 100 }, // Peak stress at 100 users
    { duration: '15s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% of requests below 150ms
    http_req_failed: ['rate<0.02'],   // Error rate below 2%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000';

export default function () {
  // 1. Liveness Probe
  const liveRes = http.get(`${BASE_URL}/health/live`);
  check(liveRes, {
    'liveness status is 200': (r) => r.status === 200,
    'liveness response ok': (r) => JSON.parse(r.body).status === 'ok',
  });

  // 2. Prometheus Metrics
  const metricsRes = http.get(`${BASE_URL}/metrics`);
  check(metricsRes, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics content-type valid': (r) => (r.headers['Content-Type'] || '').includes('text/plain'),
  });

  // 3. Service Welcome API
  const rootRes = http.get(`${BASE_URL}/`);
  check(rootRes, {
    'root status is 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
