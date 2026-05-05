
// var by object identity, using copy
type Var = {$:"var", name:string}


type Lam = {$:"lam", vname:string, f:(t:Term)=>Term}
type Term =
// Var |
Lam | {$:"app", f: Term, arg:Term}

const fmt = (t:Term):string => {
  let vars = new Map<Lam, string>()
  let names = new Set<string>()
  let getname = (v:Lam):string=>{
    if (!vars.has(v)){
      let n = v.vname
      let ctr = 0
      while(names.has(n)){
        n = v.vname + ctr++
      }
      names.add(n)
      vars.set(v, n)
    }
    return vars.get(v)!
  }
  let go = (t:Term):string=>{
    // if (t.$ == "var") return getname(t)
    // if (t.$ == "lam") return `λ${go(t.var)}.${go(t.body)}`
    if (t.$ == "lam") {
      return `λ${getname(t)}.${go(t.body)}`
    }
    let ts = ''
    let f:Term = t
    while(f.$ == "app"){
      ts = go(f.arg) + ', ' + ts
      f = f.f
    }
    return `(${go(f)}, ${ts.slice(0,-2)})`
  }
  return go(t)
}

const log = (x:any) => console.log(fmt(x as Term))

const FV = (t:Term):Set<string>=>{
  if (t.$ == "var") return new Set([t.name])
  if (t.$ == "lam") return new Set([...FV(t.body)])
  return new Set([...FV(t.f), ...FV(t.arg)])
}


type fune = (x:Term)=>Term | fune

const λ = (f:fune):Term=>{
  let name = f.toString().match(/^\s*\(?\s*([a-zA-Z0-9_$]+)\s*\)?\s*=>/)![1]!
  let v:Var = {$:"var", name}
  let body = f(v)
  if (typeof body == "function") body = λ(body)
  return {$:"lam", var:v, body}
}

const app = (f:Term, ...args:Term[]):Term => args.reduce((acc, arg) => ({ $:"app", f: acc, arg}), f)

let replace = (t:Term, v:Term, val:Term):Term=>{
  if (t.$ == "var") return t == v ? val : t
  if (t.$ == "lam"){
    return {$:"lam", var:t.var, body: replace(t.body, v, val)}
  }
  return {$:"app", f: replace(t.f, v, val), arg: replace(t.arg, v, val)}
}


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
    return {$:"app", f: replace(t.f, v, val), arg: replace(t.arg, v, val)}
  }

  let go = (t:Term):Term=>{
    if (t.$ == "app"){
      let f = go(t.f)
      if (f.$ == "lam"){
        return go(replace(f.body, f.var, t.arg))
      }
      return {$:"app", f, arg: go(t.arg)}
    }
    if (t.$ == "lam") return {$:"lam", var:t.var, body: go(t.body)}
    return t
  }

  return go(t)
}




let on = λ(f=>x=>app(f,x))
let tw = λ(f=> x=> app(f, app(f, x)))
log(tw)
log(run(app(tw, tw)))

let s = λ(n=>f=>x=>app(f, app(n,f,x)))

log(s)
log(run(app(s, on)))

let add = λ(m=>n=>f=>x=>app(m,f, app(n,f,x)))

log(add)
log(run(app(add, on, tw)))
