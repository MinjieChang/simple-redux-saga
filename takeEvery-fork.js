function* mainSaga() {
  let result = yield take('start')
  console.log(result, 'get_start')
}

function take(name) {
  return {
    type: 'take',
    actionName: name,
  }
}

function channle() { 
  let taker = null
  function take(cb) { 
    taker = cb
  }
  function put(action) { 
    if (taker) {
      let tempTaker = taker
      taker = null
      tempTaker(action)
    }
  }
  return {
    take,
    put
  }
}

const chan = channle()

function runTakeEffect(effect, next) {
  // 交出next的执行权，由用户决定什么时候再执行
  // 所以此时需要把 next存储起来，供用户触发
  console.log(effect, 999)
  const { type, actionName } = effect
  chan.take((action) => { 
    if (action === actionName) {
      next(effect)
    }
  })
}

function runForkEffect(effect, next) {
  // 此时effect可能是个iterator也可能是个纯对象
  // 初次启动 task(mainSaga2)，会返回一个iterator，所以此时的effect是个iterator
  // 如果effect是个iterator，那么就重启一个task，把iterator放入task中执行一遍
  // 重启的task和之前的task互不影响，
  console.log(effect, 1111)
  task(effect.fn || effect)
  next(effect)
}

function task(gen) {
  // 需要判断gen是否为函数
  const g = typeof gen === 'function' ?  gen() : gen
  function next(args) {
    const result = g.next(args)
    const effect = result.value
    console.log(effect, 'effect+++++')
    if (effect && typeof effect[Symbol.iterator] === 'function') { 
      console.log(7778888)
      runForkEffect(effect, next)
    }
    // console.log(effect.type, 'effect.type')
    if (!result.done) {
      if (effect.type === 'take') {
        console.log(1111111)
        runTakeEffect(effect, next)
      } else if (effect.type === 'fork') {
        console.log(222222)
        runForkEffect(effect, next)
      } else { 
        // runForkEffect(effect, next)
      }
    }
  }
  next()
}
// task(mainSaga)

// setTimeout(() => {
//   chan.put('start')
//   chan.put('start')
// }, 1500)

function fork(cb) { 
  return {
    type: 'fork',
    fn: cb
  }
}

function *takeEvery(action, cb) {
  const result = yield fork(function * () {
    while (true) {
      const result = yield take(action)
      cb(result)
    }
  })
  console.log(result, 'takeEvery_result')
}

function *mainSaga2() {
  // 此时 takeEvery 会返回一个 iterator
  yield takeEvery('start', function (effect) { 
    console.log(effect, 'takeEvery_start')
  })
}

task(mainSaga2)
setTimeout(() => {
  chan.put('start')
  chan.put('start')
  chan.put('start')
  chan.put('start')
}, 1500)