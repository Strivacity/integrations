/**
 * Hubspot integration example
 * 
 * This code is provided as a sample integration with Hubspot. Customize to fit your needs.
 * 
 * @module integrations/hubspot
 */

const hubspot = require('@hubspot/api-client');

const HUBSPOT_API_KEY = '[api_key]'

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
module.exports = async function({ application, oidc_context, customer, session, continue_context, continue_request_parameters }, callback, error) {
    // get a hubspot client
    const client = new hubspot.Client({ apiKey: HUBSPOT_API_KEY });

    // query parameters
    const query = customer.attributes.emails.primaryEmail
    const properties = ['email']
    const limit = 100
    const after = 0

    // generate a request object
    const request = {
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: customer.attributes.emails.primaryEmail }] }],
        sorts: [JSON.stringify({ propertyName: 'createdate', direction: 'DESCENDING' })],
        query,
        properties,
        limit,
        after,
    }

    // send off the query
    const search = await client.crm.contacts.searchApi.doSearch(request)
    if (!search || search.results.length <= 0) {
        callback(new ShowErrorMessage("This account could not be verified.", session));
        return
    }

    callback(new RegistrationData(customer.attributes, [], session));
};

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