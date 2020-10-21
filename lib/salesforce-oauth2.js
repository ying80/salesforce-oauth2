/**
 *  Salesforce OAuth2 Web Server Authentication Flow.
 *  See Also: http://wiki.developerforce.com/page/Digging_Deeper_into_OAuth_2.0_on_Force.com
 */

const https = require('https');
const crypto = require('crypto');
const qs = require('querystring');

const authorizeEndpoint = '/services/oauth2/authorize';
const tokenEndpoint = '/services/oauth2/token';
const introspectEndpoint = '/services/oauth2/introspect';

/**
 *  Helper to call Salesforce server
 */
function oauth2(options) {
  const hostname = new URL(options.base_url).host;
  const opEndpoint = options.op_endpoint;
  delete options.base_url;
  delete options.op_endpoint;
  const path = opEndpoint + '?' + qs.stringify(options);

  return new Promise((resolve, reject) => {
    try {
      const reqOptions = {
        method: 'POST',
        hostname,
        path
      };

      reqOptions.agent = new https.Agent(reqOptions);
      const req = https.request(reqOptions, (resp) => {
        const body = [];

        resp.setEncoding('utf8');
        resp.on('data', (chunk) => {
          body.push(chunk);
        });
        resp.on('end', () => {
          const payload = JSON.parse(body);

          if ('error' in payload) {
            reject(new Error(JSON.stringify(payload)));
          } else if (
            'id' in payload &&
            'issued_at' in payload &&
            !verifySignature(payload, options.client_secret)
          ) {
            reject(new Error('Signature could not be verified.'));
          }

          return resolve(payload);
        });
      });

      req.on('error', (e) => {
        reject(e);
      });
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 *  Get the URL to redirect to get the user approval.
 *  @options should contain:
 *    base_url: url to a sf community or sandbox
 *    client_id: the app's consumer key.
 *    redirect_uri: the app's callback URL
 *    scope: A space separated list of scope values. sample: api chatter
 *    base_url: (optional) url to a sf community or sandbox
 *
 *    For a full list of parameters see http://wiki.developerforce.com/page/Digging_Deeper_into_OAuth_2.0_on_Force.com
 */
function getAuthorizationUrl(options) {
  const baseUrl = options.base_url;
  delete options.base_url;
  options = {
    ...{ response_type: 'code' },
    ...options
  };
  return baseUrl + authorizeEndpoint + '?' + qs.stringify(options);
}

/**
 *  Send the authentication code to the server and get the access token.
 *  @options should contain the following:
 *      base_url: url to a sf community or sandbox
 *      client_id: the app's consumer key
 *      redirect_uri: the app's callback URL
 *      code: authorization code
 *      client_secret: the app's consumer secret
 */
function authenticate(options) {
  options = {
    ...{
      op_endpoint: tokenEndpoint,
      grant_type: 'authorization_code'
    },
    ...options
  };
  return oauth2(options);
}

/**
 *  Send the username and password to the server and get the access token.
 *  @options should contain the following:
 *      base_url: url to a sf community or sandbox
 *      client_id: the app's consumer key
 *      client_secret: the app's consumer secret
 *      username: The API user's Salesforce.com username, of the form user@example.com
 *      password: The API user's Salesforce.com password. If the client's IP address has not
 *                been whitelisted in your org, you must concatenate the security token with
 *                the password.
 */
function password(options) {
    options = {
        ...{
            op_endpoint: tokenEndpoint,
            grant_type: 'password'
        }
    }, options);
    return oauth2(options);
}

/**
 *  Send the refresh token in order to renew the access token
 *  @options should contain the following:
 *      base_url: url to a sf community or sandbox
 *      client_id: the app's consumer key
 *      client_secret: the app's consumer secret
 *      refresh_token: the refresh token
 */
function refresh(options) {
  options = {
    ...{
      op_endpoint: tokenEndpoint,
      grant_type: 'refresh_token'
    },
    ...options
  };
  return oauth2(options);
}

/**
 *  Check if access token in valid
 *  @options should contain the following:
 *      base_url: url to a sf community or sandbox
 *      client_id: the app's consumer key
 *      client_secret: the app's consumer secret
 *      token: the access token
 */
function isAccessTokenValid(options) {
  options = {
    ...{
      op_endpoint: introspectEndpoint,
      token_type_hint: 'access_token'
    },
    ...options
  };
  return oauth2(options);
}

/**
 *  Check if refresh token in valid
 *  @options should contain the following:
 *      base_url: url to a sf community or sandbox
 *      client_id: the app's consumer key
 *      client_secret: the app's consumer secret
 *      token: the refresh token
 */function isRefreshTokenValid(options) {
  options = {
    ...{
      op_endpoint: introspectEndpoint,
      token_type_hint: 'refresh_token'
    },
    ...options
  };
  return oauth2(options);
}

function verifySignature(payload, consumerSecret) {
  var hmac = crypto.createHmac('sha256', consumerSecret);
  hmac.update(payload.id);
  hmac.update(payload.issued_at);

  return hmac.digest('base64') === payload.signature;
}

module.exports = {
  getAuthorizationUrl,
  authenticate,
  password,
  refresh,
  isAccessTokenValid,
  isRefreshTokenValid
};
