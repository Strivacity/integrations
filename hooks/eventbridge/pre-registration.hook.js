/**
 * Eventbridge integration example
 * 
 * This code is provided as a sample integration with Eventbridge. Customize to fit your needs.
 * 
 * @module integrations/eventbridge
 */

const aws = require('aws-sdk');

const AWS_REGION = '[region]'
const AWS_KEY_ID = '[key_id]'
const AWS_SECRET_KEY = '[secret key]'

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
    // get an eventbridge client
    const eventBridge = new aws.EventBridge({
        region: AWS_REGION,
        accessKeyId: AWS_KEY_ID,
        secretAccessKey: AWS_SECRET_KEY,
    });

    // build up our event 
    const detail = {
        "E-mail": customer.attributes.emails.primaryEmail,
        "Application": application.name,
        "Location": {
            "City": customer.location.city,
            "State": customer.location.state,
            "Country": customer.location.country,
            "Country Code": customer.location.country_code,
            "Latitude": customer.location.coordinates.latitude,
            "Longitude": customer.location.coordinates.longitude
        }
    }

    // queue it up and send
    const client = eventBridge.putEvents({
        Entries: [{
            EventBusName: 'default',
            Source: 'strivacity',
            DetailType: 'CustomerRegistration',
            Detail: JSON.stringify(detail),
        }, ]
    })
    try {
        client.send()
    } catch (e) {
        console.log(e)
    }
};