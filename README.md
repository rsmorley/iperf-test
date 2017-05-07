# This REST api performs Iperf tests against a remote server (server must be running the Iperf server)

### Requirements
Node 6.9.1+
Postgres 9.6.2+
iperf 2.0.5 installed and in your path

The nodejs code is located in ./app

### Initialize DB 
From the repo root, run:

``` 
psql db/iperf.sql
```

### Building the server
To install dependencies, run:

```
npm install
```

To transpile the es6 code, run:

```
npm run build
```

### Running the server
To run the server, run:

```
npm start
```

A single endpoint is accessible via:

```
http://localhost:8080/tests
```

To view the Swagger UI interface:

```
open http://localhost:8080/docs
```

### Running test

```
npm test
```
