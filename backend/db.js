const oracledb = require('oracledb');
require('dotenv').config();

// Use the Thin Driver by default (no Instant Client or Wallet required for basic connections)
oracledb.initOracleClient(); 

async function initialize() {
  try {
    await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECTION_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    });
    console.log('Oracle Connection Pool initialized');
  } catch (err) {
    console.error('Error initializing connection pool:', err);
    process.exit(1);
  }
}

async function close() {
  try {
    await oracledb.getPool().close(0);
    console.log('Oracle Connection Pool closed');
  } catch (err) {
    console.error('Error closing connection pool:', err);
  }
}

function execute(sql, binds = [], opts = {}) {
  return new Promise(async (resolve, reject) => {
    let conn;
    opts.outFormat = oracledb.OUT_FORMAT_OBJECT;
    opts.autoCommit = true;

    try {
      conn = await oracledb.getConnection();
      const result = await conn.execute(sql, binds, opts);
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          console.error('Error closing connection:', err);
        }
      }
    }
  });
}

module.exports = {
  initialize,
  close,
  execute
};
