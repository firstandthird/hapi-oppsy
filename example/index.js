const Hapi = require('hapi');
const oppsyPlugin = require('../');

const startExampleServer = async function() {
  const server = new Hapi.Server({ port: 3000 });

  await server.register({
    plugin: require('hapi-logr'),
    options: {
      reporters: {
        flat: {
          reporter: require('logr-flat'),
        }
      }
    }
  });

  await server.register({
    plugin: oppsyPlugin,
    options: {
      logRequests: 'info',
      avgResponseTimeThreshold: 5,
      logCpu: 'warning',
      interval: 5000, // log some data every 5 seconds
      memoryThreshold: 80, // alert if memory use is above this threshold
      cpuThresholds: [0.5, 0.4, 0.3], // alert if 1/5/15 minute CPU averages are above their respective threshold
      failedRequestThreshold: 10 // alert if the % of requests that don't return 200 is above this threshold
    }
  });

  server.route({
    path: '/',
    method: 'GET',
    handler(req, h) {
      return 'hi';
    }
  });

  server.route({
    path: '/redirect',
    method: 'GET',
    handler(req, h) {
      return h.redirect('https://google.com');
    }
  });

  server.route({
    path: '/401',
    method: 'GET',
    handler(req, h) {
      const response = h.response('oops');
      response.statusCode = 401;

      return response;
    }
  });

  server.route({
    path: '/500',
    method: 'GET',
    handler(req, h) {
      const response = h.response('oops');
      response.statusCode = 500;

      return response;
    }
  });

  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
};

startExampleServer();
