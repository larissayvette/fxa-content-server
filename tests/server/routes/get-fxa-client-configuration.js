/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  'intern',
  'intern!object',
  'intern/chai!assert',
  'intern/dojo/node!../../../server/lib/configuration',
  'intern/dojo/node!../../../server/lib/routes/get-fxa-client-configuration',
  'intern/dojo/node!request',
  'intern/dojo/node!sinon'
], function (intern, registerSuite, assert, config, getFxAClientConfig, request, sinon) {
  var serverUrl = intern.config.fxaContentRoot.replace(/\/$/, '');

  var suite = {
    name: 'fxa-client-configuration'
  };

  var mocks, route;

  suite['get-fxa-client-configuration route function'] = {

    beforeEach: function () {
      mocks = {
        config: {
          get: sinon.spy(function (name) {
            return mocks.config[name];
          })
        },
        request: null,
        response: {
          header: sinon.spy(),
          json: sinon.spy()
        }
      };
      /*eslint-disable camelcase*/
      mocks.config.fxaccount_url = 'https://accounts.firefox.com';
      mocks.config.oauth_url = 'https://oauth.accounts.firefox.com';
      mocks.config.profile_url = 'https://profile.accounts.firefox.com';
      mocks.config.sync_tokenserver_url = 'https://token.services.mozilla.org';
      /*eslint-enable camelcase*/
    },

    'module interface is correct': function () {
      assert.isFunction(getFxAClientConfig);
      assert.lengthOf(getFxAClientConfig, 1);
    },

    'route interface is correct': function () {
      route = getFxAClientConfig(mocks.config);
      assert.equal(mocks.config.get.callCount, 5);
      assert.isObject(route);
      assert.lengthOf(Object.keys(route), 3);
      assert.equal(route.method, 'get');
      assert.equal(route.path, '/.well-known/fxa-client-configuration');
      assert.isFunction(route.process);
      assert.lengthOf(route.process, 2);
    },

    'route.process strips trailing slashes from URLs in config': function () {
      /*eslint-disable camelcase*/
      mocks.config.fxaccount_url += '//';
      mocks.config.oauth_url += '/path/component/';
      mocks.config.profile_url += '/path/component';
      /*eslint-enable camelcase*/

      route = getFxAClientConfig(mocks.config);
      route.process(mocks.request, mocks.response);

      assert.equal(mocks.config.get.callCount, 5);
      assert.equal(mocks.response.json.callCount, 1);
      var args = mocks.response.json.args[0];
      assert.lengthOf(args, 1);
      var resp = args[0];
      assert.equal(resp.auth_server_base_url, 'https://accounts.firefox.com');
      assert.equal(resp.oauth_server_base_url, 'https://oauth.accounts.firefox.com/path/component');
      assert.equal(resp.profile_server_base_url, 'https://profile.accounts.firefox.com/path/component');
    },

    'route.process sets cache-control header from config': function () {
      mocks.config['fxa_client_configuration.max_age'] = 12345;

      route = getFxAClientConfig(mocks.config);
      route.process(mocks.request, mocks.response);

      assert.equal(mocks.config.get.callCount, 5);
      assert.equal(mocks.response.json.callCount, 1);
      assert.equal(mocks.response.header.callCount, 1);
      var args = mocks.response.header.args[0];
      assert.lengthOf(args, 2);
      assert.equal(args[0], 'Cache-Control');
      assert.equal(args[1], 'public, max-age=12');
    },

    'route.process defaults cache-control header to one day': function () {
      mocks.config['fxa_client_configuration.max_age'] = null;

      route = getFxAClientConfig(mocks.config);
      route.process(mocks.request, mocks.response);

      assert.equal(mocks.config.get.callCount, 5);
      assert.equal(mocks.response.json.callCount, 1);
      assert.equal(mocks.response.header.callCount, 1);
      var args = mocks.response.header.args[0];
      assert.lengthOf(args, 2);
      assert.equal(args[0], 'Cache-Control');
      assert.equal(args[1], 'public, max-age=86400');
    },

    'route.process omits cache-control header when max_age is zero': function () {
      mocks.config['fxa_client_configuration.max_age'] = 0;

      route = getFxAClientConfig(mocks.config);
      route.process(mocks.request, mocks.response);

      assert.equal(mocks.config.get.callCount, 5);
      assert.equal(mocks.response.json.callCount, 1);
      assert.equal(mocks.response.header.callCount, 0);
    }
  };

  suite['#get /.well-known/fxa-client-configuration - returns a JSON doc with expected values'] = function () {
    var dfd = this.async(intern.config.asyncTimeout);

    request(serverUrl + '/.well-known/fxa-client-configuration', {},
    dfd.callback(function (err, res) {
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');

      var maxAge = config.get('fxa_client_configuration.max_age') / 1000;
      assert.equal(res.headers['cache-control'], 'public, max-age=' + maxAge);

      var result = JSON.parse(res.body);
      assert.equal(Object.keys(result).length, 4);

      var conf = intern.config;
      var expectAuthRoot = conf.fxaAuthRoot;
      if (conf.fxaDevBox || ! conf.fxaProduction) {
        expectAuthRoot = expectAuthRoot.replace(/\/v1$/, '');
      }

      assert.equal(result.auth_server_base_url, expectAuthRoot);
      assert.equal(result.oauth_server_base_url, conf.fxaOAuthRoot);
      assert.equal(result.profile_server_base_url, conf.fxaProfileRoot);
      assert.equal(result.sync_tokenserver_base_url, conf.fxaTokenRoot);
    }, dfd.reject.bind(dfd)));
  };

  registerSuite(suite);
});
