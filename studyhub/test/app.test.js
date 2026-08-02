const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../app');

test('login page loads successfully', async () => {
  const response = await request(app).get('/login');

  assert.equal(response.status, 200);
  assert.match(response.text, /Log In/);
});

test('registration page loads successfully', async () => {
  const response = await request(app).get('/register');

  assert.equal(response.status, 200);
  assert.match(response.text, /Create Account/);
});

test('unauthenticated users cannot access the home page', async () => {
  const response = await request(app).get('/home');

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('unauthenticated users cannot access tasks', async () => {
  const response = await request(app).get('/tasks');

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('unauthenticated users cannot access the marketplace', async () => {
  const response = await request(app).get('/marketplace');

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('unauthenticated users cannot access tutors', async () => {
  const response = await request(app).get('/tutors');

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('login rejects missing fields', async () => {
  const response = await request(app)
    .post('/auth/login')
    .type('form')
    .send({});

  assert.equal(response.status, 200);
  assert.match(response.text, /required/i);
});

test('registration rejects missing fields', async () => {
  const response = await request(app)
    .post('/auth/register')
    .type('form')
    .send({});

  assert.equal(response.status, 200);
  assert.match(response.text, /required/i);
});

test('admin page rejects unauthenticated users', async () => {
  const response = await request(app).get('/admin');

  assert.equal(response.status, 403);
  assert.match(response.text, /Access Denied/);
});

test('unauthorized page returns HTTP 403', async () => {
  const response = await request(app).get('/unauthorized');

  assert.equal(response.status, 403);
  assert.match(response.text, /Access Denied/);
});