function* mainSaga() {
  // while (true) { 
  //   let result = yield take('start')
  //   console.log(result, 'get_start')
  // }
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

function task(gen) {
  const g = gen()
  function next(args) { 
    const result = g.next(args)
    const effect = result.value
    if (!result.done) {
      if (effect.type === 'take') { 
        runTakeEffect(effect, next)
      }
    }
  }
  next()
}

task(mainSaga)

setTimeout(() => {
  chan.put('start')
  chan.put('start')
}, 1500)

