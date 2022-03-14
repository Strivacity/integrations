/**
 * ServiceNow integration example
 * 
 * This code is provided as a sample integration with ServiceNow. Customize to fit your needs.
 * 
 * @module integrations/servicenow
 */

const axios = require("axios");
const qs = require('qs')

const SNOW_BASE_URL = "[instance]"
const SNOW_CLIENT_ID = "[client_id]"
const SNOW_CLIENT_SECRET = "[client_secret]"
const SNOW_USERNAME = '[username]'
const SNOW_PASSWORD = '[password]'

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
    // get an access token from the SNOW token endpoint
    const token = await axios.post(`${SNOW_BASE_URL}oauth_token.do`,
        qs.stringify({
            "grant_type": 'password',
            "client_id": `${SNOW_CLIENT_ID}`,
            "client_secret": `${SNOW_CLIENT_SECRET}`,
            "username": `${SNOW_USERNAME}`,
            "password": `${SNOW_PASSWORD}`,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }
    )

    // get the contacts, filtered to the email address
    const contacts = await axios.get(
        `${SNOW_BASE_URL}api/now/contact?sysparm_query=email=${customer.attributes.emails.primaryEmail}`, {
            headers: {
                'Authorization': `Bearer ${token.data.access_token}`
            }
        }
    )

    // check if we got a response based on the email we sent
    if (!contacts || contacts.data.result.length <= 0) {
        callback(new ShowErrorMessage("This account could not be verified.", session));
        return
    }

    callback(new RegistrationData(customer.attributes, [], session));
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