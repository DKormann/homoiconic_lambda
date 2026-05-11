`
going back to a more faithfull plan implementation
`

type Pin = [Val]
type Law = {arity: number, meta: Val, body: Val}
type App = [Val, Val]
type Nat = number
type Val = Pin | Law | App | Nat

const match = <T>( pin: (p:Val)=>T, law: (arity:number, meta:Val, body:Val)=>T, app: (f:Val, arg:Val) => T, n: (n:number)=>T,) =>
  (v:Val):T =>typeof v == "number" ? n(v) : Array.isArray(v) ? v.length == 1 ? pin(v[0]) : app(...v) : law(v.arity, v.meta, v.body)

const fmt = (x:any) => JSON.stringify(x, null, 2)
const subst = (t:Val, args:Val[]):Val => match(_=>t, _=>t,(a,b)=>[subst(a, args), subst(b, args)] as App, n=> args[n] ?? n-args.length )(t)

let DEBUG = false
let log = <T>(tag:string, x:T):T=> DEBUG ? (console.log(tag, fmt(x)), x) : x
const app = (f:Val, args:Val[]):Val=> args.reduce((p,c)=> [p,c], f)
const call = (t: Val, a:number, f:(...args:Val[])=>Val, args:Val[]):Val=>
  (a > args.length) ? app(t, args) : exf(app(f(...args.slice(0, a)), args.slice(a)), [])

const exf = (t:Val, args: Val[]):Val=> match(
  p=> {
    if (p == 0) {
      let [op, ...xs] = args
      let fn = [t,op] as App
      return (op == 0) ? call(fn, 1, x=>[x], xs)
        : (op == 1) ? call(fn, 3, (a,m,b)=> ({arity: a as number + 1, meta: m, body: whnf(b)}), xs)
        : (op == 2) ? call(fn, 6, (p,l,a,z,m,o)=> match( x => app(p, [x]),(a,m,b) => app(l, [a,m,b]), (f,x) => app(a, [f,x]), n => n == 0 ? z : app(m,[n-1]))(whnf(o)), xs)
        : app(t, args)
    }
    return app(t, args)
  },
  (a,m,b)=> call(t, a-1, (...args:Val[]) => subst(b, [t, ...args]), args),
  (a,b)=>exf(a, [b,...args]), _=> app(t,args)
)(t)

let whnf = (t:Val):Val=> exf(t, [])

let check = (t:Val, expect:Val) => {
  let res = whnf(t)
  if (fmt(res) != fmt(expect)) console.error(`Result: ${fmt(res)}\nExpected ${fmt(expect)}`)
  else log("OK", res)
}

let TRU: Val = {arity: 3, meta: 0, body: 1}
let FAL: Val = {arity: 3, meta: 0, body: 2}
let ID: Val = {arity: 2, meta: 0, body: 1}
let Consume: Val = {arity: 2, meta: 0, body: 0}

check(app(TRU, [22,33]), 22)
check(app(FAL, [22,33]), 33)
check(app(FAL, [22,33,66]), [33,66])
check(app(ID, [42]), 42)
check(app(ID, [42,88]), [42,88])
check(app(Consume, [11]), Consume)
check(app(Consume, [1,2,3,4,5]), Consume)

const mkpin:Val = [[0], 0]
const mklaw:Val = [[0], 1]
const elim:Val = [[0], 2]

check(app(mkpin, [33]), [33])
check(app(mklaw, [2, 0, 1]), TRU)

check(app(elim, [0, 0, 0, 0, 0, 0]), 0)
check(app(elim, [0, 0, 0, 33, 0, 0]), 33)
check(app(elim, [0, 0, 0, 0, ID, 44]), 43)
check(app(elim, [ID, 0, 0, 0, 0, [55]]), 55)
check(app(elim, [ID, 0, TRU, 0, 0, [55,66]]), 55)
check(app(elim, [ID, 0, FAL, 0, 0, [55,66]]), 66)





console.log(".")

