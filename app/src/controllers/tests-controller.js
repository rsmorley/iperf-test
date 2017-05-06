import cmd from 'node-cmd';
import pg from 'pg';
import validator from 'validator';
import _ from 'lodash';

const config = {
  database: 'iperftests'
}

let pool = new pg.Pool(config);

function getTests(req, res) {
  pool.query(`select * from tests`,
      (err, result) => {
        if (err) {
          console.error(`error retreiving tests:`, err);
          return res.status(500).json({
            success: false,
            error: {
              message: err
            }
          });
        }
        else {
          return res.status(200).json({
            success: true,
            payload: _.get(result, 'rows')
          });
        }
      });
}

function createTest(req, res) {
  let argErr = '';
  let validTypes = ['udp', 'tcp'];
  let minPort = 0;
  let maxPort = 65535;

  //TODO: test coverage
  let type = _.get(req.body, 'type', 'tcp');
  if (_.indexOf(validTypes, type) < 0) {
    argErr = `type ${type} not in valid types: ${validTypes}; `;
  }

  //TODO: test coverage
  let server = _.get(req.body, 'server');
  if(!server || !validator.isIP(server)) {
    argErr += `ipaddress ${server} is not a valid ipv4 or ipv6 address; `;
  }

  let port = _.get(req.body, 'port', 5001);
  //TODO: test edge cases
  if (!_.inRange(port, minPort, maxPort + 1)) {
    argErr += `port ${port} not in allowable range: ${minPort} - ${maxPort}; `;
  }

  // return 400 if args were invalid
  if (argErr) {
      return res.status(400).json({
        success: false,
        error: {
          message: argErr
        }
      });
  }

  pool.query(`INSERT INTO tests (status, server, port, type) VALUES ($1, $2, $3, $4) RETURNING id`,
    ['running', server, port, type],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: {
            message: err
          }
        });
      }
      else {
        let testId = _.get(result, 'rows[0].id');
        runTest(testId, type, server, port);
        return res.status(201).json({
          success: true,
          payload: {
            id: testId
          }
        });
      }
    }
  );
}

function getTest(req, res) {
  let id = req.params.testId;
  pool.query(`select * from tests where id = $1`,
      [id],
      (err, result) => {
        if (err) {
          console.error(`error retreiving test ${testId}:`, err);
          return res.status(500).json({
            success: false,
            error: {
              message: err
            }
          });
        }
        else {
          if (result.rows.length) {
            return res.status(200).json({
              success: true,
              payload: _.get(result, 'rows[0]', {})
            });
          }
          else {
            return res.status(404).end();
          }
        }
      });
}

function deleteTest(req, res) {
  let id = req.params.testId;
  pool.query(`delete from tests where id = $1`,
      [id],
      (err, result) => {
        if (err) {
          console.error(`error deleting test ${testId}:`, err);
          return res.status(500).json({
            success: false,
            error: {
              message: err
            }
          });
        }
        else {
          //don't return 404 for non-existent tests
          return res.status(204).end();
        }
      });
}

//helper functions
function runTest(testId, type, server, port) {
  let udpFlag = type === 'udp' ? '-u' : '';
  cmd.get(`iperf ${udpFlag} -c ${server} -p ${port}`, (err, data, stderr) => {
    if (!err) {
      let rowToParse = "";
      data.split(/\r?\n/).map((row, index, originalArray) => {
        if (row.indexOf("Interval") > -1 || row.indexOf("Server Report") > -1) {
          // the next for is the one we care about
          // overwrite with Server Report data for UDP tests
          rowToParse = _.get(originalArray, index+1, "");
        }
      });

      let { transferred, throughput, jitter, datagrams } = parseResult(rowToParse);

      pool.query(`UPDATE tests SET
          status = $1, transferred = $2, throughput = $3, jitter = $4, datagrams = $5, completed = $6
          where id = $7`,
        ['completed', transferred, throughput, jitter, datagrams, new Date(), testId],
        (err, result) => {
          if (err) {
            console.error(`error updating test ${testId}:`, err);
          }
        }
      );
    }
    else {
      console.error('error running iperf command: ', err);
      pool.query(`UPDATE tests SET status = $1, completed = $2, error = $3 where id = $4`,
        ['failed', new Date(), err, testId],
        (err, result) => {
          if (err) {
            console.error(`error updating test ${testId}:`, err);
          }
        }
      );
    }
  });
}

function parseResult(result) {
  let transferred = extractString(/(?:\S+\s)?\S*Bytes/, result);
  let throughput = extractString(/(?:\S+\s)?\S*\/sec/, result);
  let jitter = extractString(/(?:\S+\s)?\S*ms/, result);
  let datagrams = extractString(/(?:\S+\s*)?\S*(?:\S+\s)?\S*%\)/, result);
  return { transferred, throughput, jitter, datagrams };
}

function extractString(regex, stringToMatch) {
  let match = stringToMatch.match(regex);
  return _.get(match, 0, null);
}

module.exports = {
  getTests: getTests,
  createTest: createTest,
  getTest: getTest,
  deleteTest: deleteTest
};
