const AWS = require('aws-sdk');
const request = require('request');
const cheerio = require('cheerio');
const slack = require('slack-notify')(process.env.SLACK_WEBHOOK_URL);

const elb = new AWS.ELB({ apiVersion: '2012-06-01' });
const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

class Fetcher {

  describeLoadBalancers() {
    return elb.describeLoadBalancers({
      LoadBalancerNames: [process.env.BROKEN_LOAD_BALANCER_NAME]
    }).promise();
  }

  getInstances(elbDescribeResponse) {
    const root = this;
    elbDescribeResponse.then((response) => {
      for (const currentElb of response.LoadBalancerDescriptions) {
        root.getIpAddress(currentElb.Instances);
      }
    }, (error) => {
      console.error('Failed', error);
    });
  }

  getIpAddress(instanceIds) {
    const ids = [];
    for (const instanceId of instanceIds) {
      ids.push(instanceId.InstanceId);
    }
    this.describeInstances(ids);
  }

  getCssLinks($) {
    const links = [];
    $(`link[rel="stylesheet"][href$=".css"][href^="${process.env.ASSET_DOMAIN}"]`).each(function (elem) {
      links.push($(this).attr('href'));
    });
    return links;
  }

  getJsLinks($) {
    const links = [];
    $(`script[src^="${process.env.ASSET_DOMAIN}"]`).each(function (elem) {
      links.push($(this).attr('src'));
    });
    return links;
  }

  checkBrokenLinks(links, ipAddress) {
    const root = this;
    const merged = [].concat.apply([], links);
    for (const link of merged) {
      request(link, (error, response, body) => {
        if (error || response.statusCode != 200) {
          root.notifyOnSlack({ link, error, ipAddress });
        } else {
          console.log(`${ipAddress} is not broken & returned ${response.statusCode}`);
        }
      });
    }
  }

  notifyOnSlack(options) {
    console.log('error error');
    console.log(options);
    const params = { text: 'Error. Broken Assets Links found. Please run asset:precompile.',
      fields: options };
    slack.onError = function (err) {
      console.error('Slack API error:', err);
    };
    const assetLog = slack.extend({
      channel: process.env.SLACK_CHANNEL,
      icon_emoji: ':computer:',
      username: 'Assert Checker',
    });
    assetLog(params);
  }

  check(ipAddress) {
    const root = this;
    request(`http://${ipAddress}`, (error, response, body) => {
      if (error || response.statusCode != 200) {
        root.notifyOnSlack({ error, ipAddress });
      } else {
        const links = [];
        const $ = cheerio.load(body);
        links.push(root.getCssLinks($));
        links.push(root.getJsLinks($));
        root.checkBrokenLinks(links, ipAddress);
      }
    });
  }

  describeInstances(ids) {
    const root = this;
    const describeInstancesResonse = ec2.describeInstances({ InstanceIds: ids }).promise();
    describeInstancesResonse.then((response) => {
      for (const reservation of response.Reservations) {
        for (const instance of reservation.Instances) {
          root.check(instance.PrivateIpAddress);
        }
      }
    }, (error) => {
      console.error('Failed', error);
    });
  }
}
module.exports = Fetcher;
