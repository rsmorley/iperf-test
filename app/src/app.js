import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import routes from './routes/index.js';
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../api/swagger.json');

let app = express();

app.use(cors({
  'allowedHeaders': ['Accept', 'Content-Type'],
  'methods': ['GET', 'POST', 'DELETE'],
  'origin': true
}));

app.use(bodyParser.json({
  limit: '1mb'
}));

// API resources using defined routes
app.use('/', routes);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// error handlers

// catch 404 and forward to error handler
app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler that will print stacktrace
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      message: err.message,
      error: err
    });
  });
}

// production error handler with no stacktraces leaked to user
app.use((err, req, res, next) => {
  res.status(err.status || 500).json('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
