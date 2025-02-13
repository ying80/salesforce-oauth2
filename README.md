# salesforce-oauth2 -- Salesforce OAuth2 Web Server Authentication Flow

## Abstract

A very lightweight implementation of the [OAuth2 Web Server Authentication Flow for Salesforce](http://wiki.developerforce.com/page/Digging_Deeper_into_OAuth_2.0_on_Force.com) for Node.js.

As Salesforce already provides a very robust REST API, the aim of this module is to provide a very thin wrapper for the authentication functionality only.

## Install

    npm install salesforce-oauth2

## Usage

An example using the express web framework:

```javascript
const express = require("express"),
  oauth2 = require("salesforce-oauth2");

const callbackUrl = "https://localhost:3000/oauth/callback", // must match your sf connected app setting
  consumerKey = "<your consumer key>",
  consumerSecret = "<your consumer secret>",
  baseUrl = "https://login.salesforce.com"; // or sandbox server, etc

const app = express.createServer(express.logger());

const ERROR_STATUS_CODE = 500;

app.get("/", function (req, res) {
  const uri = oauth2.getAuthorizationUrl({
    base_url: baseUrl,
    redirect_uri: callbackUrl,
    client_id: consumerKey,
  });
  res.redirect(uri);
});

app.get("/oauth/callback", async (req, res) => {
  const authCode = req.param("code"); // or maybe decodeURI(req.query.code)
  try {
    const payload = await oauth2.authenticate({
      base_url: baseUrl,
      redirect_uri: callbackUrl, // must set it
      client_id: consumerKey,
      client_secret: consumerSecret,
      code: authCode,
    });

    res.json(payload);
    /*

		The payload should contain the following fields:

		id 				A URL, representing the authenticated user,
						which can be used to access the Identity Service.

		issued_at		The time of token issue, represented as the
						number of seconds since the Unix epoch
						(00:00:00 UTC on 1 January 1970).

		refresh_token	A long-lived token that may be used to obtain
						a fresh access token on expiry of the access
						token in this response.

		instance_url	Identifies the Salesforce instance to which API
						calls should be sent.

		access_token	The short-lived access token.


		The signature field will be verified automatically and can be ignored.

		At this point, the client application can use the access token to authorize requests
		against the resource server (the Force.com instance specified by the instance URL)
		via the REST APIs, providing the access token as an HTTP header in
		each request:

		Authorization: OAuth 00D50000000IZ3Z!AQ0AQDpEDKYsn7ioKug2aSmgCjgrPjG...
		*/
  } catch (err) {
    logger.error("Error calling salesforce api: ", err);
    res.status(ERROR_STATUS_CODE);
    res.json({ ERROR: err });
  }
});

app.listen(3000, function () {
  console.log("Listening on 3000");
});
```

## Getting refresh_token

To get a new access_token using refresh_token.
Example:

```javascript
app.get("/oauth/refresh", async (req, res) => {
  try {
    const payload = await oauth2.refresh({
      base_url: baseUrl,
      client_id: consumerKey,
      client_secret: consumerSecret,
      refresh_token: req.query.refresh_token,
    });

    res.json({ payload });
  } catch (err) {
    logger.error("Error calling salesforce api: ", err);
    res.status(ERROR_STATUS_CODE);
    res.json({ ERROR: err });
  }
});
```

## Check if access_token/refresh_token are still valid

To check if access_token or refresh_token are still valid
Example:

```javascript
app.get("/oauth/isAccessTokenValid", async (req, res) => {
  try {
    const payload = await oauth2.isAccessTokenValid({
      base_url: baseUrl,
      client_id: consumerKey,
      client_secret: consumerSecret,
      token: req.query.token,
    });

    res.json(payload);
  } catch (err) {
    logger.error("Error calling salesforce api: ", err);
    res.status(ERROR_STATUS_CODE);
    res.json({ ERROR: err });
  }
});

app.get("/oauth/isRefreshTokenValid", async (req, res) => {
  try {
    const payload = await oauth2.isRefreshTokenValid({
      base_url: baseUrl,
      client_id: consumerKey,
      client_secret: consumerSecret,
      token: req.query.token,
    });

    res.json(payload);
  } catch (err) {
    logger.error("Error calling salesforce api: ", err);
    res.status(ERROR_STATUS_CODE);
    res.json({ ERROR: err });
  }
});
```

## Util links to setup your connected app salesforce

- [Create Connected App](https://help.salesforce.com/articleView?id=connected_app_create.htm&type=5)
