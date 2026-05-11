// back to more plan like true homoiconic

type F =  {meta: Val, arity: number, body: Val}
type Val = number | [Val, Val] | F 

const law = (arity:number, meta:Val, body:(v:(n:number)=>Val, n:(n:number)=>Val)=>Val):Val=> ({arity: arity+1, meta, body : body(v=> v + 2 + 1, n=> n + 2 + 1 + arity)})

const elim = <T>(law: (arity:number, meta:Val, body:Val)=> T, app: (f:Val, arg:Val) => T, n: (n:number)=>T,) =>
  (o:Val):T=> typeof o == "number" ? n(o) : "arity" in o ? law(o.arity, o.meta, o.body) : app(o[0], o[1])

const fmt = (x:any) => JSON.stringify(x, null, 2)
const app = (f:Val, args:Val[]):Val=> args.reduce((p,c)=> [p,c], f)

const call = (t: Val,a:number, f:(...args:Val[])=>Val, args:Val[]):Val=>
  (a - 1 > args.length) ? app(t, args) : whnf(app(f(t, ...args.slice(0, a-1)), args.slice(a-1)))

const MKLAW: Val = 0
const ELIM: Val = 1
const SELF: Val = 2


let DEBUG = false

const log = <T>(tag:string, x:T):T=> DEBUG ? (console.log(tag, fmt(x)), x) : x

const subst = (t:Val, args:Val[]):Val=>elim<Val>(
  FN => t,
  (f,a)=> [subst(f, args), subst(a, args)],
  n => n < 2 ? n : args[n-2] ?? n-2-args.length,
)(t)

const exf = (t:Val, args: Val[]):Val=> elim<Val>(
  (a, _, b) => call(t, a, (...args:Val[])=> log("SUBSTD:", subst(b, args)), [ ...args]),
  (f,a) => exf(f, [a,...args]),
  n=> n == MKLAW ? call(t, 3, (a,m,b)=> law(a as number,m,_=>b), args)
    : n == ELIM ? call(log("ELIM " + fmt(args),t), 6, (s,l,a,z,m,o)=> elim<Val>(
        (a, m, b) => app(l, [a,m,b]),
        (f, x) => app(a, [f,x]),
        n => n == 0 ? z : app(m,[n-1]))(o), args)
    : app(t, args)
)(t)

const whnf = (t:Val):Val=>exf(t, [])
const demo = (t:Val, expext?:Val)=>{
  console.log(`OUTPUT: ${fmt(whnf(t))}\n`)
  if (expext !== undefined)
    if (fmt(whnf(t)) != fmt(expext)) console.error(`Expected ${fmt(expext)}`)
}


let TRU: Val = law(2, 0, v=>v(0))
let FAL: Val = law(2, 0, v=>v(1))
let ID: Val = law(1, 0, v=>v(0))
let Consum: Val = law(1, 0, v=> SELF)

demo(TRU, TRU)
demo(app(TRU,[22]), [TRU,22])
demo(app(TRU,[22,33]), 22)
demo(app(FAL, [22,33]), 33)
demo(app(ID, [42]), 42)
demo([22,33], [22,33])
demo(app(ID, [44, 55]), [44, 55])
demo(app(Consum, [0, 22, 33]), Consum)

let foo : Val = law(1, 0, (v,n)=> app(n(22),[n(33), v(0)]))

let t = app(foo, [0])

demo(t)

const prv: Val = law(1, 0, (v,n)=> app(ELIM, [ 0, 0, n(0), ID, v(0),]))



t = app(prv, [0])


console.log("T:", fmt(t))

demo(t)

const λ = (f: (...args:Val[])=>Val): F => {
  let arity = f.length
  let meta = 0
  let body = f(...Array.from({length: arity}, (_,i)
}
