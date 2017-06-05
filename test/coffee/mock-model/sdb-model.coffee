# import ShareProxy from 'ember-share/models/share-proxy'
# import attr from 'ember-share/attr'

SDB = require('commonjs/ember-share')
ShareProxy = SDB.ShareProxy
attr = SDB.attr

module.exports = ShareProxy.extend
  # _childLimiations: [
  #   'duties/*/schedule_events'
  # ]
  log: attr()
  # scheduleSet: belongsTo DS, 'scheduleSet', async: true
  # dataset: belongsTo DS, 'tripsSchedule/dataset', async: true
  vehicles: attr()
  duties: attr()
  relief_vehicles: attr()
  stats: attr()
  day: attr()
  createdAt: attr 'date'
  unsaved: attr 'boolean'
  discarded: attr 'boolean'
  trips: attr()
  routes: attr()
  stops: attr()
  preferences: attr()
  order: attr()
  broken: attr 'boolean'

  # not in use yet
  createdBy: attr()
  revision: attr()
  name: attr()
  updatedAt: attr()
  updatedBy: attr()

  limitedObject: attr()

  _childLimiations: ['limitedObject', 'preferences', 'duties/*/schedule_events']
