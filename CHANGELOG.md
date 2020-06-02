# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.9.6](https://github.com/npm-wharf/fabrik8/compare/v1.9.5...v1.9.6) (2020-06-02)


### Bug Fixes

* adds required yargs dependency ([853b929](https://github.com/npm-wharf/fabrik8/commit/853b929))
* check to see if we  already have a SA for the project ([#21](https://github.com/npm-wharf/fabrik8/issues/21)) ([59ff9a0](https://github.com/npm-wharf/fabrik8/commit/59ff9a0))



### [1.9.5](https://github.com/npm-wharf/fabrik8/compare/v1.9.4...v1.9.5) (2019-08-02)


### Bug Fixes

* use clusterName when fetching windows ([d672134](https://github.com/npm-wharf/fabrik8/commit/d672134))



### [1.9.4](https://github.com/npm-wharf/fabrik8/compare/v1.9.3...v1.9.4) (2019-08-02)



### [1.9.3](https://github.com/npm-wharf/fabrik8/compare/v1.9.2...v1.9.3) (2019-08-01)



### [1.9.2](https://github.com/npm-wharf/fabrik8/compare/v1.9.1...v1.9.2) (2019-08-01)


### Bug Fixes

* pass correct object to kubectx sync ([437ed23](https://github.com/npm-wharf/fabrik8/commit/437ed23))



### [1.9.1](https://github.com/npm-wharf/fabrik8/compare/v1.9.0...v1.9.1) (2019-08-01)



## [1.9.0](https://github.com/npm-wharf/fabrik8/compare/v1.8.0...v1.9.0) (2019-07-30)


### Bug Fixes

* add env alias ([fe81ce6](https://github.com/npm-wharf/fabrik8/commit/fe81ce6))
* update cluster-info-client ([2fb6711](https://github.com/npm-wharf/fabrik8/commit/2fb6711))


### Features

* **sync:** add sync command ([#20](https://github.com/npm-wharf/fabrik8/issues/20)) ([48e022f](https://github.com/npm-wharf/fabrik8/commit/48e022f))



### [1.8.1](https://github.com/npm-wharf/fabrik8/compare/v1.8.0...v1.8.1) (2019-07-27)


### Bug Fixes

* add env alias ([fe81ce6](https://github.com/npm-wharf/fabrik8/commit/fe81ce6))
* update cluster-info-client ([2fb6711](https://github.com/npm-wharf/fabrik8/commit/2fb6711))



## [1.8.0](https://github.com/npm-wharf/fabrik8/compare/v1.7.0...v1.8.0) (2019-07-26)


### Features

* **list:** add list command ([#18](https://github.com/npm-wharf/fabrik8/issues/18)) ([9b430f8](https://github.com/npm-wharf/fabrik8/commit/9b430f8))



## [1.7.0](https://github.com/npm-wharf/fabrik8/compare/v1.6.3...v1.7.0) (2019-07-24)


### Features

* automatically set up kubeconfig with cluster ([#14](https://github.com/npm-wharf/fabrik8/issues/14)) ([04ce81a](https://github.com/npm-wharf/fabrik8/commit/04ce81a))
* make sure maintenance windows are properly set ([#15](https://github.com/npm-wharf/fabrik8/issues/15)) ([b404895](https://github.com/npm-wharf/fabrik8/commit/b404895))



### [1.6.3](https://github.com/npm-wharf/fabrik8/compare/v1.6.2...v1.6.3) (2019-07-22)


### Bug Fixes

* add a proper CLI flag for zones.  Closes [#13](https://github.com/npm-wharf/fabrik8/issues/13) ([3c58717](https://github.com/npm-wharf/fabrik8/commit/3c58717))



### [1.6.2](https://github.com/npm-wharf/fabrik8/compare/v1.6.1...v1.6.2) (2019-07-19)


### Bug Fixes

* properly set applicationCredentials when re-running ([#12](https://github.com/npm-wharf/fabrik8/issues/12)) ([27a3438](https://github.com/npm-wharf/fabrik8/commit/27a3438))



### [1.6.1](https://github.com/npm-wharf/fabrik8/compare/v1.6.0...v1.6.1) (2019-07-17)


### Bug Fixes

* properly fetch common settings in --slug mode ([389f0d1](https://github.com/npm-wharf/fabrik8/commit/389f0d1))



## [1.6.0](https://github.com/npm-wharf/fabrik8/compare/v1.5.1...v1.6.0) (2019-07-17)


### Features

* populate new defaults when in --slug mode ([a1fe6fc](https://github.com/npm-wharf/fabrik8/commit/a1fe6fc))



### [1.5.1](https://github.com/npm-wharf/fabrik8/compare/v1.5.0...v1.5.1) (2019-07-13)


### Bug Fixes

* bistre output ([05d8d5e](https://github.com/npm-wharf/fabrik8/commit/05d8d5e))
* update kubeform ([9afe558](https://github.com/npm-wharf/fabrik8/commit/9afe558))



## [1.5.0](https://github.com/npm-wharf/fabrik8/compare/v1.4.2...v1.5.0) (2019-07-13)


### Bug Fixes

* update cluster-info-client ([dbae982](https://github.com/npm-wharf/fabrik8/commit/dbae982))


### Features

* add nunjucks templating for values ([5443153](https://github.com/npm-wharf/fabrik8/commit/5443153))



### [1.4.2](https://github.com/npm-wharf/fabrik8/compare/v1.4.1...v1.4.2) (2019-07-12)


### Bug Fixes

* remove redis url from cluster-info-client config ([d995ddd](https://github.com/npm-wharf/fabrik8/commit/d995ddd))



### [1.4.1](https://github.com/npm-wharf/fabrik8/compare/v1.4.0...v1.4.1) (2019-07-12)


### Bug Fixes

* fix bole dependency ([cc9d8a1](https://github.com/npm-wharf/fabrik8/commit/cc9d8a1))



## [1.4.0](https://github.com/npm-wharf/fabrik8/compare/v1.3.0...v1.4.0) (2019-07-11)


### Bug Fixes

* update CLI args for cluster-info-client.  closes [#5](https://github.com/npm-wharf/fabrik8/issues/5) ([e3e2b83](https://github.com/npm-wharf/fabrik8/commit/e3e2b83))


### Features

* **cli:** added fabrik8 cli override complete nested objects and arrays ([7e20d89](https://github.com/npm-wharf/fabrik8/commit/7e20d89))



<a name="1.3.0"></a>
# [1.3.0](https://github.com/npm-wharf/fabrik8/compare/v1.2.3...v1.3.0) (2019-06-29)


### Features

* add configuration to seed script ([7055901](https://github.com/npm-wharf/fabrik8/commit/7055901))
* add slug to saved parameters, add schema validation ([64d5358](https://github.com/npm-wharf/fabrik8/commit/64d5358))
* allow setting a clusterName distinct from the name ([b047b36](https://github.com/npm-wharf/fabrik8/commit/b047b36))



<a name="1.2.3"></a>
## [1.2.3](https://github.com/npm-wharf/fabrik8/compare/v1.2.2...v1.2.3) (2019-05-09)


### Bug Fixes

* use tokens.name for hte vault key, cluster name might not match ([d31a643](https://github.com/npm-wharf/fabrik8/commit/d31a643))



<a name="1.2.2"></a>
## [1.2.2](https://github.com/npm-wharf/fabrik8/compare/v1.2.1...v1.2.2) (2019-05-09)


### Bug Fixes

* properly pass environment when saving cluster info ([ca24cc9](https://github.com/npm-wharf/fabrik8/commit/ca24cc9))



<a name="1.2.1"></a>
## [1.2.1](https://github.com/npm-wharf/fabrik8/compare/v1.2.0...v1.2.1) (2019-05-04)


### Bug Fixes

* make vault approle params work through argv ([756e482](https://github.com/npm-wharf/fabrik8/commit/756e482))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/npm-wharf/fabrik8/compare/v1.1.1...v1.2.0) (2019-05-04)


### Features

* add Vault AppRole support ([a5faff0](https://github.com/npm-wharf/fabrik8/commit/a5faff0))



<a name="1.1.1"></a>
## [1.1.1](https://github.com/npm-wharf/fabrik8/compare/v1.1.0...v1.1.1) (2019-05-04)



<a name="1.1.0"></a>
# 1.1.0 (2019-04-29)


### Bug Fixes

* properly output token data ([#2](https://github.com/npm-wharf/fabrik8/issues/2)) ([4b70b7a](https://github.com/npm-wharf/fabrik8/commit/4b70b7a))


### Features

* Integrate cluster-info-client, automatically fetching and storing cluster info ([#3](https://github.com/npm-wharf/fabrik8/issues/3)) ([2df3712](https://github.com/npm-wharf/fabrik8/commit/2df3712))
