'use strict';

/**

GCM helper
----------

Usage:
let push = require('./helpers/push')('/messages');
push.send('create', message);

*/

let gcm = require('node-gcm');
let config = rootRequire('config/config');
let log = require('./logger');

module.exports = function (topic) {

  return {
    send: (action, doc) => {
      let message = new gcm.Message({action, data: {document: doc}});
      let sender = new gcm.Sender(config.gcm.apiKey);
      sender.send(message, {topic: `/topics${topic}`}, 10, (err, result) => {
        if (err) {
          log.error(`[GCM error]`);
          log.error(err);
        } else {
          log.info(`[GCM result]`);
          log.info(result);
        }
      });
    }
  };

};