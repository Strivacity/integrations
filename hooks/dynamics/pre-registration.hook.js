/**
 * MS Dynamics 365 integration example
 * 
 * This code is provided as a sample integration with MS Dynamics 365. Customize it to fit your needs.
 * 
 * @module integrations/dynamics
 */

var dynamics = require('dynamics-web-api');
var AuthenticationContext = require('adal-node').AuthenticationContext;

// dynamics config
var DYNAMICS_AUTHORITY_URL = 'https://login.microsoftonline.com/[tenant]/oauth2/token';
var DYNAMICS_RESOURCE = 'https://[domain].crm.dynamics.com/';
var DYNAMICS_CLIENT_ID = '[client_id]';
var DYNAMICS_CLIENT_SECRET = '[client_secret]'

// get an adal context for use in auth
var adalContext = new AuthenticationContext(DYNAMICS_AUTHORITY_URL);

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
 * @param {denyRequestCallback} error
 */
module.exports = async function({ application, oidc_context, customer, session, continue_context, continue_request_parameters }, callback, error) {
    // get a connection to dynamics
    var client = new dynamics({
        webApiUrl: DYNAMICS_RESOURCE + 'api/data/v9.1/',
        onTokenRefresh: acquireToken
    });

    // get contact based on email address
    var records = await client.retrieveMultiple("contacts", ["fullname"], `emailaddress1 eq '${customer.attributes.emails.primaryEmail}'`)
    console.log(records)

    // the following function call does not modify the registering user
    callback(new RegistrationData(customer.attributes, [], session));
};

/**
 * Callback for acquiring a token via ADAL
 */
function acquireToken(callback) {
    function adalcb(error, token) {
        if (!error) {
            callback(token);
        } else {
            throw new Error(error)
        }
    }

    // get the token
    adalContext.acquireTokenWithClientCredentials(DYNAMICS_RESOURCE, DYNAMICS_CLIENT_ID, DYNAMICS_CLIENT_SECRET, adalcb);
}

/** Allow registration
 *
 * @callback preRegistrationCallback
 * @param {RegistrationData|RedirectRequest|ShowErrorMessage} token
 */

/** Deny registration
 *
 * @callback denyRequestCallback
 * @param {ErrorDenyRequest} error
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

/** ErrorDenyRequest is a global object
 * @constructor
 * @param {string} description
 * @param {string} hint
 */