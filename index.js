const Oppsy = require('oppsy');
const defaults = {
  cpu: true,
  requests: true,
  httpErrorRequestThreshold: false,
  memoryThreshold: 0
};

exports.register = function(server, options, next) {
  const port = server.info.port;
  options = Object.assign(defaults, options);
  const interval = options.interval || 1000 * 15;
  const oppsy = new Oppsy(server);
  oppsy.on('ops', (data) => {
    // count # of HTTP errs per report:
    let httpErrorRequestCount = 0;
    if (data.requests[port]) {
      Object.keys(data.requests[port].statusCodes).forEach((code) => {
        if (code !== '200') {
          httpErrorRequestCount++;
        }
      });
    }
    // log cpu/mem stats:
    server.log(['ops', 'cpu'], {
      total: data.osmem.total,
      free: data.osmem.free,
      osmem_free: `${ (data.osmem.total / data.osmem.free).toFixed(2) }%`,
    });
    server.log(['requests'], {
      requests: data.requests,
      response: data.responseTimes
    });
    if (options.memoryThreshold) {
      osload.forEach((osUse) => {
        if (osUse > memoryThreshold) {
          server.log(['threshold'], osUse);
        }
      });
    }
  });
  server.ext('onPostStart', (server2, next2) => {
    oppsy.start(interval);
    next2();
  });
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
