DROP DATABASE IF EXISTS iperftests;
CREATE DATABASE iperftests;

\c iperftests;

CREATE TYPE test_status as ENUM (
    'completed',
    'failed',
    'running'
);

CREATE TYPE test_type as ENUM (
    'tcp',
    'udp'
);

CREATE TABLE tests (
      ID SERIAL PRIMARY KEY,
      status test_status NOT NULL,
      server VARCHAR NOT NULL,
      port INTEGER,
      type test_type,
      transferred VARCHAR,
      throughput VARCHAR,
      jitter VARCHAR,
      datagrams VARCHAR,
      created timestamp default CURRENT_TIMESTAMP,
      completed timestamp,
      error VARCHAR
);

INSERT INTO tests (status, server, port, type)
  VALUES ('running', '10.0.1.1', 54321, 'udp');
