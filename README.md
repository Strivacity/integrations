# Strivacity Integrations 

[![build](https://github.com/Strivacity/integrations/actions/workflows/main.yml/badge.svg)](https://github.com/Strivacity/integrations/actions/workflows/main.yml)

This repository contains a set of integration examples compatible with the Strivacity platform.

## Table of Contents
- [Strivacity Integrations](#strivacity-integrations)
  - [Table of Contents](#table-of-contents)
  - [Lifecycle Event Hooks™](#lifecycle-event-hooks)
  - [Integrations](#integrations)
  - [License](#license)

## Lifecycle Event Hooks™

Strivacity Lifecycle Event Hooks™ is a serverless approach that makes it easy to integrate with other systems and orchestrate your own business logic without the cost and frustration of building (or hosting) other services.

- Get fine-grained control across the customer lifecycle: insert your own business logic at any point along the customer lifecycle to customize registration, sync data across systems or alert on events of interest.
- Migrate or synchronize customer profile data: use hooks to keep all of your customer databases in sync by triggering data exports, imports and updates based on customer actions.
- Automate and trigger events: let your customer support and security teams know when interesting (or unusual) events happen by triggering workflow into the apps where they work.

Please see the [documentation here](https://docs.strivacity.com/fusion/setting-up-fusion/setup-and-manage-lifecycle-event-hooks) for more information.

## Integrations

Integrations live in the hooks folder.

- **Deduce** - This integration contains a Pre-Registration hook that demonstrates an integration with the Deduce Identity Insights, a fraud detection service that uses trust and risk indicators to determine if a session can be trusted. ([Documentation](https://docs.strivacity.com/fusion/integrations/security/deduce))
- **Discord** - This integration contains a Post-Account Login hook that demonstrates sending login events to a Discord webhook.
- **Dynamics** - This integration contains a Pre-Registration hook that demonstrates an integration with Microsoft Dynamics. The integration looks up the registering user's email address as a contact within the CRM to decide if the user is allowed to register or not. ([Documentation](https://docs.strivacity.com/fusion/integrations/crm-cdp-and-marketing/microsoft-dynamics-365))
- **EventBridge** - 
- **Hubspot** - This integration contains a Pre-Registration hook that demonstrates an integration with Hubspot. The integration looks up the registering user's email address as a contact within the CRM to decide if the user is allowed to register or not. ([Documentation](https://docs.strivacity.com/fusion/integrations/crm-cdp-and-marketing/hubspot))
- **IDDataWeb** - This integration contains a Pre-Registration Hook that demonstrates an integration with IDDataWeb. The integration redirects to IDDataWeb via OIDC, and parses the approve or deny response when IDDataWeb returns control to Strivacity. ([Documentation](https://docs.strivacity.com/fusion/integrations/identity-proofing/id-dataweb-attribute-exchange-network-axn))
- **Salesforce** - This integration contains a Pre-Registration hook that demonstrates an integration with Salesforce. The integration looks up the registering user's email address as a contact within the CRM to decide if the user is allowed to register or not. ([Documentation](https://docs.strivacity.com/fusion/integrations/crm-cdp-and-marketing/salesforce-lightning))
- **SecZetta** - This integration contains a Post-Identification hook that demonstrates an integration with the SecZetta Risk Score API. The integration looks up the username (or email) in the SecZetta platform to make a decision is the risk score is low enough to allow the login to proceed. ([Documentation](https://docs.strivacity.com/fusion/integrations/security/seczetta))
- **Slack** - This integration contains a Post-Account Login hook that demonstrates sending login events to a Slack webhook.
- **Splunk** - This integration contains a Post-Account Login hook that demonstrates sending login events to Splunk Cloud. ([Documentation](https://docs.strivacity.com/fusion/integrations/security/splunk))

## License

This project is licensed under the MIT license. See the [LICENSE](https://github.com/Strivacity/integrations/blob/master/LICENSE) file for more info.
