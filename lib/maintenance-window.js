'use strict'
const log = require('bole')('fabrik8.cluster')

exports.setMaintenanceWindow = async function (clusterClient, windows, cluster) {
  const { environment = 'production', zones = [] } = cluster
  const clusterOpts = {
    clusterId: cluster.name,
    zone: zones[0],
    ...cluster
  }
  const oldStart = await exports.getMaintenanceTime(clusterClient, clusterOpts)
  log.debug('existing window start:', oldStart)
  const newWindow = _windowFromZone(windows, zones[0], environment)
  const newStart = windows[newWindow].startTime
  log.debug(`old start: ${oldStart}, new start: ${newStart}`)
  if (oldStart !== newStart) {
    log.info(`setting ${newWindow} maintenance window`)
    await exports.setMaintenanceTime(clusterClient, clusterOpts, newStart)
  }
  return newWindow
}

exports.setMaintenanceTime = async function (clusterClient, cluster, startTime) {
  const maintenancePolicy = { window: { dailyMaintenanceWindow: { startTime } } }

  await clusterClient.setMaintenancePolicy({
    clusterId: cluster.name,
    zone: cluster.zones && cluster.zones[0],
    ...cluster,
    maintenancePolicy
  })
}

exports.getMaintenanceTime = async function (clusterClient, cluster) {
  const [clusterResponse] = await clusterClient.getCluster({
    clusterId: cluster.name,
    zone: cluster.zones && cluster.zones[0],
    ...cluster
  })
  log.debug(JSON.stringify(clusterResponse, null, 2))
  // Tears of Demeter
  return clusterResponse.maintenancePolicy.window.dailyMaintenanceWindow.startTime
}

function _windowFromZone (windows, zone, env) {
  for (const windowName of Object.keys(windows)) {
    const { environments = [], zones } = windows[windowName]
    if (environments.includes(env)) return windowName
    if (zones.some(zonePattern => zone.startsWith(zonePattern.replace('*', '')))) return windowName
  }
  return Object.keys(windows).find(windowName => windows[windowName].default)
}
