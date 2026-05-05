// hoas implementation of LC
type Lam = {$:"lam", f:(x:Term)=>Term, name:string}
type App = {$:"app", f:Term,x:Term}
type Typ = {$:"typ", t:Lam | App}

type Term = Lam | App

type AppS = [Syn, Syn, ...Syn[]]
type LamS = (...x:Syn[])=>Syn
type Syn = AppS | LamS | Term

let argnames = (f:Function):string[]=>{
  let st = f.toString()
  if (st.startsWith("(")){
    st = st.split(")")[0]!.slice(1)
  }
  return st.split(/\s*,\s*/)
}


let p = (t:Syn):Term=>{
  if (t instanceof Array){
    let [f, ...args] = t
    return args.reduce((acc:Term, arg) => ({$:"app", f: acc, x: p(arg)}), p(f))
  }
  if (t instanceof Function){
    let names = argnames(t)
    let mmk = (ctx:Term[]):Term => {
      if (ctx.length == t.length) return p(t(...ctx))
      return {
        $:"lam",
        name: names[ctx.length]!,
        f: (x:Term) => mmk([...ctx, x])
      }
    }
    return mmk([])
  }
  return t
}


let fmts = (s:Term):string =>{

  let names = new Set<string>()
  let vars = new Map<Syn, string>()
  let getname = (s:Lam):string=>{
    
    if (s.name == "<var>") throw new Error("unnamed lam")
    let n = s.name
    let ctr = 0
    while (names.has(n)){n = s.name + ctr++}
    names.add(n)
    return n
  }

  let go = (s:Term):string =>{
    if (vars.has(s)) return vars.get(s)!
    if (s.$ == "lam") {
      let st = ''
      while (s.$ == "lam" && !vars.has(s)){
        let n = getname(s)
        st += n + ', '
        let v:Term = {$:"lam", f: x=>x, name: "<var>"}
        vars.set(v, n)
        s = s.f(v)
      }
      return `(${st.slice(0, -2)}) => ${go(s)}`
    }
    let st = ''
    while (s.$ == "app"){
      st = ', ' + go(s.x) + st
      s = s.f
    }
    return `[${go(s)}${st}]`
  }
  return go(s)
}

let fmt= (x:Syn):string => fmts(p(x))
let log = (x:Syn) => console.log(fmt(x))

let s:Syn = (x,y)=>z=>[x,y,z]



let run = (t:Syn):Term=>{
  let go = (t:Term):Term=>{
    if (t.$ == "app"){
      let f = go(t.f)
      if (f.$ == "lam") return go(f.f(go(t.x)))
      return {$:"app", f, x: go(t.x)}
    }
    return {$:"lam", name: t.name, f: x=>go(t.f(x))}
  }

  return go(p(t))
}


let t:Syn = [x=>x, y=>y]
let r = run(t)

// log(r)


// console.log(r.$, r.f.toString())





