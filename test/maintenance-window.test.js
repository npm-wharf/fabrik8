'use strict'
const { setMaintenanceWindow } = require('../lib/maintenance-window')
const { expect, should } = require('chai')
should()
const bistre = require('bistre')()
bistre.pipe(process.stdout)
const bole = require('bole')
bole.output({
  level: 'info',
  stream: bistre
})

const MAINT_WINDOWS = {
  P100: {
    environments: ['dev', 'staging'],
    zones: [
      'europe*'
    ],
    startTime: '19:00'
  },
  P200: {
    zones: [
      'northamerica*',
      'southamerica*',
      'us-east*',
      'us-central*'
    ],
    startTime: '00:00'
  },
  P300: {
    zones: [
      'us-west*',
      'asia*',
      'australia*'
    ],
    startTime: '12:00'
  }
}

describe('setMaintenanceWindow', () => {
  let client
  let startTime = '08:00'
  let newTime

  before(() => {
    client = {
      async getCluster () {
        return [{
          maintenancePolicy: {
            window: {
              dailyMaintenanceWindow: {
                startTime
              }
            }
          }
        }]
      },
      async setMaintenancePolicy ({ maintenancePolicy: policy }) {
        newTime = policy.window.dailyMaintenanceWindow.startTime
      }
    }
  })

  it('should set the maintenance window according to the zone (P100)', async () => {
    startTime = '08:00'
    const result = await setMaintenanceWindow(client, MAINT_WINDOWS, {
      projectId: 'npm-inc',
      name: 'fabtest2',
      zones: ['europe-west1-a']
    })
    result.should.equal('P100')
    newTime.should.equal('19:00')
  })

  it('should set the maintenance window according to the zone (P200)', async () => {
    startTime = '08:00'
    const result = await setMaintenanceWindow(client, MAINT_WINDOWS, {
      projectId: 'npm-inc',
      name: 'fabtest2',
      zones: ['us-central1-a']
    })
    result.should.equal('P200')
    newTime.should.equal('00:00')
  })

  it('should set the maintenance window according to the zone (P200)', async () => {
    startTime = '08:00'
    const result = await setMaintenanceWindow(client, MAINT_WINDOWS, {
      projectId: 'npm-inc',
      name: 'fabtest2',
      zones: ['us-west1-a']
    })
    result.should.equal('P300')
    newTime.should.equal('12:00')
  })

  it('should set the maintenance window according to the zone (dev)', async () => {
    startTime = '08:00'
    const result = await setMaintenanceWindow(client, MAINT_WINDOWS, {
      projectId: 'npm-inc',
      name: 'fabtest2',
      zones: ['us-west1-a'],
      environment: 'dev'
    })
    result.should.equal('P100')
    newTime.should.equal('19:00')
  })

  it('idempotent if already correct', async () => {
    startTime = '19:00'
    newTime = null
    const result = await setMaintenanceWindow(client, MAINT_WINDOWS, {
      projectId: 'npm-inc',
      name: 'fabtest2',
      zones: ['us-west1-a'],
      environment: 'dev'
    })
    result.should.equal('P100')
    expect(newTime).to.equal(null)
  })
})
