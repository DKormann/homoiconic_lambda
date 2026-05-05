`

concept of lifted lambda language for native JS interop.

using eager evaluation, native value level and AST level for homoiconicity

you can imagine using the ast to generate JS code and executing some functions as native JS.

`
import { hash as chash } from "crypto"

type Tagged <$,srcs,arg> = {$:$, srcs:srcs, arg:arg}
type Var = Tagged<"var", [], number>
type App = Tagged<"app", [AST, ...AST[]], null>
type Lam= Tagged<"func", [AST], {name: string, length:number}>
type Prim = Tagged<"prim", [], string | number>
type AST = Prim | Lam | App | Var

type Fun = (...x:Val[])=>Val
type Val = Fun | [Val,...Val[]] | string | number
type Hash = string

const match = <T>(
  func:(b:AST,length:number, n: string)=>T,
  app:(f:AST, ...args:AST[])=>T,
  var_:(v:Var)=>T,
  prim:(v:string|number)=>T,
) => (t:AST) =>
    (t.$ == "var")? var_(t) 
  : (t.$ == "app")? app(...t.srcs)
  : (t.$ == "func")? func(t.srcs[0], t.arg.length, t.arg.name)
  : prim(t.arg)

const matchv = <T>(
  f: (f:Fun)=>T,
  a: (v:[Val, ...Val[]])=>T,
  p: (p:string | number)=>T,) => (v:Val) =>
    (typeof v == "function") ? f(v)
  : (typeof v == "object") ? a(v)
  : p(v)

const mk = <$ extends (AST & {arg:null})["$"], srcs extends (AST & {$:$})["srcs"]> ($:$, ...srcs:srcs) => ({$,srcs,arg:null} as AST & {$:$})
const mkarg =  <$ extends (AST)["$"], arg extends (AST & {$:$})["arg"],  srcs extends (AST & {$:$})["srcs"]> ($:$, arg:arg, ...srcs:srcs) => ({$,srcs,arg} as AST & {$:$})
const runhash = (t:string | null | number):string=> chash("sha1", String(t)).slice(0,10)
const hashed = new WeakMap<any, string>()
const hashT=(t:AST):string=>hashed.getOrInsertComputed(t, ()=>runhash(match((b,l)=> "func" + hashT(b) + l, ()=> "app" + t.srcs.map(hashT).join(","), v=>"v"+v.arg,JSON.stringify,)(t)))


const compile = (t:AST): string=>{
  let lines :string[] = []
  let defs = new Map<Hash, string>(Lib.map(f=>[hashT(toast(f)), f.name]))
  let go=(t:AST):String => match(
    (b,l,n)=> defs.getOrInsertComputed(hashT(t), h=>{
      let name = n || "λ"
      let ctr = 0;
      while (defs.values().some(v=>v == name)){name = (n || "λ") + ++ctr}
      defs.set(h,name)
      lines.push(`const ${name} = (${Array.from({length:l}, (_,i)=>"v"+i).join(", ")}) => ${go(b)}`)
      return name
    }),
    (...args)=> `[${[...args].map(go).join(", ")}]`,
    v=> "v"+v.arg,
    JSON.stringify,
  )(t)
  let r = go(t)
  return [...lines, "return "+ r].join("\n")
}

const toast = (v:Val ) : AST =>{

  type DepVal = {ast:AST, free:Var[]}
  let wraps = new Map<Val, DepVal>()

  let go : (v:Val)=>DepVal = matchv<DepVal>(
    f=>{
      if (wraps.has(f)) return wraps.get(f)!
      if (Lib.includes(f)) return {ast:mkarg("func", {name:f.name, length:f.length}, mk("app", mkarg("prim", `[builtin:${f.name}]`), mkarg("var", -1))), free:[]}
      let vars = Array.from({length:f.length}).map((x)=>mkarg("var", -1 ))
      let res = go(f(...vars.map(v=>{
        let $$s:Fun = ()=>0
        wraps.set($$s, {ast:v, free: [v]})
        return $$s  
      })))
      let free = res.free.filter(v=>!vars.includes(v))


      let clean  = (v:AST):AST=> match(
        ()=>v,
        ()=>mk("app", ...v.srcs.map(clean) as any),
        v=>mkarg("var", free.concat(vars).indexOf(v)), ()=>v
      )(v)
      let fun = mkarg("func", {name: f.name, length: f.length + free.length},clean(res.ast))
      return {ast: free.length ? mk("app", fun, ...free) : fun, free}
    },
    a=> {
      let rr = a.map(go)
      return {ast: mk("app", ...rr.map(r=>r.ast) as any), free: Array.from(new Set(rr.flatMap(r=>r.free)))}
    },
    p=> ({ast: mkarg("prim", p), free: []})
  )

  return go(v).ast

}

const ex = (v:Val,...args:Val[]):Val=>matchv(
  fn=>!args.length ? fn :(fn.length>args.length) ? [fn,...args] as Val
    : ex(fn(...args.slice(0,fn.length).map(x=>ex(x))), ...args.slice(fn.length)) as Val,
  a=>ex(...a,...args) as Val,
  p=>args.length? [p, ...args] as Val : p,
)(v);


` **** BUILTINS **** `

const unAst = (t:AST):Fun => (f,a,v,p)=> match(
  (b,l,n)=> [f, n, l, unAst(b)] as Val,
  (...xs)=> [a, xs.length, ...xs.map(unAst)] as Val,
  t=>[v, t.arg] as Val,
  t=>[p, typeof t, t] as Val,
)(t);

const unquote:Fun= v => unAst(toast(v))
const quote:Fun = v => (new Function("$", ...Lib.map(f=>f.name), v as string)(  ...Lib) as Val)


const add: Fun = (x,y) => (x as number)+(y as number)
const fmt:Fun=(t:Val):string=>compile(toast(t))

const T:Fun = (t,f)=>t
const F:Fun = (t,f)=>f
const eq:Fun = (x,y)=>(x === y ? T : F )
let Lib: Fun[] = [add, eq, unquote, quote];


` **** DEMO **** `

const Z:Fun= f=>[g=>[f,x=>[g,g,x]], g=>[f,x=>[g,g,x]]]


let demo = (t:Val)=>{
  t= new Function(...Lib.map(f=>f.name), compile(toast(t)))(...Lib) as Val
  
  [fmt(t),"~>", fmt(ex(t)),"\n"].map(x=>console.log(x))
}



demo([add,2])
demo([add,2,3])
demo([add, [add,2,3]])
demo([add, [add,2,3],4])
demo(Z)
demo([eq, [add, 1, 2], "3"])
demo([eq, [fmt,x=>x], [fmt, x=>2]])

const mul:Val = [Z,(f,x,y)=> [eq, x, 0, _=>0, _=>[add,[f,[add, x, -1], y], y], 0]]
demo ([mul, 4, 3])


demo([unquote, add, 0,((nm, l, b)=>[add,"name:",nm]), 0,0])
demo([unquote, add, 0,((nm, l, b)=>[add,"len:",l]), 0,0])
demo([quote, "return (x,y) => [add,x]"])


// const consumeN:Val = K=>[Z, (f,x)=>[eq, x, 0, _=>K, _=>_=>[f, [add, -1, x]] , 0]]

// demo([consumeN, 4, 0,0,0,0])

// let ls : Val = [0, 0,1,2,3,4]

// let getlen:Fun = ls=>[unquote, ls, 0, l=>[consumeN, l, l], 0,0]

// demo([getlen, ls])

// demo([[1,2],3])


