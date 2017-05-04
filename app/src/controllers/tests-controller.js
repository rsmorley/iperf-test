import cmd from 'node-cmd';
import pg from 'pg';
import validator from 'validator';
import _ from 'lodash';

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/iperftests';

//TODO: output in json?

function getTests(req, res) {
  //TODO: return tests from db
  return res.status(200).json({output: data});
}

function createTest(req, res) {
  let argErr;
  let validTypes = ['udp', 'tcp'];
  let minPort = 0;
  let maxPort = 65535;

  //TODO: test
  let type = _.get(req.body, 'type', 'tcp');
  if (_.indexOf(validTypes, type) < 0) {
    argErr = `type ${type} not in valid types: ${validTypes}; `;
  }

  //TODO: test
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

  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      return res.status(500).json({
        success: false,
        error: {
          message: err
        }
      });
    }
    else {
      console.log('type ', type, ' server ', server, ' port ', port);
      //client.query('INSERT into tests(status, server, port, transferred, throughput, jitter, datagrams, started, completed) values("running",
    }
  });

  let udpFlag = type === 'udp' ? '-u' : '';
  cmd.get(`iperf ${udpFlag} -c ${server} -p ${port}`, (err, data, stderr) => {
    if (!err) {
      //TODO: insert in db
      return res.status(201).json({
        success: true,
        payload: {
          data
        }
      });
    }
    else {
      return res.status(500).json({
        success: false,
        error: {
          message: err
        }
      });
    }
  });
}

function getTest(req, res) {
  //TODO: get specific tests details
  return res.status(200).json();
}

function deleteTest(req, res) {
  //TODO: delete specified tests
  return res.status(204).json();
}

module.exports = {
  getTests: getTests,
  createTest: createTest,
  getTest: getTest,
  deleteTest: deleteTest
};
