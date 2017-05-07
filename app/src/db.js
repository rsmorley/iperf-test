import pg from 'pg';

const config = {
  database: 'iperftests'
}

let pool = new pg.Pool(config);

function getTest(id, callback) {
  pool.query(`select * from tests where id = $1`,
      [id],
      callback);
}

function getTests(callback) {
  pool.query(`select * from tests`, callback);
}

function createTest(server, port, type, callback) {
  pool.query(`INSERT INTO tests (status, server, port, type) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['running', server, port, type],
      callback);
}

function updateTest(id, status, transferred, throughput, jitter, datagrams, callback) {
      pool.query(`UPDATE tests SET
          status = $1, transferred = $2, throughput = $3, jitter = $4, datagrams = $5, completed = $6
          where id = $7`,
        [status, transferred, throughput, jitter, datagrams, new Date(), id],
        callback)
}

function deleteTest(id, callback) {
  pool.query(`delete from tests where id = $1`,
      [id],
      callback);
}

module.exports = {
  getTest: getTest,
  getTests: getTests,
  createTest: createTest,
  updateTest: updateTest,
  deleteTest: deleteTest
};

