
scheduleCreator = require './mock-model/schedule'


assert = chai.assert

module.exports = ->

  describe 'Model', ->
    schedule = null

    toJson = (obj) -> JSON.parse  JSON.stringify obj

    beforeEach ->
      schedule = scheduleCreator()

    afterEach ->
      schedule = null

    it 'test type of attribute Date', ->
      date = schedule.get 'createdAt'
      assert.typeOf (date.getDate), 'function'

    it 'test type of attribute Boolean', ->
      broken = schedule.get 'broken'
      assert.isBoolean broken
      assert.equal broken, false

    it 'Get name', ->
      name = schedule.get 'name'
      assert.equal name, 'my mocked schedule'

    it 'Get id', ->
      assert.equal 'abcd',  schedule.get 'id'

    it 'Set name', ->
      schedule.set 'name', 'new Name'
      newName = schedule.get 'name'
      assert.equal newName, 'new Name'
      opShouldBeSent = [ p:['name'], oi: 'new Name', od: 'my mocked schedule']
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'SetProperties', ->
      newProps = name: 'tests', revision: 2, mock: 'mock'
      schedule.setProperties newProps
      newName = schedule.get 'name'
      assert.equal newName, 'tests'
      newRevision = schedule.get 'revision'
      assert.equal newRevision, 2
      newMock = schedule.get 'mock'
      assert.equal newMock, 'mock'
      opShouldBeSent = [ p:['name'], oi: 'tests', od: 'my mocked schedule']
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent
      opShouldBeSent = [ p:['revision'], oi: 2, od: 1]
      assert.deepEqual schedule.get('doc.opsSent')[1], opShouldBeSent
      assert.isUndefined schedule.get('doc.opsSent')[2]

    it 'New schedule', ->
      # this tests the before each, that we actually got a new schedule when started the test
      assert.equal schedule.get('name'), 'my mocked schedule'

    it 'Get nested', ->
      cost = schedule.get 'duties.a.stats.cost'
      assert.equal cost, 2234

    it 'Set nested', ->
      schedule.set 'duties.a.stats.cost', 666
      cost = schedule.get 'duties.a.stats.cost'
      assert.equal cost, 666
      opShouldBeSent = [ p:['duties', 'a', 'stats', 'cost'], oi: 666, od: 2234]
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'Nested get', ->
      duty = schedule.get 'duties.a'
      cost = duty.get 'stats.cost'
      assert.equal cost, 2234
      assert.isUndefined schedule.get('doc.opsSent')[0]

    it 'Nested set', ->
      duty = schedule.get 'duties.a'
      duty.set 'stats.cost', 666
      cost = schedule.get 'duties.a.stats.cost'
      assert.equal cost, 666
      opShouldBeSent = [ p:['duties', 'a', 'stats', 'cost'], oi: 666, od: 2234]
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'Object Proxy (inner) get', ->
      duty = schedule.get 'duties.a'
      proxiedDuty = Ember.ObjectProxy.create content: duty
      cost = proxiedDuty.get 'stats.cost'
      assert.equal cost, 2234
      assert.isUndefined schedule.get('doc.opsSent')[0]

    it 'Object Proxy (inner) nested set', ->
      duty = schedule.get 'duties.a'
      proxiedDuty = Ember.ObjectProxy.create content: duty
      proxiedDuty.set 'stats.cost', 666
      cost = schedule.get 'duties.a.stats.cost'
      assert.equal cost, 666
      opShouldBeSent = [ p:['duties', 'a', 'stats', 'cost'], oi: 666, od: 2234]
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'Object Proxy (inner with content) set', ->
      duty = schedule.get 'duties.a'
      proxiedDuty = Ember.ObjectProxy.create content: duty
      proxiedDuty.set 'content.id', 'z'
      newId = schedule.get 'duties.a.id'
      assert.equal newId, 'z'
      opShouldBeSent = [ p:['duties', 'a', 'id'], oi: 'z', od: 'a']
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'Object Proxy (inner with content) nested set', ->
      duty = schedule.get 'duties.a'
      proxiedDuty = Ember.ObjectProxy.create content: duty
      proxiedDuty.set 'content.stats.cost', 666
      cost = schedule.get 'duties.a.stats.cost'
      assert.equal cost, 666
      opShouldBeSent = [ p:['duties', 'a', 'stats', 'cost'], oi: 666, od: 2234]
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent
      assert.isUndefined schedule.get('doc.opsSent')[1]

    it 'Object Proxy replace content', ->
      oldDuty = duty = schedule.get 'duties.a'
      oldDuty = oldDuty.toJson()
      proxiedDuty = Ember.ObjectProxy.create content: duty

      newDuty =
        stats:
          cost: 1111
          penalty: 222
        schedule_events: [ ]
      proxiedDuty.get 'stats'
      proxiedDuty.get 'schedule_events'
      content = proxiedDuty.get 'content'
      content.replaceContent newDuty
      a = (proxiedDuty.get 'content').toJson()
      assert.deepEqual newDuty, a
      opShouldBeSent = [ p:['duties', 'a'], oi: newDuty, od: oldDuty]
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent
      assert.isUndefined schedule.get('doc.opsSent')[1]

    it 'Model as Proxy get', ->
      proxiedSchedule = Ember.ObjectProxy.create content: schedule
      cost = proxiedSchedule.get 'duties.a.stats.cost'
      assert.equal cost, 2234

    it 'Model as Proxy set', ->
      proxiedSchedule = Ember.ObjectProxy.create content: schedule
      proxiedSchedule.set 'duties.a.stats.cost', 666
      cost = proxiedSchedule.get 'duties.a.stats.cost'
      assert.equal cost, 666
      opShouldBeSent = [ p:['duties', 'a', 'stats', 'cost'], oi: 666, od: 2234]
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'Model as Proxy set random prop', ->
      proxiedSchedule = Ember.ObjectProxy.create content: schedule
      proxiedSchedule.set 'randomProp', 666
      assert.isUndefined schedule.get('doc.opsSent')[0]

    it 'Array addObject (same)', ->
      order = schedule.get 'order'
      order.addObject 'c'
      newOrder = schedule.get 'order'
      assert.isUndefined schedule.get('doc.opsSent')[0]
      assert.deepEqual ['a', 'b', 'c'], (toJson newOrder.get 'content')

    it 'Array addObject (new)', ->
      order = schedule.get 'order'
      order.addObject 'd'
      newOrder = schedule.get 'order'
      assert.deepEqual ['a', 'b', 'c', 'd'], (toJson newOrder.get 'content')
      opShouldBeSent = [ p:['order', 3], li: 'd']
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'Array addObjects', ->
      order = schedule.get 'order'
      order.addObjects ['d', 'e']
      newOrder = schedule.get 'order'
      assert.deepEqual ['a', 'b', 'c', 'd', 'e'], (toJson newOrder.get 'content')
      opShouldBeSent = [ p:['order', 3], li: 'd']
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent
      opShouldBeSent = [ p:['order', 4], li: 'e']
      assert.deepEqual schedule.get('doc.opsSent')[1], opShouldBeSent

    it 'Array shiftObject',  ->
      order = schedule.get 'order'
      order.shiftObject()
      newOrder = schedule.get 'order'
      assert.deepEqual ['b', 'c'], (toJson newOrder.get 'content')
      opShouldBeSent = [ p:['order', 0], ld: 'a']
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'Nested Array addObject (new)', ->
      events = schedule.get 'duties.a.schedule_events'
      newEvent =
        type: 'custom'
      events.addObject newEvent
      newEvents = schedule.get 'duties.a.schedule_events'
      assert.equal 3, (toJson newEvents.get 'content').length
      opShouldBeSent = [ p:['duties', 'a', 'schedule_events', 2], li: newEvent]
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'Nested Array get', ->
      events = schedule.get 'duties.a.schedule_events'
      serviceTrip = events.objectAt(0)
      assert.equal 'service', (serviceTrip.get 'type')

    it 'Nested Array set', ->
      events = schedule.get 'duties.a.schedule_events'
      serviceTrip = events.objectAt(0)
      serviceTrip.set 'type', 'idle'
      assert.equal 'idle', (serviceTrip.get 'type')
      opShouldBeSent = [ p:['duties', 'a', 'schedule_events', '0', 'type'], od: 'service', oi: 'idle']
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'Nested Array changed index after insert', ->
      events = schedule.get 'duties.a.schedule_events'
      serviceTrip = events.objectAt(0)
      newEvent = type: 'custom'
      events.unshiftObject newEvent
      opShouldBeSent = [ p:['duties', 'a', 'schedule_events', 0], li: newEvent]
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent
      serviceTrip.set 'type', 'idle'
      assert.equal 'idle', (serviceTrip.get 'type')
      opShouldBeSent = [ p:['duties', 'a', 'schedule_events', '1', 'type'], od: 'service', oi: 'idle']
      assert.deepEqual schedule.get('doc.opsSent')[1], opShouldBeSent

    it 'Replace Array Simple Array', ->
      order = schedule.get('order')
      order.replaceContent ['f']
      assert.equal 1, order.get('content.length')

      opShouldBeSent = [ p:['order'], od: ['a', 'b', 'c'], oi: ['f']]
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent

    it 'Replace Array Objects', ->
      oldEvents =  [
              type: 'service'
              startTime: '11:00'
              endTime: '13:00'
            ,
              type: 'pull in'
              startTime: '11:00'
              endTime: '14:00'
            ]
      newEvents = [
        a: 'a'
      ]
      events = schedule.get('duties.a.schedule_events')
      service = events.objectAt 0
      idleTrip = events.objectAt 1
      events.replaceContent newEvents
      assert.equal 1, events.get('content.length')

      opShouldBeSent = [ p:['duties','a','schedule_events'], od: oldEvents, oi: newEvents]
      a = toJson(schedule.get('doc.opsSent')[0])
      b = toJson(opShouldBeSent)
      assert.deepEqual a, b
      assert.equal 'a', service.get('a')

    it 'Add property', ->
      newDuty =
        id: 'f'
        stats: 's'
        schedule_events: []

      duties = schedule.get('duties')
      duties.addKey 'f'
      schedule.set "duties.f", newDuty
      opShouldBeSent = [ p:[ 'duties', 'f'], oi: newDuty ]
      assert.deepEqual schedule.get('doc.opsSent')[0], opShouldBeSent
