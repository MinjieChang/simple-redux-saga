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
  const { type, actionName } = effect
  chan.take((action) => { 
    if (action === actionName) {
      next(effect)
    }
  })
}

function isPromise(result) { 
  return result && typeof result.then === 'function';
}

function runForkEffect(effect, next) {
  // 此时effect可能是个iterator也可能是个纯对象
  // 初次启动 task(mainSaga2)，会返回一个iterator，所以此时的effect是个iterator
  // 如果effect是个iterator，那么就重启一个task，把iterator放入task中执行一遍
  // 重启的task和之前的task互不影响，
  task(effect.fn || effect)
  next(effect)
}

function resolvePromise(result, next) {
  return result.then(next, error => next(error))
}

function runCallEffect(effect, next) {
  let result = effect.fn()
  if (isPromise(result)) { 
    resolvePromise(result, next)
    return
  }
  next(result)
}

function runCancleEffect(effect, next) {
  const { taskId: { fn: { g } } } = effect
  g.return()
  next()
}

function task(gen) {
  // 需要判断gen是否为函数
  const g = typeof gen === 'function' ? gen() : gen
  if (typeof gen === 'function') { 
    gen.g = g
  }
  function next(args) {

    const result = g.next(args)
    const effect = result.value

    // 判断是否为 iterator
    if (effect && typeof effect[Symbol.iterator] === 'function') { 
      console.log(effect, 'runForkEffect')
      runForkEffect(effect, next)
    }

    if (isPromise(effect)) { 
      resolvePromise(effect, next)
    }

    if (!result.done) {
      if (effect.type === 'take') {
        console.log(effect, 'take-effect')
        runTakeEffect(effect, next)
      } else if (effect.type === 'fork') {
        console.log(effect, 'fork-effect')
        runForkEffect(effect, next)
      } else if (effect.type === 'call') {
        console.log(effect, 'call-effect')
        runCallEffect(effect, next)
      } else if (effect.type === 'cancle') {
        // console.log(effect, 'cancle-effect')
        runCancleEffect(effect, next)
      }
    }
  }
  next()
}

function fork(fn, arg) { 
  return {
    type: 'fork',
    fn: () => fn(arg)
  }
}

function sleep(time = 1000) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('hello saga666')
    }, time)
  })
}

function cancle(taskId) { 
  return {
    type: 'cancle',
    taskId: taskId
  }
}

function *mainSaga2() {
  let taskId = yield fork(function* (arg) {
    yield sleep(arg)
    console.log('sleep_done')
  }, 2000);
  console.log('resolved')
  yield take('cancle')
  console.log('cancle_taked')
  // 取消task
  yield cancle(taskId)
  console.log('cancle_end')
}

task(mainSaga2)
setTimeout(() => { 
  chan.put('cancle')
}, 3000)
// task(mainSaga)