import {
  Exp, Program,
} from "./L3/L3-ast";
import {
  isProgram, isDefineExp, isNumExp, isBoolExp, isStrExp,
  isPrimOp, isVarRef, isAppExp, isIfExp, isProcExp
} from "./L3/L3-ast";
import { VarDecl } from "./L3/L3-ast";
import { Result, makeOk } from "./shared/result";

/*
Purpose: Transform L2 AST to JavaScript program string
Signature: l2ToJS(l2AST)
Type: [EXP | Program] => Result<string>
*/
export const l2ToJS = (exp: Exp | Program): Result<string> =>
  makeOk(expToJS(exp));

/* Main translator */
const expToJS = (exp: Exp | Program): string => (
  // program  →  statement; statement; …
  isProgram(exp) ? exp.exps.map(expToJS).join(";\n") :

  // (define x e)  →  const x = e
  isDefineExp(exp) ? `const ${exp.var.var} = ${expToJS(exp.val)}` :

  // literals
  isNumExp(exp) ? `${exp.val}` :
  isBoolExp(exp) ? (exp.val ? "true" : "false") :
  isStrExp(exp) ? `'${exp.val}'` :

  // stand-alone primitive
  isPrimOp(exp)
    ? (exp.op === "number?"
        ? "((x) => typeof(x) === 'number')"
        : exp.op === "boolean?"
          ? "((x) => typeof(x) === 'boolean')"
          : exp.op) :

  // variable reference
  isVarRef(exp) ? exp.var :

  // if  →  ternary
  isIfExp(exp)
    ? `(${expToJS(exp.test)} ? ${expToJS(exp.then)} : ${expToJS(exp.alt)})` :

  // lambda  →  arrow fn
  isProcExp(exp)
    ? `((${exp.args.map((a: VarDecl) => a.var).join(",")}) => ${expToJS(exp.body[0])})` :

  // application
  isAppExp(exp) ? (
    isPrimOp(exp.rator) ? (
      exp.rator.op === "not"
        ? `(!${expToJS(exp.rands[0])})`
      : exp.rator.op === "and"
        ? `(${exp.rands.map(expToJS).join(" && ")})`
      : exp.rator.op === "or"
        ? `(${exp.rands.map(expToJS).join(" || ")})`
      : ["=", "eq?"].includes(exp.rator.op)
        ? `(${exp.rands.map(expToJS).join(" === ")})`
      : ["+", "-", "*", "/", "<", ">"].includes(exp.rator.op)
        ? `(${exp.rands.map(expToJS).join(" " + exp.rator.op + " ")})`
      // number?  →  arrow-call form
      : exp.rator.op === "number?"
        ? (isVarRef(exp.rands[0])
            ? (v => `((${v}) => typeof(${v}) === 'number')(${v})`)
                (expToJS(exp.rands[0]))
            : (arg => `((x) => typeof(x) === 'number')(${arg})`)
                (expToJS(exp.rands[0])))
      // boolean? →  arrow-call form
      : exp.rator.op === "boolean?"
        ? (isVarRef(exp.rands[0])
            ? (v => `((${v}) => typeof(${v}) === 'boolean')(${v})`)
                (expToJS(exp.rands[0]))
            : (arg => `((x) => typeof(x) === 'boolean')(${arg})`)
                (expToJS(exp.rands[0])))
      // other primitives: treat as ordinary function call
      : `${expToJS(exp.rator)}(${exp.rands.map(expToJS).join(",")})`
    )
    // user-defined procedure call
    : `${expToJS(exp.rator)}(${exp.rands.map(expToJS).join(",")})`
  )

  // unreachable
  : ""
);