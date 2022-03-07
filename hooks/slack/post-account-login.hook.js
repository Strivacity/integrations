/**
 * Slack integration example
 * 
 * This code is provided as a sample integration with Slack. Customize to fit your needs.
 * 
 * @module integrations/slack
 */

const slackr = require('node-slackr');
const dns = require('dns').promises

const SLACK_WEBHOOK = 'https://[slack webhook]'
const SLACK_CHANNEL = '#channel'

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
    // get ip and reverse dns
    let ip_address = customer.ip_address
    const domain = await reverse(ip_address)
    if (domain) {
        ip_address += (" (" + domain + ")")
    }

    // set up slack notifier
    let hook = new slackr(SLACK_WEBHOOK);
    let messages = {
        text: "User completed login",
        channel: SLACK_CHANNEL,
        attachments: [{
            fields: [{
                    title: 'Application Name',
                    value: application.name,
                    short: true
                },
                {
                    title: 'User ID',
                    value: customer.info.userName,
                    short: true
                },
                {
                    title: 'IP',
                    value: ip_address,
                    short: true
                },
            ]
        }]
    }

    // send off the notification
    hook.notify(messages, function(err, result) {
        if (err) {
            console.log(err);
        }
    });
};

/**
 * Reverse lookup the DNS record for the given IP.
 */
async function reverse(ip) {
    let domain;
    try {
        domain = await dns.reverse(ip)
    } catch (e) {
        console.log(`failed to look up dns (${e})`)
    }
    return domain
}
