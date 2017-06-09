#!/usr/bin/env node

'use strict';

const Path = require('path');
const _ = require('lodash');

var neo4j = require('neo4j-driver').v1;

var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic(process.env.NEO4J_UID, process.env.NEO4J_PWD));

driver.onCompleted = function() {
  console.log('Successfully connected to Neo4J');
};

driver.onError = function(error) {
  console.log('Neo4J Driver instantiation failed', error);
};

var session = driver.session();


require('seneca')()
  .use('seneca-amqp-transport')
  .add('cmd:addNode,cuid:*,nodeType:*,nodeTitle:*,linkOut:*,linkType:*,linkProps:*', function(message, done) {
    var queryString = "MERGE (" + message.cuid + ":" + message.nodeType + " { cuid:'" + message.cuid + "', title:'" + message.nodeTitle + "' })\n";
    queryString += "WITH 1 as dummy\n";
    var linkProps = "";
    var count = 0;
    _.forOwn(message.linkProps, function(value, key) {
      linkProps += (count > 0) ? ", " + key + ":'" + value + "'" : key + ":'" + value + "'";
      count++;
    });
    // queryString += `MATCH (a { cuid: '${message.cuid}' }), (b { cuid: '" + message.linkOut + "'}) MERGE (a)-[:" + message.linkType + " { " + linkProps + " }]->(b)\n`;
    queryString += "MATCH (a { cuid: '" + message.cuid + "' }), (b { cuid: '" + message.linkOut + "'}) MERGE (a)-[:" + message.linkType + " { " + linkProps + " }]->(b)\n";
    console.log(queryString);
    session
      .run(queryString)
      .then(function(result) {
        session.close();
        var status = "Successfully added Node " + message.cuid;
        return done(null, {
          status
        });
      })
      .catch(function(error) {
        console.log(error);
      });
  })
  .listen({
    type: 'amqp',
    pin: 'cmd:addNode,cuid:*,nodeType:*,nodeTitle:*,linkOut:*,linkType:*,linkProps:*',
    url: process.env.AMQP_URL
  });
