`

concept of lifted lambda language for native JS interop.

we handle to levels of representation, the ast and the HOAS version.

you can imagine using the ast to generate JS code and executing some functions as native JS.

`
import { hash as chash } from "crypto"

type Tagged <$,srcs,arg> = {$:$, srcs:srcs, arg:arg}
type Var = Tagged<"var", [], null>
type App =  Tagged<"app", [AST, ...AST[]], null>
type Lam= Tagged<"func", [AST, ...Var[]], string|null>
type Prim = Tagged<"prim", [], string | number>
type AST = Prim | Lam | App | Var

type F = <V extends Val>(...x:V[])=>Val
type Val = F | {$app: [Val, ...Val[]] } | string | number

const match = <T>(app:(f:AST, args:AST[])=>T, func:(f:Lam, v:Var[], b:AST, n: string|null)=>T, prim:(v:string|number)=>T, var_:(v:Var)=>T) =>
  (t:AST) => (t.$ == "var")? var_(t) :(t.$ == "app")? app(t.srcs[0], t.srcs.slice(1))
  :(t.$ == "func")? func(t,t.srcs.slice(1)as Var[], t.srcs[0], t.arg): prim(t.arg)

const fmtAst = (t:AST):string=> t.$ + ( t.arg == null ? "" : " :: "+ t.arg) + (t.srcs.length ? ("\n"+t.srcs.map(fmtAst).join("\n")).replaceAll("\n", "\n  ") : "")

const matchv= <T>(f: (f:F)=>T,a: (f:Val, args:Val[])=>T,p: (p:string | number)=>T,) =>
  (v:Val) => (typeof v == "function") ? f(v) : (typeof v == "object") ? a(v.$app[0], v.$app.slice(1)) : p(v)

const runhash = (t:string | null | number):string=> chash("sha1", String(t)).slice(0,10)
const hashed = new WeakMap<any, string>()

type Hash = string
const hashT = (x:AST):Hash => hashed.getOrInsertComputed(x, (x:AST)=>runhash(x.$ + x.arg + x.srcs.map(dd=>hashT(dd)).join(",")))
const mkarg =  <$ extends (AST)["$"], arg extends (AST & {$:$})["arg"],  srcs extends (AST & {$:$})["srcs"]> ($:$, arg:arg, ...srcs:srcs) => ({$,srcs,arg} as AST & {$:$})
const mk = <$ extends (AST & {arg:null})["$"], srcs extends (AST & {$:$})["srcs"]> ($:$, ...srcs:srcs) => ({$,srcs,arg:null} as AST & {$:$})

const compile = (t:AST)=>{
  let defs:Map<Hash,[Lam, string]> = new Map(Lib.map(f=>{
    let l = toast(f) as Lam;
    return [hashT(l), [l, f.name]]
  }))
  let code = ""
  let gofunc = (f:Lam, vs:Var[], b:AST, name:string | null):string => {
    if (!defs.has(hashT(f))){
      let go : (t:AST)=>string = match(
        (f,args) => `$(${go(f)}, ${args.map(go).join(', ')})`,
        gofunc,
        JSON.stringify,
        v=> "x"+vs.indexOf(v)
      )
      let ctr = 0;
      name ||= "lam"
      while (defs.values().some(([,n])=> n == name)){name += ++ctr}
      defs.set(hashT(f), [f, name])
      let lin = `const ${name} = (${vs.map((_,i)=>"x"+i).join(", ")}) => ${go(b)}\n`
      code += lin
    }
    return defs.get(hashT(f))![1]
  }
  gofunc(mkarg("func", "main", t), [], t, "main")
  return code
}


const run = (v:Val, ...args:Val[]):Val => matchv(
  f=> (f.length > args.length) ? {$app: [v, ...args]} as Val
    : (f.length == args.length ? run(f(...args)): run(f(...args), ...args.slice(f.length))),
  (x,xs)=>run(x,...xs, ...args), p=>p )(v)


const FV : (t:AST)=>Var[] = match(
  (f,args)=> Array.from(new Set([...FV(f), ...args.flatMap(FV)])),
  (f, vs, bod) => FV(bod).filter(v=>!vs.includes(v)),
  p=>[], v=>[v]
)

const toast = (v:Val, ) : AST =>{

  let wraps = new Map<Val, AST>()
  let wrapAst = (t:AST)=>{
    let $$s:F = (...x)=>wrapAst(mk("app", t, ...x.map(x=>wraps.get(x)!)))
    wraps.set($$s,t)
    return $$s
  }

  let go : (v:Val)=>AST = matchv<AST>(
    f=>{
      if (wraps.has(f)) return wraps.get(f)!
      if (Lib.includes(f)) return mkarg("func", f.name, mkarg("prim", `[native:${f.name}]`))
      let vars = Array.from({length:f.length}).map(x=>mk("var"))
      let rval = f(...vars.map(x=>wrapAst(x)))
      let res = wraps.get(rval) ?? go(rval)
      let free = FV(res).filter(v=>!vars.includes(v))
      let ff = mkarg("func", f.name, res, ...free, ...vars)
      return free.length ? mk("app", ff, ...free) : ff
    },
    (f,args)=> mk("app", go(f), ...args.map(go)),
    p=>mkarg("prim", p)
  )
  return go(v)
}

const $ = (f:Val, ...args:Val[]):Val => ({$app: [f, ...args]});




    
` **** BUILTINS **** `


const add: F = (x,y) => (run(x) as number) + (run(y) as number)

const fmt=(t:Val):string=>compile(toast(t))
const hash:F = (x)=> hashT(toast(x))

const T:F = (t,f)=>t
const F:F = (t,f)=>f
const eq:F = (x,y)=>(run(x)==run(y) ? T : F )
let Lib: F[] = [add, hash, fmt, eq];


console.log(compile(toast(x=>y=>$(x,y))))

const mkadder:F = (x) => y => $(add, x,y)

console.log(compile(toast(mkadder)))




// ` **** DEMO **** `

// let demo = (t:Val) => console.log(fmt(t) + "~>\n" + fmt(run(t)))

// const YP:F = (f,g)=>$(f, $(g,g))
// const Y:F = f=> $($(YP, f), $(YP, f))

// demo($(add, 2,3) )
// demo($(hash, Y))
// demo($(fmt, Y))
// demo($(eq, 2, 3, 22,  33))

// const _neg: F = (self,x)=> $(eq, x, 0, 0, $(add, -1, $(self, $(add, x,-1))))
// const neg = $(Y, _neg)
// let t = $(neg, 5)

// demo(t)
// demo($(neg, 0))
// demo($(neg, 5))


// demo($(eq, 22, $(add, 20, 2), "yes", "no"))

// const sub:F = (x,y)=>$(add, x, $(neg, y))

// demo($(sub, 5, 2))



