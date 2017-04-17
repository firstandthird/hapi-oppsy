const Hapi = require('hapi');
const plugin = require('../');
const server = new Hapi.Server({ debug: { log: ['ops', 'threshold'] } });
server.connection({ port: 8080 });
server.register({
  register: plugin,
  options: {
    interval: 5000, // log some data every 5 seconds
    memoryThreshold: 40, // alert if memory use is above this threshold
    cpuThresholds: [.5, .4, .3], // alert if 1/5/15 minute CPU averages are above their respective threshold
    failedRequestThreshold: 10 // alert if the % of requests that don't return 200 is above this threshold
  }
}, () => {
  server.route({
    path: '/',
    method: 'GET',
    handler(req, reply) {
      reply('hi');
    }
  });
  server.start(() => {
    // try hitting the '/' route as well as an undefined route to see request data
    // for both successful and failed HTTP transactions
  });
});
