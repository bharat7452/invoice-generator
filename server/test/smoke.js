// End-to-end smoke test: spins up an in-memory MongoDB and exercises the API.
// Run with: npm test
process.env.NODE_ENV = 'test';
const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const createApp = require('../app');

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  const server = createApp(uri).listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = '';

  async function call(method, url, body) {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json().catch(() => ({})) };
  }

  try {
    // unauthenticated access is blocked
    assert.strictEqual((await call('GET', '/invoices')).status, 401);

    // register + session
    let r = await call('POST', '/auth/register', { name: 'Test', email: 'T@x.com', password: 'secret1', businessName: 'Test Co' });
    assert.strictEqual(r.status, 201);
    assert.strictEqual((await call('GET', '/auth/me')).data.email, 't@x.com');

    // duplicate email rejected
    assert.strictEqual((await call('POST', '/auth/register', { name: 'T', email: 't@x.com', password: 'secret1' })).status, 409);

    // create invoice; totals are computed server-side
    r = await call('POST', '/invoices', {
      customer: { name: 'Acme' },
      dueDate: new Date(Date.now() - 86400000).toISOString(),
      items: [{ description: 'Design', quantity: 2, rate: 500 }, { description: 'Hosting', quantity: 1, rate: 250.5 }],
      taxPercent: 18,
      discount: 50,
      total: 1, // must be ignored
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.data.number, 'INV-0001');
    assert.strictEqual(r.data.subtotal, 1250.5);
    assert.strictEqual(r.data.tax, 216.09);
    assert.strictEqual(r.data.total, 1416.59);
    const id = r.data._id;

    // validation
    assert.strictEqual((await call('POST', '/invoices', { customer: { name: 'X' }, dueDate: new Date(), items: [] })).status, 400);

    // update recalculates
    r = await call('PUT', `/invoices/${id}`, { items: [{ description: 'Design', quantity: 1, rate: 100 }], taxPercent: 0, discount: 0 });
    assert.strictEqual(r.data.total, 100);

    // status + stats (invoice is overdue until paid)
    await call('PATCH', `/invoices/${id}/status`, { status: 'sent' });
    r = await call('GET', '/invoices/stats');
    assert.strictEqual(r.data.overdue.count, 1);
    await call('PATCH', `/invoices/${id}/status`, { status: 'paid' });
    r = await call('GET', '/invoices/stats');
    assert.strictEqual(r.data.paid.amount, 100);
    assert.strictEqual(r.data.overdue.count, 0);

    // search
    r = await call('GET', '/invoices?q=acme');
    assert.strictEqual(r.data.length, 1);

    // another user cannot see this invoice
    cookie = '';
    await call('POST', '/auth/register', { name: 'Other', email: 'o@x.com', password: 'secret1' });
    assert.strictEqual((await call('GET', `/invoices/${id}`)).status, 404);
    assert.strictEqual((await call('GET', '/invoices')).data.length, 0);

    // delete
    cookie = '';
    await call('POST', '/auth/login', { email: 't@x.com', password: 'secret1' });
    assert.strictEqual((await call('DELETE', `/invoices/${id}`)).status, 200);
    assert.strictEqual((await call('GET', `/invoices/${id}`)).status, 404);

    // logout
    await call('POST', '/auth/logout');
    assert.strictEqual((await call('GET', '/auth/me')).status, 401);

    console.log('All smoke tests passed');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
})();
