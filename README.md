# fabrik8

Provision and deploy cluster specifications from a single API.

[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]
[![Version npm][version-image]][version-url]
[![npm Downloads][downloads-image]][downloads-url]
[![Dependencies][dependencies-image]][dependencies-url]

### What It's For

`fabrik8` was designed to handle initialization of Kubernetes clusters with an initial, known-set of software using a [`mcgonagall`](https://github.com/npm-wharf/mcgonagall) specification.

It works well in environments where you might want ephemeral clusters, clusters on demand (think single tenancy), or think about things like automation and disaster recovery a lot.

### What It's **Not** For

`fabrik8` is not a CD solution (at least not presently). It is not meant to be run continuously against the same target (it cannot guarantee 100% idempotence, but makes a best effort to be). Running `fabrik8` multiple times _may_ yield unexpected results. For CD solutions, see [`hikaru`](https://github.com/npm-wharf/hikaru).

## Approach

fabrik8 uses [`kubeform`](https://github.com/npm-wharf/kubeform), [`mcgonagall`](https://github.com/npm-wharf/mcgonagall), and [`hikaru`](https://github.com/npm-wharf/hikaru) to provision clusters, transform specifications, and deploy them to the newly created cluster.

## Environment Variables

As noted in `kubeform`, many of the environment variables are cloud provider specific and will only be necessary when using a specific provider.

| Variable | Description | Default |
|:-:|---|---|
| `KUBE_SERVICE` | The backing service to use for the request | `'GKE'` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google API credentials file | `''` |
| `GOOGLE_ORGANIZATION_ID` | Google Organization Id to create projects under | `''` |
| `GOOGLE_BILLING_ID` | Google Billing Account Id to associate with project | `''` |

## API

### `initialize(cluster, specification, data|onData)`

The `initialize` call requires three arguments and returns a promise.

#### `cluster`

This will be the same as the `kubeform` cluster specification (not repeated here).

#### `specification`

The specification argument must either be a file path to the spec or a URL to the GitHub repo where the [mcgonagall](https://github.com/npm-wharf/mcgonagall) specification is located.

#### `data|onData`

The third argument can either be a hash of data required to satisfy tokens present in the specification, or a function that is passed a list of tokens required by the specification. If a function is provided, the result expected is a promise providing a hash of data.

```js
function getTokens (tokenList) {
  // return token hash as a promise
  return Promise.resolve({
    tokenName: tokenValue
  })
}
```

To control how cluster data will be merged with the mcgonagall specification data, the hash should include a function named `onCluster`. It will be passed the cluster information returned from `kubeform` and the data. The signature is:

```js
function onCluster (data, clusterInfo) {
  // assign new properties to data from clusterInfo as needed
  data.someValue = clusterInfo.someSourceValue
}
```

Without passing this function, all cluster details will be set as children of a `.cluster` property.

#### Return

Returns the cluster information from `kubeform` and the data used to satisfy the specification (under the property `specData`).

The expectation is that this information will be stored for future retrieval when interacting with the cluster. `fabrik8` does not do anything beyond coordinate calls between libraries in order to simplify creation of fully functional 

It is recommended that sensitive data (like the Kubernetes admin password) is stored separately in Vault or encrypted before storage.

## CLI

A CLI is also provided for `fabrik8` that allows you to invoke the API from the command line:

### `fabrik8 create [--name name] [--url url] --spec ./path/to/spec`

Creates a full cluster, reading defaults and existing configuration securely from centralized cluster-info.  The only options that are required are configuration for cluster-info, a name or cluster url, and the path to a McGonagall specification.  If re-running, only a name is required -- options will be re-read from cluster-info.

* `--url`, `-u` the url of the cluster you wish to create, e.g. `mycluster.npme.io`
* `--name`, `-n` the name of the cluster.  Can be inferred from the url
* `--domain` the domain of the cluster.  Can be inferred from the url.  Defaults to whatever is specified in the cluster-info defaults, if only a name is provided.
* `--projectId` the name of the gke project to use.  Can be inferred from the cluster name
* `--environment` the environment of the cluster, e.g. development, production
* `--specification`, `-m`, `--spec` the path or URL to the mcgonagall specification
* `--verbose` output verbose logging (status check output for hikaru)
* `--vaultHost` the host of the vault server containing sensitive cluster information, auth data, and defaults. Can also be set through the `VAULT_HOST` environment variable
* `--vaultToken` an auth token for the vault server. Can also be set through the `VAULT_TOKEN` environment variable
* `--provider` the cloud provider to use, defaults to `KUBE_SERVICE` environment variable or `GKE`
* `--output`, `-o` file to write cluster-info to, for debugging

Values from the defaults can also be overridden as command line args, by prefixing the key with `--arg-`, e.g. `--arg-cluster.worker.memory 26GB`, or `--arg-common.zones eu-central1-a`.  Look at the cluster-info defaults for a list of values that can be overridden.

Command line arguments take precedence over saved cluster-info, which take precedence over default cluster-info.  Cluster info-will be saved everytime you run `fabrik8`, so re-running `fabrik8 create` can be used to change values.


[travis-image]: https://travis-ci.org/npm-wharf/fabrik8.svg?branch=master
[travis-url]: https://travis-ci.org/npm-wharf/fabrik8
[coveralls-url]: https://coveralls.io/github/npm-wharf/fabrik8?branch=master
[coveralls-image]: https://coveralls.io/repos/github/npm-wharf/fabrik8/badge.svg?branch=master
[version-image]: https://img.shields.io/npm/v/@npm-wharf/fabrik8.svg?style=flat
[version-url]: https://www.npmjs.com/package/@npm-wharf/fabrik8
[downloads-image]: https://img.shields.io/npm/dm/@npm-wharf/fabrik8.svg?style=flat
[downloads-url]: https://www.npmjs.com/package/@npm-wharf/fabrik8
[dependencies-image]: https://img.shields.io/david/npm-wharf/fabrik8.svg?style=flat
[dependencies-url]: https://david-dm.org/npm-wharf/fabrik8
