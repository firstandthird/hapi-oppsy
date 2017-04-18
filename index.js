'use strict';
const Oppsy = require('oppsy');

const defaults = {
  failedRequestThreshold: 100,
  memoryThreshold: 100,
  cpuThresholds: [1.0, 1.0, 1.0] // 1, 5 and 15-minute load averages
};

exports.register = function(server, options, next) {
  const port = server.info.port;
  options = Object.assign({}, defaults, options);
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
    // server.log cpu/mem stats:
    const freeMb = data.osmem.free / 1048576;
    const totalMb = data.osmem.total / 1048576;
    const memPercent = (freeMb / totalMb).toFixed(2) * 100;
    server.log(['ops', 'cpu'], {
      memory_used: `${(totalMb - freeMb).toFixed(2)}mb`,
      memory_free: `${(freeMb).toFixed(2)}mb`,
    });
    server.log(['ops', 'cpu'], {
      memory_percent: `${memPercent}%`
    });
    server.log(['ops', 'cpu'], {
      '1-minute': data.osload[0].toFixed(3),
      '5-minute': data.osload[1].toFixed(3),
      '15-minute': data.osload[2].toFixed(3)
    });
    // warn if memory consumption exceeds the expected threshold:
    if (memPercent > options.memoryThreshold) {
      server.log(['ops', 'threshold'], `WARNING: MEMORY USE OF ${memPercent}% EXCEEDS THRESHOLD OF ${options.memoryThreshold}%!!!!`);
    }
    // warn if any of the CPU load averages exceeds the expected threshold:
    for (var i = 0; i < 3; i++) {
      const cpuLabel = ['1-MINUTE', '5-MINUTE', '15-MINUTE'][i];
      const cpuThreshold = options.cpuThresholds[i];
      const cpuAvg = data.osload[i];
      if (cpuAvg > cpuThreshold) {
        server.log(['ops', 'threshold'], `WARNING: AVERAGE ${cpuLabel} CPU LOAD OF ${cpuAvg} EXCEEDS THRESHOLD OF ${cpuThreshold}`);
      }
    }
    // server.log request info:
    // track % of requests that were not HTTP OK:
    if (data.requests[server.info.port] !== undefined && data.requests[server.info.port].total !== 0) {
      let totalRequestsProcessed = 0;
      let totalErrorRequests = 0;
      const requestData = data.requests[server.info.port];
      server.log(['ops', 'requests'], requestData);
      totalRequestsProcessed += requestData.total;
      Object.keys(requestData.statusCodes).forEach((code) => {
        if (code !== '200') {
          totalErrorRequests += requestData.statusCodes[code];
        }
      });
      const failedRequestPercent = ((totalErrorRequests / totalRequestsProcessed) * 100).toFixed(2);
      if (failedRequestPercent > options.failedRequestThreshold) {
        server.log(['ops', 'threshold'], `WARNING: ${failedRequestPercent}% OF HTTP REQUESTS HAVE RETURNED A NON-200 CODE`);
      }
    }
  });
  server.expose('oppsy', oppsy);
  server.ext('onPostStart', (server2, next2) => {
    oppsy.start(interval);
    next2();
  });
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
