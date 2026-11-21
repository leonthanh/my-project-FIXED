const express = require('express');
const request = require('supertest');
const { notFound, errorHandler } = require('../middlewares/errorHandler');
const progressReportsRoutes = require('../routes/progressReports');
const { signAccessToken } = require('../utils/tokens');

const app = express();
app.use('/api/progress-reports', progressReportsRoutes);
app.use(notFound);
app.use(errorHandler);

const tokenFor = (role) => signAccessToken({ userId: `progress-report-${role}`, role });

describe('progress report access', () => {
  const previousAccessSecret = process.env.JWT_ACCESS_SECRET;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'progress-report-test-secret';
  });

  afterAll(() => {
    if (previousAccessSecret === undefined) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = previousAccessSecret;
    }
  });

  test('requires a valid access token', async () => {
    await request(app).get('/api/progress-reports/general').expect(401);
  });

  test('denies students', async () => {
    await request(app)
      .get('/api/progress-reports/general')
      .set('Authorization', `Bearer ${tokenFor('student')}`)
      .expect(403);
  });

  test.each([
    ['teacher', 'general', 'Star Edu Progress Report System'],
    ['admin', 'ielts', 'Star Edu IELTS Progress Report System'],
  ])('serves the %s-authorized %s report', async (role, reportId, heading) => {
    const response = await request(app)
      .get(`/api/progress-reports/${reportId}`)
      .set('Authorization', `Bearer ${tokenFor(role)}`)
      .expect('Content-Type', /text\/html/)
      .expect(200);

    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.text).toContain(heading);
  });

  test('returns not found for an unregistered report id', async () => {
    await request(app)
      .get('/api/progress-reports/unknown')
      .set('Authorization', `Bearer ${tokenFor('teacher')}`)
      .expect(404);
  });
});
