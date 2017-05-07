var assert = require('assert');
var cmd = require('node-cmd');
var request = require('supertest');
var sinon = require('sinon');

var app = require('../es5/app.js');
var db = require('../es5/db.js');

describe('GET /tests', function() {
  it('responds with 200 and json object', function(done) {
    var dbGetTestsStub = sinon.stub(db, 'getTests');
    dbGetTestsStub.yields(null, { rows: [] });

    request(app)
      .get('/tests')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        assert.deepEqual(res.body, { success: true, payload: [] });
        if (err) return done(err); //expects that fail don't throw
        done();
        db.getTests.restore();
      });
  });

  it('responds with expected payload', function(done) {
    var dbGetTestsStub = sinon.stub(db, 'getTests');
    var expectedRow = {
      id: 42,
      status: 'running',
      server: '10.0.0.1',
      port: 5001,
      type: 'tcp',
      transferred: null,
      throughput: null,
      jitter: null,
      datagrams: null,
      created: '2017-05-06T21:17:42.507Z',
      completed: null,
      error: null
    };
    dbGetTestsStub.yields(null, { rows: [expectedRow] });

    request(app)
      .get('/tests')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        assert.deepEqual(res.body, { success: true, payload: [ expectedRow ] });
        if (err) return done(err); //expects that fail don't throw
        done();
        db.getTests.restore();
      });
  });

  it('responds with a 500 and error payload on db error', function(done) {
    var dbGetTestsStub = sinon.stub(db, 'getTests');
    var errorText = 'some db error';
    dbGetTestsStub.yields(errorText, { rows: [] });

    request(app)
      .get('/tests')
      .expect('Content-Type', /json/)
      .expect(500)
      .end(function (err, res) {
        assert.deepEqual(res.body, { success: false, error: { message: errorText } });
        if (err) return done(err); //expects that fail don't throw
        done();
        db.getTests.restore();
      });
  });

});

describe('POST /tests', function() {
  it('responds with 200 and json object on valid reqeust', function(done) {
    var dbCreateTestStub = sinon.stub(db, 'createTest');

    dbCreateTestStub.yields(null, { rows: [ { id: 42 } ] });

    request(app)
      .post('/tests')
      .send({ type: 'tcp',
        server: '192.168.110.168',
        port: 5001
      })
      .expect('Content-Type', /json/)
      .expect(201)
      .end(function (err, res) {
        assert.deepEqual(res.body, { success: true, payload: { id: 42 } });
        if (err) return done(err); //expects that fail don't throw
        done();
        db.createTest.restore();
      });
  });

  it('responds with 400 and error on invalid request', function(done) {
    request(app)
      .post('/tests')
      .send({ type: 'babelfish',
        server: '999.999.999.999',
        port: 999999
      })
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (err, res) {
        assert.equal(true, res.body.success === false);
        assert.equal(true, res.body.error.message.indexOf('not in valid types') > -1);
        assert.equal(true, res.body.error.message.indexOf('is not a valid ipv4 or ipv6 address') > -1);
        assert.equal(true, res.body.error.message.indexOf('not in allowable range') > -1);
        if (err) return done(err); //expects that fail don't throw
        done();
      });
  });

  // test edge cases for allowable ports
  it('responds with 400 and error for invalid port numbers', function(done) {
    request(app)
      .post('/tests')
      .send({ type: 'udp',
        server: '10.0.0.1',
        port: 65536 // too high
      })
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (err, res) {
        assert.equal(true, res.body.success === false);
        assert.equal(true, res.body.error.message.indexOf('is not in allowable range') > -1);
        if (err) return done(err); //expects that fail don't throw
      });

    request(app)
      .post('/tests')
      .send({ type: 'udp',
        server: '10.0.0.1',
        port: -1 // too low
      })
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (err, res) {
        assert.equal(true, res.body.success === false);
        assert.equal(true, res.body.error.message.indexOf('is not in allowable range') > -1);
        if (err) return done(err); //expects that fail don't throw
      });

    done();
  });

  it('responds with a 500 and error payload on db error', function(done) {
    var dbCreateTestStub = sinon.stub(db, 'createTest');
    var errorText = 'some db error';
    dbCreateTestStub.yields(errorText, {});

    request(app)
      .post('/tests')
      .send({ type: 'tcp',
        server: '192.168.110.168',
        port: 5001
      })
      .expect('Content-Type', /json/)
      .expect(500)
      .end(function (err, res) {
        assert.deepEqual(res.body, { success: false, error: { message: errorText } });
        if (err) return done(err); //expects that fail don't throw
        done();
        db.createTest.restore();
      });
  });

  it('calls db to mark completed on success', function (done) {
    var dbCreateTestStub = sinon.stub(db, 'createTest');
    dbCreateTestStub.yields(null, { rows: [ { id: 42 } ] });

    var dbUpdateTestStub = sinon.stub(db, 'updateTest');

    var cmdOuput = `------------------------------------------------------------
      Client connecting to 192.168.110.168, TCP port 5001
      TCP window size:  129 KByte (default)
      ------------------------------------------------------------
      [  4] local 192.168.110.139 port 54980 connected with 192.168.110.168 port 5001
      [ ID] Interval       Transfer     Bandwidth
      [  4]  0.0-10.0 sec  88.0 MBytes  73.8 Mbits/sec`;
    var cmdStub = sinon.stub(cmd, 'get');
    cmdStub.callsArgWith(1, null, cmdOuput, null);

    request(app)
      .post('/tests')
      .send({ type: 'tcp',
        server: '192.168.110.168',
        port: 5001
      })
      .expect('Content-Type', /json/)
      .expect(201)
      .end(function (err, res) {
        assert.equal(true, cmdStub.called, 'cmd');
        assert.equal(true, dbUpdateTestStub.calledWith(42, "completed"), 'updateTest');
        if (err) return done(err); //expects that fail don't throw
        done();
        db.createTest.restore();
        db.updateTest.restore();
        cmd.get.restore();
      });
  });

  it('calls db to mark failed on failure', function (done) {
    var dbCreateTestStub = sinon.stub(db, 'createTest');
    dbCreateTestStub.yields(null, { rows: [ { id: 42 } ] });

    var dbUpdateTestStub = sinon.stub(db, 'updateTest');

    var cmdStub = sinon.stub(cmd, 'get');
    cmdStub.callsArgWith(1, "some error", null, null);

    request(app)
      .post('/tests')
      .send({ type: 'tcp',
        server: '192.168.110.168',
        port: 5001
      })
      .expect('Content-Type', /json/)
      .expect(201)
      .end(function (err, res) {
        assert.equal(true, cmdStub.called, 'cmd');
        assert.equal(true, dbUpdateTestStub.calledWith(42, "failed"), 'updateTest');
        if (err) return done(err); //expects that fail don't throw
        done();
        db.createTest.restore();
        db.updateTest.restore();
        cmd.get.restore();
      });
  });

  // TODO: add tests for cmd ouput parsing

});

describe('GET /tests/:id', function() {
  it('responds with 200 and json object on valid reqeust', function(done) {
    var dbGetTestStub = sinon.stub(db, 'getTest');

    var expectedRow = {
      id: 42,
      status: 'running',
      server: '10.0.0.1',
      port: 5001,
      type: 'tcp',
      transferred: null,
      throughput: null,
      jitter: null,
      datagrams: null,
      created: '2017-05-06T21:17:42.507Z',
      completed: null,
      error: null
    };
    dbGetTestStub.yields(null, { rows: [expectedRow] });

    request(app)
      .get('/tests/42')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        assert.deepEqual(res.body, { success: true, payload: expectedRow });
        if (err) return done(err); //expects that fail don't throw
        done();
        db.getTest.restore();
      });
  });

  it('responds with 404 on missing test', function(done) {
    var dbGetTestStub = sinon.stub(db, 'getTest');

    dbGetTestStub.yields(null, { rows: [] });

    request(app)
      .get('/tests/42')
      .expect(404)
      .end(function (err, res) {
        assert.deepEqual(res.body, {});
        if (err) return done(err); //expects that fail don't throw
        done();
        db.getTest.restore();
      });
  });

  it('responds with a 500 and error payload on db error', function(done) {
    var dbGetTestStub = sinon.stub(db, 'getTest');
    var errorText = 'some db error';
    dbGetTestStub.yields(errorText, { rows: [] });

    request(app)
      .get('/tests/42')
      .expect('Content-Type', /json/)
      .expect(500)
      .end(function (err, res) {
        assert.deepEqual(res.body, { success: false, error: { message: errorText } });
        if (err) return done(err); //expects that fail don't throw
        done();
        db.getTest.restore();
      });
  });

});

describe('DELETE /tests/:id', function() {
  it('responds with 204 valid reqeust', function(done) {
    var dbDeleteTestStub = sinon.stub(db, 'deleteTest');
    dbDeleteTestStub.yields(null, {});

    request(app)
      .delete('/tests/42')
      .expect(204)
      .end(function (err, res) {
        if (err) return done(err); //expects that fail don't throw
        done();
        db.deleteTest.restore();
      });
  });

  it('responds with a 500 and error payload on db error', function(done) {
    var dbDeleteTestStub = sinon.stub(db, 'deleteTest');
    var errorText = 'some db error';
    dbDeleteTestStub.yields(errorText, {});

    request(app)
      .delete('/tests/42')
      .expect(500)
      .end(function (err, res) {
        if (err) return done(err); //expects that fail don't throw
        done();
        db.deleteTest.restore();
      });
  });

});
