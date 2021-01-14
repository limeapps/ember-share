modelData = require './mock-model/cson'
SDB = require('commonjs/ember-share')
sdbModel = require './mock-model/sdb-model'


assert = chai.assert

module.exports = ->

  describe 'Server', ->

    App = null
    ShareStore = null
    schedule = null

    toJson = (obj) -> JSON.parse  JSON.stringify obj

    postJson = (url, data, delay) ->
       ajaxCall = new Promise (resolve, reject) ->
          $.ajax
            type: "POST",
            url: "http://localhost:3333/#{url}"
            data: data
            success: (response) ->
              setTimeout (-> resolve response), delay
            error: reject
            dataType: 'json'

    createDoc = (cb) ->
      json = _.assign {}, modelData(), id: "test-#{new Date().getTime()}"
      ShareStore.createRecord 'schedules', json
        .then (scheduleCreated) ->
          schedule = scheduleCreated
          cb()
        .catch cb

    deleteDoc = (cb) ->
      ShareStore.deleteRecord 'schedules', Ember.get(schedule, 'id')
        .then cb
        .catch cb

    before (done) ->
      @timeout 5000
      Ember.Application.initializer
        name: 'api-adapter'
        initialize: (app) ->
          SDB.Store.reopen
            url: 'localhost'
            port: 3333
            protocol: 'http'
            modelStr: 'model'
          app.register 'ShareStore:main', SDB.Store
          app.inject 'controller', 'ShareStore', 'ShareStore:main'
          app.inject 'route', 'ShareStore', 'ShareStore:main'

      App = Ember.Application.create()
      App.Schedule = sdbModel
      App.ApplicationController = Ember.Controller.extend
        initShareStore: (->
          ShareStore = @ShareStore
          @ShareStore.checkConnection()
            .then done
            .catch done
        ).on 'init'

    beforeEach createDoc

    afterEach deleteDoc

    createDataOp = (op) ->
      id: schedule.get 'id'
      collection: 'schedules'
      op: op

    it 'set', (done) ->
      Obj = Ember.Object.extend
        schedule: schedule
        cost: Ember.computed.oneWay 'schedule.duties.a.stats.cost'
      obj = Obj.create()

      cost = obj.get 'cost'

      dutyA = schedule.get 'duties.a'
      statsA = dutyA.get 'stats'

      assert.equal cost, 2234

      op = p:['duties', 'a', 'stats', 'cost'], oi: 666, od: 2234

      postJson 'op/', createDataOp(op), 0
        .then (response) ->
          assert.equal response?.msg, 'Success'
          newCost = obj.get 'cost'
          assert.equal newCost, 666
          done()
        .catch done

    it 'Proxy a new duty', (done) ->
      oldDuty = (schedule.get 'duties.a').toJson()

      newDuty =
        stats:
          cost: "1111"
          penalty: "222"
        schedule_events: ['a']

      proxiedDuty = Ember.ObjectProxy.create
        content: schedule.get 'duties.a'

      op = p:['duties', 'a'], oi: newDuty, od: oldDuty

      postJson 'op/', createDataOp(op), 0
        .then (response) ->
          assert.equal response?.msg, 'Success'
          changedDuty = (proxiedDuty.get 'content').toJson()
          assert.deepEqual newDuty, changedDuty
          done()
        .catch done


    it 'Proxy inner properties - array', (done) ->
      secondEvent =
        type: 'pull in'
        startTime: '11:00'
        endTime: '14:00'

      vord = Ember.ObjectProxy.extend
        events: Ember.computed.map 'schedule_events', (event) -> event

      proxiedDuty = vord.create
        content: schedule.get 'duties.a'

      eventLengthBefore  = proxiedDuty.get 'events.length'

      op = p:['duties', 'a', 'schedule_events', '1'], ld: secondEvent

      postJson 'op/', createDataOp(op), 100
        .then (response) ->
          assert.equal response?.msg, 'Success'
          eventLengthAfter = proxiedDuty.get 'events.length'
          assert.notEqual eventLengthBefore, eventLengthAfter
          done()
        .catch done

    it 'two arrays', (done) ->
      order = schedule.get 'order'
      log = schedule.get 'log'

      op = p:['log', 0], li: 0

      postJson 'op/', createDataOp(op), 0
        .then (response) ->
          assert.equal response?.msg, 'Success'
          assert.equal 4, log.get('content.length')
          done()
        .catch done

    it 'many logs', (done) ->
      @timeout 5000
      logNumber = [0..20]
      promises = []
      invoke = (arr) -> _.map arr, (fn) -> fn()

      obj = Ember.Object.extend
        _log: (->
          log = @get 'job.log'
          if (@get 'job.log.content.length') is 3
            'start'
          else
            log.get 'content.lastObject'
        ).property 'job.log.[]'

      obj = obj.create job: schedule

      _.forEach logNumber, (n) ->
        tempObj = number: n, test: n*4
        promises.push ->
          postJson 'op/', createDataOp(p:['log', (n + 3)], li: tempObj), 100

      start = promises.slice 0, 4
      middle = promises.slice 4, 10
      end = promises.slice 10, 20
      startLog = null;  endLog = null ; middleLog = null

      Promise.all invoke start

        .then (msgs) ->
          assert.isTrue _.every msgs, (msgObj) -> msgObj.msg is 'Success'
          startLog = obj.get '_log'
          Promise.all invoke middle

        .then (msgs) ->
          assert.isTrue _.every msgs, (msgObj) -> msgObj.msg is 'Success'
          middleLog =  obj.get '_log'
          assert.notDeepEqual startLog, middleLog
          Promise.all invoke end

        .then (msgs) ->
          assert.isTrue _.every msgs, (msgObj) -> msgObj.msg is 'Success'
          endLog =  obj.get '_log'
          assert.notDeepEqual middleLog, endLog
          done()

        .catch done

    it 'get inner id', (done) ->
      Vord = Ember.Object.extend
        id: (->
          @get 'b.id'
        ).property 'b.id'

      proxiedDuty = Vord.create
        b: schedule.get 'duties.d'

      idBefore = proxiedDuty.get 'id'

      op =
        p: ['duties', 'd', 'id']
        od: 'd'
        oi: 'e'

      postJson 'op/', createDataOp(op), 0
        .then (response) ->
          assert.equal response?.msg, 'Success'
          assert.equal response?.msg, 'Success'
          idAfter = proxiedDuty.get 'id'
          assert.notEqual idAfter, idBefore
          done()
        .catch done

    it 'Proxy inner properties - array - object', (done) ->
      serviceEvent =
        startTime: 1
        endTime: 2

      vord = Ember.ObjectProxy.extend
        events: Ember.computed.map 'schedule_events', (event) -> event

      proxiedDuty = vord.create
        content: schedule.get 'duties.d'

      innerEvent = proxiedDuty.get 'events.0'

      op =
        p: ['duties', 'd', 'schedule_events', '0', 'service_trip']
        od: serviceEvent

      postJson 'op/', createDataOp(op), 0
        .then (response) ->
          assert.equal response?.msg, 'Success'
          assert.deepEqual innerEvent.toJson(), index: 1
          done()
        .catch done

    it 'Proxy replace array 1', (done) ->
      @timeout 5000
      startScheduleEvents = [
        type: 'service'
        startTime: '11:00'
        endTime: '13:00'
      ,
        type: 'pull in'
        startTime: '11:00'
        endTime: '14:00'
      ]

      endScheduleEvents = ['a', 'b', 'c']

      op =
        p: ['duties', 'b', 'schedule_events']
        od: startScheduleEvents
        oi: endScheduleEvents


      eventsWasCalledCounter = 0
      Obj = Ember.Object.extend
        events: (->
          eventsWasCalledCounter++
          @get('duty.schedule_events')
        ).property 'duty.schedule_events.[]'

      obj = Obj.create duty: schedule.get 'duties.b'
      obj.get 'events'

      postJson 'op/', createDataOp(op), 200
        .then (response) ->
          assert.equal response?.msg, 'Success'
          a = obj.get('events').toArray()
          assert.deepEqual endScheduleEvents, a
          assert.equal eventsWasCalledCounter, 2
          done()
        .catch done

    it 'Add property', (done) ->
      newDuty =
        id: 'f'
        stats: 's'

      op =  p:[ 'duties', 'f'], oi: newDuty

      duties = schedule.get 'duties'

      postJson 'op/', createDataOp(op), 100
        .then (response) ->
          assert.equal response?.msg, 'Success'
          dutyF = duties.get 'f'
          assert.deepEqual dutyF.toJson(), newDuty
          done()
        .catch done

    it 'Remove property', (done) ->
      dutyA = schedule.get 'duties.a'

      op =  p:[ 'duties', 'a'], od: dutyA.toJson()

      duties = schedule.get 'duties'

      postJson 'op/', createDataOp(op), 100
        .then (response) ->
          assert.equal response?.msg, 'Success'
          assert.isUndefined duties.get 'a'
          done()
        .catch done

    it 'Child Limiations (Object)', (done) ->

      Obj = Ember.Object.extend
        limitedObject: (->
          console.log 'should happen twice'
          @get 'schedule.limitedObject.some.data'
        ).property 'schedule.limitedObject'

      obj = Obj.create {schedule}
      obj.get 'limitedObject'

      op =  p:[ 'limitedObject', 'some', 'data'], oi: 2, od: 1

      postJson 'op/', createDataOp(op), 100
        .then (response) ->
          assert.equal response?.msg, 'Success'
          assert.equal obj.get('limitedObject'), 2
          done()
        .catch done

    it 'Child Limiations (unscheduled)', (done) ->
      @timeout 5000

      Obj = Ember.Object.extend
        scheduled: (->
          console.log 'should happen twice'
          @get 'schedule.duties.b.unscheduled'
        ).property 'schedule.duties.b.unscheduled'

      obj = Obj.create {schedule}
      obj.get 'scheduled'

      op =  p:[ 'duties', 'b', 'unscheduled'], oi: true

      postJson 'op/', createDataOp(op), 100
        .then (response) ->
          assert.equal response?.msg, 'Success'
          assert.equal obj.get('scheduled'), 'true'
          done()
        .catch done

    it.skip 'op came from an a property that is is not an attribute', (done) ->

      op = p: [ 'arr', 1 ], li: 2
#      op = p: [ 'str' ], oi: 'is', od: "as"
      postJson 'op/', createDataOp(op), 100
        .then (response) ->
          assert.equal response?.msg, 'Success'
          console.log(schedule)
          done()
        .catch done

    it 'test nestedArray replace', (done) ->
      @timeout 4000
      nestedArray = schedule.get 'nestedArray'
      nestedArray.get 'arr'
# nestedArray.

      op1 =
        p: ['nestedArray', 'arr', 3]
        li: 'd'

      op2 =
        p: ['nestedArray', 'arr']
        oi: newValue = ['z', 'x','2','4']
        od: schedule.get('nestedArray.arr').toJson()

      op3 =
        p: ['nestedArray', 'arr', 4]
        li: 'p'

      postJson 'op/', createDataOp(op1), 100
        .then (response) ->
          assert.equal response?.msg, 'Success'
          assert.equal nestedArray.get('arr').toJson()[3], 'd'
          postJson 'op/', createDataOp(op2), 100
        .then (response) ->
          assert.equal response?.msg, 'Success'
          assert.deepEqual nestedArray.get('arr').toJson(), newValue
          postJson 'op/', createDataOp(op3), 100
        .then (response) ->
          assert.equal response?.msg, 'Success'
          assert.equal nestedArray.get('arr').toJson()[4], 'p'
          done()
        .catch done

    it 'parent key is persisted on child deletion', ->
      serviceTrips = schedule.get('events.service_trip.id_1')

      op =
        p: ['events', 'stand_by', 'id_1']
        od: name: 1

      postJson 'op/', createDataOp(op), 10
        .then (response) ->
          assert.equal response?.msg, 'Success'
          assert.isUndefined schedule.doc.data.events.stand_by.id_1
          assert.isDefined schedule.doc.data.events.stand_by.id_2
          assert.isDefined schedule.get('events.stand_by.id_2')
          assert.isUndefined schedule.get('events.stand_by.id_1')


    # it 'Child Limiations (Array)', (done) ->
    #   Obj = Ember.Object.extend
    #     allowDeadHeads: (->
    #       console.log 'get perform'
    #       @get 'schedule.preferences.0.pref1.allowDeadHeads'
    #     ).property 'schedule.limitedObject'
    #   obj = Obj.create {schedule}
    #   console.log obj.get 'allowDeadHeads'
    #   op =  p:[ 'preferences', 0, 'pref1', 'allowDeadHeads'], oi: false, od: true
    #
    #   postJson 'op/', createDataOp(op), 100
    #     .then (response) ->
    #       assert.equal response?.msg, 'Success'
    #       console.log obj.get 'allowDeadHeads'
    #       assert.isFalse obj.get('allowDeadHeads')
    #       done()
    #     .catch done
