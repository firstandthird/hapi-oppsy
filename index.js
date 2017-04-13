const Oppsy = require('oppsy');
exports.register = function(server, options, next) {
  const interval = options.interval || 1000 * 15;
  const oppsy = new Oppsy(server);
  oppsy.on('ops', (data) => {
    server.log(['ops'], data);
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
