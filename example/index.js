const Hapi = require('hapi');
const plugin = require('../');
const server = new Hapi.Server({ debug: { log: ['ops and cpu', 'requests'] } });
server.connection({ port: 8080 });
server.register({
  register: plugin,
  options: {
    interval: 2000
  }
}, () => {
  server.route({
    path: '/',
    method: 'GET',
    handler(req, reply) {
      console.log('route called');
      reply('hi');
    }
  });
  server.start(() => {});
});
