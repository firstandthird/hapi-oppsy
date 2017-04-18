'use strict';
const Oppsy = require('oppsy');

const defaults = {
  interval: 1000 * 15,
  verbose: false,
  logMemory: 'info', //info, warning
  logCpu: 'info', //info, warning
  logRequests: 'info', //info, warning
  failedRequestThreshold: 10,
  memoryThreshold: 80,
  cpuThresholds: [1.0, 1.0, 1.0] // 1, 5 and 15-minute load averages
};

exports.register = function(server, options, next) {
  const port = server.info.port;
  options = Object.assign({}, defaults, options);
  const oppsy = new Oppsy(server);
  oppsy.on('ops', (data) => {
    if (options.logMemory) {
      const freeMb = data.osmem.free / 1048576;
      const totalMb = data.osmem.total / 1048576;
      const memPercent = 100 - ((freeMb / totalMb).toFixed(2) * 100);
      if (options.logMemory === 'info') {
        server.log(['ops', 'memory'], {
          used: `${(totalMb - freeMb).toFixed(2)}mb`,
          free: `${(freeMb).toFixed(2)}mb`,
          percentUsed: `${memPercent}%`
        });
      }
      // warn if memory consumption exceeds the expected threshold:
      if (memPercent > options.memoryThreshold) {
        server.log(['ops', 'memory', 'warning', 'threshold'], `${memPercent}% of memory used. Exceeds threshold of ${options.memoryThreshold}%`);
      }
    }
    if (options.logCpu) {
      if (options.logCpu === 'info') {
        server.log(['ops', 'cpu'], {
          '1-minute': data.osload[0].toFixed(3),
          '5-minute': data.osload[1].toFixed(3),
          '15-minute': data.osload[2].toFixed(3)
        });
      }
      // warn if any of the CPU load averages exceeds the expected threshold:
      for (let i = 0; i < 3; i++) {
        const cpuLabel = ['1-minute', '5-minute', '15-minute'][i];
        const cpuThreshold = options.cpuThresholds[i];
        const cpuAvg = data.osload[i];
        if (cpuAvg > cpuThreshold) {
          server.log(['ops', 'cpu', 'warning', 'threshold'], `Average ${cpuLabel} CPU load of ${cpuAvg} exceeds threshold of ${cpuThreshold}`);
        }
      }
    }

    if (options.logRequests) {
      // server.log request info:
      // track % of requests that were not HTTP OK:
      if (data.requests[port] !== undefined && data.requests[port].total !== 0) {
        let totalRequestsProcessed = 0;
        let totalErrorRequests = 0;
        const requestData = data.requests[port];
        if (options.logRequests === 'info') {
          server.log(['ops', 'requests'], requestData);
        }
        totalRequestsProcessed += requestData.total;
        Object.keys(requestData.statusCodes).forEach((code) => {
          if (code !== '200') {
            totalErrorRequests += requestData.statusCodes[code];
          }
        });
        const failedRequestPercent = ((totalErrorRequests / totalRequestsProcessed) * 100).toFixed(2);
        if (failedRequestPercent > options.failedRequestThreshold) {
          server.log(['ops', 'requests', 'threshold', 'warning'], `${failedRequestPercent}% of http requests have returned a non-200 code`);
        }
      }
    }
  });
  server.expose('oppsy', oppsy);
  server.ext('onPostStart', (server2, next2) => {
    oppsy.start(options.interval);
    next2();
  });
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
