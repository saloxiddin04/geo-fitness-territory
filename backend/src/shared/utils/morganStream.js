const logger = require('./logger');

// Morgan HTTP loglarini Winston orqali yo'naltirish
const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = morganStream;
