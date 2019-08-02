'use strict'
const log = require('bole')('fabrik8.cluster')

exports.setMaintenanceWindow = async function (gkeClient, windows, cluster) {
  const { environment = 'production', zones = [] } = cluster
  const clusterOpts = {
    clusterId: cluster.clusterName,
    zone: zones[0],
    ...cluster
  }
  const oldStart = await exports.getMaintenanceTime(gkeClient, clusterOpts)
  log.debug('existing window start:', oldStart)
  const newWindow = _windowFromZone(windows, zones[0], environment)
  const newStart = windows[newWindow].startTime
  log.debug(`old start: ${oldStart}, new start: ${newStart}`)
  if (oldStart !== newStart) {
    log.info(`setting ${newWindow} maintenance window`)
    await exports.setMaintenanceTime(gkeClient, clusterOpts, newStart)
  }
  return newWindow
}

exports.setMaintenanceTime = async function (gkeClient, cluster, startTime) {
  const maintenancePolicy = { window: { dailyMaintenanceWindow: { startTime } } }

  await gkeClient.setMaintenancePolicy({
    clusterId: cluster.clusterName,
    zone: cluster.zones && cluster.zones[0],
    ...cluster,
    maintenancePolicy
  })
}

exports.getMaintenanceTime = async function (gkeClient, cluster) {
  const [clusterResponse] = await gkeClient.getCluster({
    clusterId: cluster.clusterName,
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
