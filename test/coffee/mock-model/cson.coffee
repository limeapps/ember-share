module.exports = ->
  order: ['a', 'b', 'c']
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
