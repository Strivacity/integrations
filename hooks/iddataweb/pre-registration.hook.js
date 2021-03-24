/**
 * IDDataWeb Identity Verification integration example
 * 
 * This code is provided as a sample integration with IDDataWeb Identity Verification service. Customize 
 * it to fit your needs.
 * 
 * @module integrations/iddataweb
 */

const IDDW_CLIENT_ID = "";
const IDDW_CLIENT_SECRET = "";
const IDDW_URL = "https://prod1.iddataweb.com/prod-axn/axn/oauth2";
const STRV_URL = "https://<domain>.strivacity.com";

const axiosClient = require('axios');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const phone = require('libphonenumber-js');
const url = require('url');

/** This function will be called from the pre-registration hook in a blocking manner.
 *
 * @param {Object}   args                              Input arguments
 * @param {Object}   args.application                  Application related information
 * @param {string}   args.application.name             Application name
 * @param {string}   args.application.client_id        Application OAUTH Client ID
 * @param {Object}   args.oidc_context                 Information about the originating OpenID Connect request
 * @param {string[]} args.oidc_context.acr_values      OIDC ACR values
 * @param {string[]} args.oidc_context.ui_locales      OIDC UI locales
 * @param {Object}   args.customer                     Customer related information
 * @param {string}   args.customer.ip_address          HTTP client IP coming from the X-Forwarded-For header
 * @param {string}   args.customer.store               ID of store containing the customer
 * @param {Object}   args.customer.attributes          Map containing base attributes for the user
 * @param {Object}   args.customer.identifiers         Map containing primary identifiers for the user
 * @param {Object}   args.customer.consents            Map containing consents for the user
 * @param {Object}   args.session                      Object that represents the users session
 * @param {Object}   args.continueContext              Object that contains params passed via /continue
 * @param {preRegistrationCallback} callback           Callback used to return attributes or redirection data
 * @param {denyRequestCallback} error                  Callback used to deny the registration request
 */
module.exports = async function ({ application, oidc_context, customer, session, continueContext }, callback, error) {
  if (continueContext) {

    let codeToken = continueContext.code;
    let idDataWebResult;

    // handle result from iddataweb, exchange the authorization code for id_token
    try {
        // prepare credentials for authorization header.
        const tokenEndpointAuth = Buffer.from(`${IDDW_CLIENT_ID}:${IDDW_CLIENT_SECRET}`).toString('base64');
        const requestHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${tokenEndpointAuth}`
        };

        // prepare form data for submit to token api
        const requestFormData = new url.URLSearchParams({
            grant_type: 'authorization_code',
            code: codeToken,
            redirect_uri: `${STRV_URL}/login/api/v1/continue`
        });

        // send the post
        const tokenEndpointResponse = await axiosClient.post(
            ID_DATAWEB_BASE_URL + '/token',
            requestFormData.toString(),
            {requestHeaders}
        );
        if (tokenEndpointResponse.data.error) {
            error(new ErrorDenyRequest(tokenEndpointResponse.data.error_description || "Failed validation", "hint"));
            return;
        }

        // prepare a jwks client to get get results
        var client = jwksClient({
            jwksUri: IDDW_URL + '/jwks.json'
        });

        // define a callback for getting the jwks key
        function getKey(header, callback){
            client.getSigningKey(header.kid, function(err, key) {
                var signingKey = key.publicKey || key.rsaPublicKey;
                callback(null, signingKey);
            });
        }
        // verify and decode id_token
        idDataWebResult = await new Promise((resolve, reject) => {
            jwt.verify(tokenEndpointResponse.data.id_token, getKey, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });
    } catch (error) {
        console.log('failed to fetch and validate id dataweb verification result', error);
        error(new ErrorDenyRequest("Failed validation", "hint"));
        return;
    }

    // check policy decision from iddataweb, if user was not approved, notify
    if (idDataWebResult.policyDecision !== 'approve') {
        error(new ErrorDenyRequest("Failed validation", "hint"));
        return;
    }

    // parse id_token results
    try {
        // flatten out all the user attributes
        var user_dict = {}; 
        for (var i in idDataWebResult.endpoint.endpointInstanceList) {
            const user_attrs = idDataWebResult.endpoint.endpointInstanceList[i].userAttributes;
            if (user_attrs !== undefined) {
                for (var j in user_attrs) {
                    const values = user_attrs[j].values;
                    for (var key in values) {
                        user_dict[key] = values[key];
                    }
                }
            }
        }

        // convert phone to intl format
        const num = phone.parsePhoneNumber(user_dict['telephone'], user_dict['country']);
        
        // map id_token fields to attribute fields to pass back to data store
        const updatedAttributes = {
            ...customer.attributes,
            name: {
                givenName: user_dict['fname'],
                middleName: user_dict['mname'],
                familyName: user_dict['lname'],
            },
            emails: {
                primaryEmail: customer.identifiers.email,
            },
            phoneNumbers: {
                primaryPhoneNumber: num.number,
            },
            addresses: {
                primary: {
                    city: user_dict['locality'],
                    postalCode: user_dict['postal_code'],
                    region: user_dict['administrative_area_level_1'],
                    streetAddress: user_dict['street_number'] + ' ' + user_dict['route'],
                },
            },
            country: user_dict['country'],
        }

        // the following code will save the attribute data, as well as create a verified authenticator 
        // using the id_token phone number, as it is verified from iddw
        callback(
            new AdditionalRegistrationData(updatedAttributes,
            [
                new AdditionalAuthenticator("PHONE", updatedAttributes.phoneNumbers.primaryPhoneNumber),
            ],
            session
        ));
    } catch(error) {
        console.log('failed to parse id dataweb verification result', error);
        error(new ErrorDenyRequest("Failed to register account", "hint"));
        return;
    }

    return;
  } else {
    // this is not the callback from iddw, so initiate the authorization flow against them
    callback(new RedirectRequestData(
        ID_DATAWEB_BASE_URL + '/authorize' +
        `?client_id=${ID_DATAWEB_CLIENT_ID}` +
        '&scope=openid+country.US' +
        '&response_type=code' +
        `&redirect_uri=${STRV_URL}/login/api/v1/continue`,
         session)
    );

    return;
  }
};

/** Allow ID Token generation
 *
 * @callback preRegistrationCallback
 * @param {AdditionalRegistrationData|RedirectRequestData} data
 */

/** Deny ID Token generation
 *
 * @callback denyRequestCallback
 * @param {ErrorDenyRequest} error
 */

/** AdditionalRegistrationData */
class AdditionalRegistrationData {
  attributes = {}
  additionalAuthenticators = []
  session = {}

  /**
   * @constructor
   * @param {Object} attributes Attributes to add
   * @param {AdditionalAuthenticator[]} additionalAuthenticators Additional authenticators to add
   * @param {Object} session Session associated with this hook
   */
  constructor(attributes, additionalAuthenticators, session) {
    this.attributes = attributes;
    this.additionalAuthenticators = additionalAuthenticators;
    this.session = session;
  }
}

/** AdditionalAuthenticator */
class AdditionalAuthenticator {
  type = null;
  target = null;

  /**
   * @constructor
   * @param {"EMAIL"|"PHONE"} type Type of authenticator to add
   * @param {string} target        Authenticator data
   */
  constructor(type, target) {
    this.type = type;
    this.target = target;
  }
}

/** RedirectRequestData */
class RedirectRequestData {
  redirectUrl = null
  session = {}

  /**
   * @constructor
   * @param {string} redirectUrl The redirect URL you wish to redirect to. 
   * @param {Object} session     The session associated with this hook invocation.
   */
  constructor(redirectUrl, session) {
    this.redirectUrl = redirectUrl;
    this.session = session;
  }
}

/** ErrorDenyRequest is a global object
 * @constructor
 * @param {string} description Description of the error
 * @param {string} hint        Extra hint provided with the error
 */
