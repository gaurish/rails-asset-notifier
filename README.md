Rails Asset Notifier


Please set the following ENV vars:

1. SLACK_WEBHOOK_URL: WEBHOOK of Slack where notification should be posted.
2. BROKEN_LOAD_BALANCER_NAME: Name of the ELB for which assets needs to be fetched
3. SLACK_CHANNEL: slack channel name where notifications will be posted. 
4. ASSET_DOMAIN: The asset domain where you assets are hosted for example https://example.com


Can be deployed to any Node.JS based env
