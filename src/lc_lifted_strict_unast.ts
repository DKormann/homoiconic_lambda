`

concept of lifted lambda language for native JS interop.

using eager evaluation, native value level and AST level for homoiconicity

you can imagine using the ast to generate JS code and executing some functions as native JS.

`

import {hash as chash} from "bun"

type Fun = (...x:Val[])=>Val
type Prim = string | number
type Val = Fun | [Val,...Val[]] | Prim

const matchF = <T>(
    f: (f:Fun, islib:number)=>T,
    a: (a:[T,...T[]])=>T,
    p: (p:Prim)=>T,
    vr: (n:number)=>T
  ) => (t:Val):T => {
  let vars = typeof t == "function" ? Array.from(t as any).map(_=> (()=>0) as Val) : []
  let go = (v:Val):T=>
    (typeof v == "function") ? ( vars.includes(v) ? vr(vars.indexOf(v)): f(v, Object.values(Lib).includes(v) ? 1 : 0))
  : (Array.isArray(v)) ? a(v.map(go) as [T,...T[]]) : p(v)
  return go( typeof t == "function" ? t(...vars) : t)
}

const hashed = new WeakMap<Fun, string>()
const hash = (t:Fun):string=>
  hashed.getOrInsertComputed( t,
    ()=> String(chash("fun" + t.length  + ":" + matchF <string>(
      (f,l)=> l ? "lib" + f.name : hash(f),
      a=> "[" + a.join(",") + "]",
      p=>"p"+JSON.stringify(p),
      n=>"v"+n,
  )(t))))

type AST = ["app", [AST, ...AST[]]] | ["val", Val] | ["var", number]

const compile :Fun = (l, ast) => {
  if (typeof l != "number") return "ERROR"
  let func = (...args:Val[])=>{
    if (args.length != l) throw new Error(`Expected ${l} arguments, got ${args.length}`)
    let go = (q:AST):Val =>
      ! Array.isArray(q) ? "ERROR"
      : q[0] == "app" ? q[1].map(x=>go(x)) as Val
      : q[0] == "val" ? q[1]
      : q[0] == "var" ? args[q[1]]!
      : "ERROR"
    return go(ast as AST)
  }
  let vars = `${Array.from({length: l as number}, (_,i)=>"v"+i).join(", ")}`
  return new Function("func", `return (${vars})=> func(${vars})`)(func)
}

const decompile: Fun = (v):[number, AST]=>{
  if (typeof v != "function") throw new Error("Expected a function")
  let vars = Array.from(v as any).map(_=>(()=>0) as Val)
  let go = (v:Val):AST =>
    typeof v == "function" ? (vars.includes(v) ? ["var", vars.indexOf(v)] : ["val", v])
    : (Array.isArray(v)) ? ["app", v.map(go) as [AST, ...AST[]]] : ["val", v]
  return [v.length, go(v(...vars))]
}


const add :Fun = (x,y)=> (x as number)+(y as number)
const length:Fun = (x)=>( typeof x == "function" || Array.isArray(x) ? x.length : 0  )
const Lib: {[key:string] : Fun} = {
  length,
  add,
  compile, uncompile: decompile,
}



const ex = (f:Val, ...args:Val[]) : Val =>
  (typeof f == "function") ?
    !args.length ? f
      : (args.length < f.length) ? [f, ...args]
      : ex(f(...args.slice(0, f.length).map(x=>ex(x))), ...args.slice(f.length))
  : (Array.isArray(f)) ? ex(...f, ...args)
  : args.length ? [f, ...args] : f


console.log(ex((x,y)=>x, 2, 3))
console.log(ex(add, 2,3))
console.log(ex(add, [add, 1,2],3))

console.log(ex( 1, 2,3, 4))
console.log(ex( [1], 2,3, 4))
console.log(ex( length , [2,3, 4]))
console.log(ex( length , [2,3, 4], 22))

console.log(ex(compile(2, ["app", [["val", add], ["var", 0], ["var", 1]]]) , 2,3))


{
  type Sys<S> = S & {print: (x:string)=>void}
  type IO = <S>(x:Sys<S>) => Sys<S>
  const println  = (s:string):IO => x=>{x.print(s); return x}
  const hello : IO = println("HELLO")
  const world : IO = println("WORLD")
  let chain = <T>(...f:((x:T)=>T)[]) => (x:T):T => f.reduce((a,c)=>c(a), x)
  const main : IO = chain(hello, world)
}
