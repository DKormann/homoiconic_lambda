
// OLD FILE, NOT USED ANYMORE. SEE lc_lifted.ts

`

try HOAS and compiling it to native JS.

`

import { hash as chash } from "crypto"

type App = [Term, ...Term[]]
type Func= (...x:Term[]) => Term
type Prim = number | string
type Var = {id:number}
type Term = Var | Prim | App | Func
type Tag = "var" | "prim" | "func" | "app" 

const match =  <T>(app: (v:App)=>T,func: (v:Func)=>T, prim: (v:Prim)=>T, var_: (v:Var)=>T) => (t:Term) =>
  (typeof (t) == "object" ? ((Array.isArray(t)) ? app : var_): (typeof t == "function") ? func : prim)(t as any)
const runhash = (t:string | null | number):string=> chash("sha1", String(t)).slice(0,10)
const hashed =new  WeakMap<Term & Object, string>  ()
const add:Func = (x,y) => (run(x) as number) +  (run(y) as number)
const T:Func = (t,f) => t
const F:Func = (t,f) => f
const EQ:Func = (x:Term,y:Term) => (hash(run(x)) == hash(run(y))) ? T:F

const getBody = (f:Func) => Lib.includes(f) ? ()=>{throw new Error("Cannot get body of primitive function")} : f(...Array.from({length:f.length}).map((x,id)=>({id})))

const hash = (t:Term)=>{
  if (typeof t == "string" || typeof t == "number") return runhash(JSON.stringify(t))
  if (!hashed.has(t)){
    hashed.set(t, runhash(match(
      a=> "@" + a.map(hash).join(","),
      f=> Lib.includes(f) ? f.name : "λ" + f.length + "." + hash(getBody(f)),
      p=> "p" + String(p),
      v=> "v" + v.id,
    )(t)))
  }
  return hashed.get(t)!
}
const fmt = (t:Term):string => {
  let defs = new Map<string,[string,number, string]> ()

  let fmtBod : (t:Term)=>string = match(
    a => `[${a.map(fmtBod).join(", ")}]`,
    f => fmtFunc(f),
    JSON.stringify,
    v => "x"+v.id
  )

  let fmtFunc = (f:Func):string =>{
    if (Lib.includes(f)) return f.name
    if (!defs.has(hash(f))){
      let name = f.name || "F"
      let ctr = 0;
      while (defs.values().some(([n,l,c])=> n == name)){name = ((f.name || "F" ) + ++ ctr )}
      defs.set(hash(f), [name, f.length, fmtBod(getBody(f))])
    }
    return defs.get(hash(f))![0]
  };

  const main = fmtBod(t)
  return (defs.size ? Array.from(defs.values()).map(([n,length,b])=> `const ${n} = (${Array.from({length}).map((_,i)=>"x"+i)}) => ${b}`).join("\n") + "\n" : "")  + main
}


const fmtBod = (t:Term):string => match(
  a => `[${a.map(fmtBod).join(", ")}]`,
  f => f.name ?? "<>",
  JSON.stringify,
  v => "x"+v.id
)(t)

let log = (t:Term) => console.log(fmt(t))



const run = (t:Term):Term=>{
  const step = (t:Term):Term => {
    return match<Term>(
      app => {
        let [f, ...args] = app
        return match<Term>(
          app=>step([...app, ...args]),
          f => {
            if (args.length >= f.length) {
              let out = f(...args.slice(0, f.length))
              return step(f.length == args.length ? (out) : [out, ...args.slice(f.length)])
            }
            return app
          },
          p=> p,
          v=> v
        )((f))
      },
      f=>f, p=>p, v=>v
    )(t)
  }

  return step(t)

}

let FV : (t:Term)=>Var[] = match(
  a=> Array.from(new Set(a.map(FV).flat())),
  f=>{
    let vs = Array.from({length:f.length}).map((x,id)=>({id}))
    return FV(f(...vs)).filter(x=>!vs.includes(x))
  },
  p=> [],
  v=> [v],
)


let lift = (f:Func):Term=>{

  let args:Var[] = Array.from({length:f.length}).map((x,id)=>({id}))

  let body = f(...args)

  let free = FV(body)

  free.forEach((v,i)=>v.id=i)

}


const Lib = [add, EQ, fmt]






// const ex = (...t:App)=> log(run(t))

// // 1 + 2 ~> 3
// ex(add, 1,2)

// ex((x=>[add,x,1]), 1)

// // ((x,y)=>x+y) (1,2) ~> 3
// ex((x,y)=>[add, x , y], 1,2)

// // fmt((add, 1)) ~> "[add, 1]"
// ex(fmt, [add, 1])

// // if 1 == 2 then 22 else 33 ~> 33
// ex(EQ, 1, 2, 22, 33)

// // if (1+1) == 2 then "yes" else "no" ~> "yes"
// ex(EQ, [add, 1, 1], 2, "yes", "no")

// const eq = (x:Term, y:Term):Term => [EQ, x, y, 1, 0]
// const ifelse = (c:Term, t:Term, f:Term):Term => [EQ, c, 0, f, t]

// // eq(12, 12) ~> 1
// ex(eq, 12,12)

// // ifelse (eq(12, 12)) ~> 22
// ex(ifelse, [eq, 12, 12], 22, 33)


// const YP:Func = (f, g) => [f,[g,g]]
// const Y:Func = F => [[YP, F], [YP, F]]

// log(Y)

// const _sub:Func = (f, x, y) => [[EQ, y, 0, x,[add,-1,[f,x, [add, y,-1]]]]]
// const sub: Term = [Y, _sub]


// ex(sub, 5, 2)
// console.log(".")

