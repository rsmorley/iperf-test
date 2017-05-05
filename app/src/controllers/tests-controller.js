import cmd from 'node-cmd';
import pg from 'pg';
import validator from 'validator';
import _ from 'lodash';

const config = {
  database: 'iperftests'
}

let pool = new pg.Pool(config);

function getTests(req, res) {
  //TODO: return tests from db
  return res.status(200).json({output: data});
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
  //TODO: get specific tests details
  return res.status(200).json();
}

function deleteTest(req, res) {
  //TODO: delete specified tests
  return res.status(204).json();
}

//helper functions
function runTest(testId, type, server, port) {
  let udpFlag = type === 'udp' ? '-u' : '';
  cmd.get(`iperf ${udpFlag} -c ${server} -p ${port}`, (err, data, stderr) => {
    if (!err) {
      pool.query(`UPDATE tests SET status = $1, completed = $2 where id = $3`,
        ['completed', new Date(), testId],
        (err, result) => {
          if (err) {
            console.error(`error updated test ${testId}:`, err);
          }
        }
      );
    }
    else {
      //TODO: add error to schema
      console.error('error running iperf command: ', err);
    }
  });
}

module.exports = {
  getTests: getTests,
  createTest: createTest,
  getTest: getTest,
  deleteTest: deleteTest
};
