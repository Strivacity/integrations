/**
 * Splunk integration example
 * 
 * This code is provided as a sample integration with Splunk. Customize to fit your needs.
 * 
 * @module integrations/splunk
 */

const logger = require("splunk-logging").Logger;

const SPLUNK_TOKEN = '[splunk token]'
const SPLUNK_URL = 'https://[splunk url]'

/** This function will be called from the Post-Account Login hook in a nonblocking manner.
 *
 * @param {Object}   args                                         Input arguments
 * @param {Object}   args.application                             Application related information
 * @param {string}   args.application.name                        Name
 * @param {string}   args.application.client_id                   OAuth client ID
 * @param {Object}   args.oidc_context                            Information about the originating OpenID Connect request
 * @param {string[]} args.oidc_context.acr_values                 ACR values
 * @param {string[]} args.oidc_context.ui_locales                 UI locales
 * @param {Object}   args.customer                                Customer related information
 * @param {string}   args.customer.ip_address                     HTTP client IP coming from the X-Forwarded-For header
 * @param {string[]} args.customer.store                          ID of store containing the customer
 * @param {string[]} args.customer.info                           map holding stored information about the user
 * @param {string}   args.customer.info.id                        ID of the customer
 * @param {Object[]} args.customer.groups                         List of groups the customer is the members of
 * @param {string}   args.customer.location.city                  City of the customer
 * @param {string}   args.customer.location.state                 State of the customer
 * @param {string}   args.customer.location.country               Country of the customer
 * @param {string}   args.customer.location.country_code          Country code of the customer
 * @param {string}   args.customer.location.coordinates.latitude  Latitude coordinate of the customer
 * @param {string}   args.customer.location.coordinates.longitude Longitude coordinate of the customer
 * @param {Object}   args.session                                 Session store
 */
module.exports = async function({ application, oidc_context, customer, session }) {
    // set up our config
    var config = {
        token: SPLUNK_TOKEN,
        url: SPLUNK_URL
    };

    // get a logger
    var log = new logger(config);

    // set up a payload with our data
    var payload = {
        message: {
            action: 'login',
            user: customer.info.userName,
            src_ip: customer.ip_address,
            application: application.name,
            location: {
                city: customer.location.city,
                state: customer.location.state,
                country: customer.location.country,
                country_code: customer.location.country_code,
                latitude: customer.location.coordinates.latitude,
                longitude: customer.location.coordinates.longitude
            }
        }
    }

    // send off the payload
    try {
        await send(log, payload)
    } catch (e) {
        console.log(e);
    }
};

/**
 * Send the payload
 * 
 * @param {Object}  logger    Splunk logger
 * @param {Object}  payload   Message payload
 */
async function send(logger, payload) {
    return await new Promise((resolve, reject) => {
        logger.send(payload, function(err, resp, body) {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        });
    });
}