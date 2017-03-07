const Fetcher = require('./lib/fetcher');

const f = new Fetcher();
const response = f.describeLoadBalancers();
f.getInstances(response);

