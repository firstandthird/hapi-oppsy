const Hapi = require('hapi');
const code = require('code');
const lab = exports.lab = require('lab').script();
const hapiOppsy = require('../index.js');

let server;

lab.beforeEach((done) => {
  server = new Hapi.Server({
    debug: {
      log: ['hapi-oppsy']
    },
    host: 'localhost',
    port: 8000
  });
});

lab.afterEach(async (done) => {
  await server.stop();
});

lab.test('logs memory', { timeout: 200 }, async () => {
  const logs = [];

  server.events.on('log', (logObj) => {
    code.expect(logObj.tags).to.include('memory');
    logs.push(logObj);
  });

  await server.register({
    plugin: hapiOppsy,
    options: {
      interval: 50,
      logCpu: false,
      logMemory: 'info',
      logRequests: false
    }
  });

  await server.start();

  await new Promise(resolve => setTimeout(resolve, 100));
  code.expect(logs.length).to.be.above(1);
});

lab.test('warns if memory over threeshold', { timeout: 200 }, async () => {
  const logs = [];

  server.events.on('log', (logObj) => {
    code.expect(logObj.tags).to.include('memory');
    logs.push(logObj);
  });

  await server.register({
    plugin: hapiOppsy,
    options: {
      interval: 50,
      logCpu: false,
      logMemory: 'info',
      memoryThreshold: 1,
      logRequests: false
    }
  });

  await server.start();

  await new Promise(resolve => setTimeout(resolve, 100));
  code.expect(logs.length).to.be.above(1);
  const warning = logs.find(i => i.tags.includes('warning'));
  code.expect(warning).to.exist();
});

lab.test('can disable memory info logging', { timeout: 200 }, async () => {
  const logs = [];

  server.events.on('log', (logObj) => {
    code.expect(logObj.tags).to.not.include('memory');
    logs.push(logObj);
  });

  await server.register({
    plugin: hapiOppsy,
    options: {
      interval: 50,
      logCpu: false,
      logMemory: 'warn',
      memoryThreshold: 100,
      logRequests: false
    }
  });

  await server.start();

  await new Promise(resolve => setTimeout(resolve, 100));
  code.expect(logs.length).to.equal(0);
});

lab.test('can disable memory logging', { timeout: 200 }, async () => {
  const logs = [];

  server.events.on('log', (logObj) => {
    code.expect(logObj.tags).to.not.include('memory');
    logs.push(logObj);
  });

  await server.register({
    plugin: hapiOppsy,
    options: {
      interval: 50,
      logCpu: false,
      logMemory: false,
      memoryThreshold: 100,
      logRequests: false
    }
  });

  await server.start();

  await new Promise(resolve => setTimeout(resolve, 100));
  code.expect(logs.length).to.equal(0);
});

lab.test('logs cpu', { timeout: 200 }, async () => {
  const logs = [];

  server.events.on('log', (logObj) => {
    code.expect(logObj.tags).to.include('cpu');
    logs.push(logObj);
  });

  await server.register({
    plugin: hapiOppsy,
    options: {
      interval: 50,
      logCpu: 'info',
      logMemory: false,
      logRequests: false
    }
  });

  await server.start();

  await new Promise(resolve => setTimeout(resolve, 100));
  code.expect(logs.length).to.be.above(1);
});

lab.test('can disable cpu logging', { timeout: 200 }, async () => {
  const logs = [];

  server.events.on('log', (logObj) => {
    code.expect(logObj.tags).to.not.include('cpu');
    logs.push(logObj);
  });

  await server.register({
    plugin: hapiOppsy,
    options: {
      interval: 50,
      logCpu: 'warn',
      logMemory: false,
      logRequests: false,
      cpuThresholds: [10, 10, 10]
    }
  });

  await server.start();

  await new Promise(resolve => setTimeout(resolve, 100));
  code.expect(logs.length).to.equal(0);
});

lab.test('logs requests', { timeout: 200 }, async () => {
  const logs = [];

  server.events.on('log', (logObj) => {
    code.expect(logObj.tags).to.include('requests');
    logs.push(logObj);
  });

  await server.register({
    plugin: hapiOppsy,
    options: {
      interval: 50,
      logCpu: false,
      logMemory: false,
      logRequests: 'info'
    }
  });

  server.route({
    method: 'get',
    path: '/',
    handler: () => 'ok'
  });

  await server.start();

  await server.inject({ method: 'get', url: '/' });

  await new Promise(resolve => setTimeout(resolve, 100));
  code.expect(logs.length).to.equal(1);
});

lab.test('logs bad requests', { timeout: 200 }, async () => {
  const logs = [];

  server.events.on('log', (logObj) => {
    code.expect(logObj.tags).to.include('requests');
    code.expect(logObj.tags).to.include('warning');
    logs.push(logObj);
  });

  await server.register({
    plugin: hapiOppsy,
    options: {
      interval: 50,
      logCpu: false,
      logMemory: false,
      logRequests: 'warn'
    }
  });

  server.route({
    method: 'get',
    path: '/',
    handler: (request, h) => {
      const response = h.response('bad');
      response.statusCode = 400;
      return response;
    }
  });

  await server.start();

  await server.inject({ method: 'get', url: '/' });

  await new Promise(resolve => setTimeout(resolve, 100));
  code.expect(logs.length).to.equal(1);
});

lab.test('logs slow requests', { timeout: 1000 }, async () => {
  const logs = [];

  server.events.on('log', (logObj) => {
    code.expect(logObj.tags).to.include('requests');
    code.expect(logObj.tags).to.include('warning');
    logs.push(logObj);
  });

  await server.register({
    plugin: hapiOppsy,
    options: {
      interval: 50,
      logCpu: false,
      logMemory: false,
      logRequests: 'warn',
      avgResponseTimeThreshold: 10
    }
  });

  server.route({
    method: 'get',
    path: '/',
    handler: async (request) => {
      await new Promise(resolve => setTimeout(resolve, ~~request.query.delay));
      return 'ok';
    }
  });

  await server.start();

  await server.inject({ method: 'get', url: '/?delay=10' });
  await server.inject({ method: 'get', url: '/?delay=100' });
  await server.inject({ method: 'get', url: '/?delay=50' });

  await new Promise(resolve => setTimeout(resolve, 100));
  code.expect(logs.length).to.be.above(0);
});

lab.test('handles requests logging with no requests made', { timeout: 200 }, async () => {
  const logs = [];

  server.events.on('log', (logObj) => {
    code.expect(logObj.tags).to.not.include('requests');
    logs.push(logObj);
  });

  await server.register({
    plugin: hapiOppsy,
    options: {
      interval: 50,
      logCpu: false,
      logMemory: false,
      logRequests: 'info'
    }
  });

  await server.start();

  await new Promise(resolve => setTimeout(resolve, 100));
  code.expect(logs.length).to.equal(0);
});
