module.exports = ->
  order: ['a', 'b', 'c']
  rosters: [
    id: '1'
    task_ids: [ '1', '2', '3' ]
  ,
    id: '2'
    task_ids: [ '4', '5', '6' ]
  ,
    id: '3'
    task_ids: [ '7', '8', '9' ]
  ]
  orderObj:
    duties: []
  nestedArray:
    arr: ['a', 'b', 'c']
  limitedObject:
    some:
      data: 1
  log: [
    [
      key: 'initializing_duty_creation'
      params :
          "piece_count" : 27403
          "completed_pieces" : 0
    ]
    [
      key: 'initializing_duty_creation'
      params :
          "piece_count" : 27403
          "completed_pieces" : 1
    ]
    [
      key: 'initializing_duty_creation'
      params :
          "piece_count" : 27403
          "completed_pieces" : 2
    ]
  ]
  preferences: [
    pref1:
      allowDeadHeads: true
  ,
    pref2:
      allowDeadHeads: false
  ]
  revision: 1
  name: 'my mocked schedule'
  createdAt: 'Mon Mar 27 2017 14:42:07 GMT+0300 (IDT)'
  events:
    service_trip:
      id_1:
        name: 3
    stand_by:
      id_1:
        name: 1
      id_2:
        name: 2
  broken: false
  duties:
    a:
      id: 'a'
      stats:
        cost: 2234
        penalty: 346
      schedule_events: [
        type: 'service'
        startTime: '11:00'
        endTime: '13:00'
      ,
        type: 'pull in'
        startTime: '11:00'
        endTime: '14:00'
      ]

    b:
      id: 'b'
      stats:
        cost: 825
        penalty: 89345
      schedule_events: [
        type: 'service'
        startTime: '11:00'
        endTime: '12:00'
      ,
        type: 'pull in'
        startTime: '11:00'
        endTime: '12:00'
      ]

    c:
      id: 'c'
      stats:
        cost: 89234
        penalty: 89345
      schedule_events: [
        type: 'service'
        startTime: '11:00'
        endTime: '12:00'
      ,
        type: 'pull in'
        startTime: '11:00'
        endTime: '12:00'
      ]
    d:
      id: 'd'
      schedule_events: [
        index: 1
        service_trip:
          startTime: 1
          endTime: 2
      ]

    arr: [ 1 ]
    str: 'as'
