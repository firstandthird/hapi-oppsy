'use strict';
const chalk = require('chalk');
const Oppsy = require('oppsy');

const defaults = {
  cpu: true,
  requests: true,
  httpErrorRequestThreshold: false,
  memoryThreshold: 20
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
    const oneMb = 1048576;
    const freeMb = data.osmem.free / oneMb;
    const totalMb = data.osmem.total / oneMb;
    const memPercent = (freeMb / totalMb).toFixed(2) * 100;
    const memPercentString = chalk.blue(`${memPercent}%`);
    server.log(['ops and cpu'], `
    ${chalk.yellow('System Memory')}: ${(totalMb - freeMb).toFixed(0)}mb (${memPercentString})
    ${chalk.yellow('CPU Load Average')}: 1-minute: ${chalk.blue(data.osload[0])} 5-minute: ${chalk.blue(data.osload[1])}  15-minute: ${chalk.blue(data.osload[2])}
    `);
    if (memPercent > options.memoryThreshold) {
      server.log(['threshold'], chalk.red(`WARNING: Memory use of ${chalk.blue(memPercent)}% exceeds threshold of ${chalk.blue(options.threshold)}%`));
    }
    // todo: only print requests if needed:
    server.log(['requests'], {
      requests: data.requests,
      response: data.responseTimes
    });
    // if (options.memoryThreshold) {
    //   osload.forEach((osUse) => {
    //     if (osUse > memoryThreshold) {
    //       server.log(['threshold'], osUse);
    //     }
    //   });
    // }
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
