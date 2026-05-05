
// var by object identity, using copy
// serializing obj
type Var = {$:"var", name:string}
type Term = Var | {$:"lam", var:Var, body:Term} | {$:"app", f: Term, arg:Term} | {$:"str", val:string} | {$:"ser"}

const fmt = (t:Term):string => {
  let vars = new Map<Var, string>()
  let names = new Set<string>()
  let getname = (v:Var):string=>{
    if (!vars.has(v)){
      let n = v.name
      let ctr = 0
      while(names.has(n)){
        n = v.name + ctr++
      }
      names.add(n)
      vars.set(v, n)
    }
    return vars.get(v)!
  }
  let go = (t:Term):string=>{
    if (t.$ == "var") return getname(t)
    if (t.$ == "lam") return `λ${go(t.var)}.${go(t.body)}`
    let ts = ''
    let f:Term = t
    if (t.$ == "ser") return "ser"
    if (t.$ == "str") return `"${t.val}"`
    while(f.$ == "app"){
      ts = go(f.arg) + ', ' + ts
      f = f.f
    }
    return `(${go(f)}, ${ts.slice(0,-2)})`
  }
  return go(t)
}

const log = (x:any) => console.log(fmt(x as Term))

type fune = (x:Term)=>Term | fune

const λ = (f:fune):Term=>{
  let name = f.toString().match(/^\s*\(?\s*([a-zA-Z0-9_$]+)\s*\)?\s*=>/)![1]!
  let v:Var = {$:"var", name}
  let body = f(v)
  if (typeof body == "function") body = λ(body)
  return {$:"lam", var:v, body}
}

const app = (f:Term, ...args:Term[]):Term => args.reduce((acc, arg) => ({ $:"app", f: acc, arg}), f)

const ser:Term = {$:"ser"}
const str = (val:string):Term => ({$:"str",val})

let copy = (t:Term) : Term=>{
  let env = new Map<Term, Term>()
  let go = (t:Term):Term=>{
    if (!env.has(t)){
      if (t.$ == "lam"){
        let v:Var ={...t.var}
        env.set(t.var, v)
        let res:Term = {$:"lam", var:v, body: go(t.body)}
        env.set(t, res)
      }
      if (t.$ == "app"){
        let res:Term = {$:"app", f: go(t.f), arg: go(t.arg)}
        env.set(t, res)
    }}
    return env.get(t) ?? t
  }
  return go(t)
}


let run = (t:Term):Term=>{
  let replace = (t:Term, v:Term, val:Term):Term=>{
    if (t.$ == "var") return t == v ? copy(val) : t
    if (t.$ == "lam"){
      return {$:"lam", var:t.var, body: replace(t.body, v, val)}
    }
    if (t.$ == "ser" || t.$ == "str") return t
    return {$:"app", f: replace(t.f, v, val), arg: replace(t.arg, v, val)}
  }

  let go = (t:Term):Term=>{
    if (t.$ == "app"){
      let f = go(t.f)
      if (f.$ == "lam") return go(replace(f.body, f.var, t.arg))
      if (f.$ == "ser") return str(fmt(t.arg))
      return {$:"app", f, arg: go(t.arg)}
    }
    if (t.$ == "lam") return {$:"lam", var:t.var, body: go(t.body)}
    return t
  }
  return go(t)
}




// let on = λ(f=>x=>app(f,x))
// let tw = λ(f=> x=> app(f, app(f, x)))
// log(tw)
// log(run(app(tw, tw)))
// let s = λ(n=>f=>x=>app(f, app(n,f,x)))
// log(s)
// log(run(app(s, on)))
// let add = λ(m=>n=>f=>x=>app(m,f, app(n,f,x)))
// log(add)
// log(run(app(add, on, tw)))

log(str("ee"))
log(run(app(ser, λ(x=>x))))
