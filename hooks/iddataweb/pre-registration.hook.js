/**
 * IDDataWeb Identity Verification integration example
 * 
 * This code is provided as a sample integration with IDDataWeb Identity Verification service. Customize 
 * it to fit your needs.
 * 
 * @module integrations/iddataweb
 */

const axios = require('axios')
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const url = require('url');

// iddw/strivacity config
const IDDW_CLIENT_ID = "[client_id]";
const IDDW_CLIENT_SECRET = "[client_secret]";
const IDDW_BASE_URL = "https://prod1.iddataweb.com/prod-axn/axn/oauth2";
const STRV_BASE_URL = "https://[domain].strivacity.com";

/** This function will be called from the Pre registration hook in a blocking manner.
 *
 * @param {Object}   args                                         Input arguments
 * @param {Object}   args.application                             Application related information
 * @param {string}   args.application.name                        Name
 * @param {string}   args.application.client_id                   OAuth client ID
 *
 * @param {Object}   args.oidc_context                            Information about the originating OpenID Connect request
 * @param {string[]} args.oidc_context.acr_values                 ACR values
 * @param {string[]} args.oidc_context.ui_locales                 UI locales
 *
 * @param {Object}   args.customer                                Customer related information
 * @param {string}   args.customer.ip_address                     HTTP client IP coming from the X-Forwarded-For header
 * @param {string}   args.customer.store                          Userstore
 * @param {Object}   args.customer.attributes                     User attributes provided during the registration
 * @param {Object}   args.customer.identifiers                    User identifiers provided during the registration
 * @param {Object[]} args.customer.consents                       User consents accepted during the registration
 * @param {string}   args.customer.location.city                  City of the customer
 * @param {string}   args.customer.location.state                 State of the customer
 * @param {string}   args.customer.location.country               Country of the customer
 * @param {string}   args.customer.location.country_code          Country code of the customer
 * @param {string}   args.customer.location.coordinates.latitude  Latitude coordinate of the customer
 * @param {string}   args.customer.location.coordinates.longitude Longitude coordinate of the customer
 *
 * @param {Object}   args.session                                 Session store
 * @param {Object}   args.continue_context                        Continue context
 *
 * @param {Object}   args.continue_request_parameters               Continue request parameters
 * @param {string}   args.continue_request_parameters.callback_url  Callback url to use after a continue call
 * @param {string}   args.continue_request_parameters.state         State parameter to use after a continue call
 * @param {preRegistrationCallback} callback
 * @param {denyRequestCallback} deny
 */
module.exports = async function({ application, oidc_context, customer, session, continue_context, continue_request_parameters }, callback, deny) {
    if (continue_context) {
        await handleContinue(customer, session, continue_context.code, callback, deny);
    } else {
        await handleRedirect(session, callback);
    }
};

/**
 * Handle a continued invocation of this hook
 * 
 * @param {*} customer    customer object
 * @param {*} session     session object
 * @param {*} code        OIDC authorization code
 * @param {*} callback    hook callback
 * @param {*} deny        deny callback
 */
async function handleContinue(customer, session, code, callback, deny) {
    // get the IDDW result
    let iddwResult;
    try {
        iddwResult = await getIDDWResult(code)
    } catch (e) {
        callback(new ShowErrorMessage("This account could not be verified.", session));
        return;
    }

    if (!iddwResult || iddwResult.policyDecision !== 'approve') {
        deny(new DenyRequest("Failed validation", ""));
        return;
    }

    callback(new RegistrationData(customer.attributes, [], session));
}

/**
 * Retrieve the IDDW results.
 * 
 * @param {string}  code    OIDC authorization code
 */
async function getIDDWResult(code) {
    // create basic auth header
    const token = Buffer.from(`${IDDW_CLIENT_ID}:${IDDW_CLIENT_SECRET}`).toString('base64');
    const requestHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${token}`
    };

    // set up form data for post
    const formData = new url.URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: STRV_BASE_URL + '/provider/continue'
    });

    // post the transaction
    const tokenResponse = await axios.post(
        IDDW_BASE_URL + '/token',
        formData.toString(), {
            requestHeaders
        }
    );
    if (tokenResponse.data.error) {
        throw new Error(tokenResponse.data.error_description || "Could not obtain token");
    }

    // get a jwks client to verify the response
    var client = jwksClient({
        jwksUri: IDDW_BASE_URL + '/jwks.json'
    });

    function getKey(header, callback) {
        client.getSigningKey(header.kid, function(err, key) {
            var signingKey = key.publicKey || key.rsaPublicKey;
            callback(null, signingKey);
        });
    }

    // verify and return the decoded result
    return await new Promise((resolve, reject) => {
        jwt.verify(tokenResponse.data.id_token, getKey, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
}

/**
 * Handle a redirect invocation of this hook
 * 
 * @param {*} session     session object
 * @param {*} callback    hook callback
 */
function handleRedirect(session, callback) {
    // this is not the callback from iddw, so initiate the authorization flow against them
    callback(new RedirectRequest(
        IDDW_BASE_URL + '/authorize' +
        `?client_id=${IDDW_CLIENT_ID}` +
        '&scope=openid+country.US' +
        '&response_type=code' +
        `&redirect_uri=${STRV_BASE_URL}/provider/continue`,
        session));
}

/** Allow registration
 *
 * @callback preRegistrationCallback
 * @param {RegistrationData|RedirectRequest|ShowErrorMessage} token
 */

/** Deny registration
 *
 * @callback denyRequestCallback
 * @param {DenyRequest} error
 */

/** RegistrationData */
class RegistrationData {
    attributes = {}
    additionalAuthenticators = []
    session = {}

    /**
     * @constructor
     * @param {Object} attributes
     * @param {AdditionalAuthenticator[]} additionalAuthenticators
     * @param {Object} session
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
     * @param {"email"|"phone"} type
     * @param {string} target
     */
    constructor(type, target) {
        this.type = type;
        this.target = target;
    }
}

/** RedirectRequest is a global object
 * @constructor
 * @param {string} redirect_url
 * @param {Object} session
 */

/** ShowErrorMessage is a global object
 * @constructor
 * @param {string} error_message
 * @param {Object} session
 */

/** DenyRequest is a global object
 * @constructor
 * @param {string} error
 * @param {string} description
 */