/**
 * Deduce integration example
 * 
 * This code is provided as a sample integration with Deduce. Customize to fit your needs.
 * 
 * @module integrations/deduce
 */

const request = require('request-promise-native')

// deduce config
const DEDUCE_SITE = "[site]"
const DEDUCE_API_KEY = "[api-key]"

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
    const result = await assessRisk(customer);

    // allow the user to register if they are trusted, otherwise deny
    if (result == 'TRUSTED') {
        callback(new RegistrationData(customer.attributes, [], session));
    } else {
        deny(new DenyRequest("1", "User session is not trusted."));
    }
};

/**
 *  Assess the risk of the given customer.
 */
async function assessRisk(customer) {
    // define request options
    var options = {
        'method': 'POST',
        'url': 'https://api.deducesecurity.com/insights',
        'headers': {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "site": DEDUCE_SITE,
            "apikey": DEDUCE_API_KEY,
            "ip": customer.ip_address,
            "email": customer.identifiers.email,
            "action": "auth.success.sso.mfaEnabled",
            "test": "true"
        })
    };

    // send off the request
    let response = await request(options)
    let objResponse = JSON.parse(response)
    return objResponse.data.score
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