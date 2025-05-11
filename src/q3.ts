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

const expToJS = (exp: Exp | Program): string => (
  isProgram(exp)
    ? exp.exps.map(expToJS).join(";\n")
  : isDefineExp(exp)
    ? `const ${exp.var.var} = ${expToJS(exp.val)}`
  : isNumExp(exp)
    ? `${exp.val}`
  : isBoolExp(exp)
    ? (exp.val ? "true" : "false")
  : isStrExp(exp)
    ? `"${exp.val}"`
  : isVarRef(exp)
    ? exp.var
  : isIfExp(exp)
    ? `(${expToJS(exp.test)} ? ${expToJS(exp.then)} : ${expToJS(exp.alt)})`
  : isProcExp(exp)
    ? `((${exp.args.map((a: VarDecl) => a.var).join(",")}) => ${expToJS(exp.body[0])})`
  : isAppExp(exp)
    ? (
        isPrimOp(exp.rator)
          ? (
              exp.rator.op === "not"
                ? `(!${exp.rands.map(expToJS)[0]})`
              : exp.rator.op === "and"
                ? `(${exp.rands.map(expToJS).join(" && ")})`
              : exp.rator.op === "or"
                ? `(${exp.rands.map(expToJS).join(" || ")})`
              : exp.rator.op === "="
                ? `(${exp.rands.map(expToJS).join(" === ")})`
              : exp.rator.op === "eq?"
                ? `(${exp.rands.map(expToJS).join(" === ")})`
              : exp.rator.op === "number?"
                ? `(typeof ${exp.rands.map(expToJS)[0]} === "number")`
              : exp.rator.op === "boolean?"
                ? `(typeof ${exp.rands.map(expToJS)[0]} === "boolean")`
              : ["+", "-", "*", "/", "<", ">"].includes(exp.rator.op)
                ? `(${exp.rands.map(expToJS).join(" " + exp.rator.op + " ")})`
              : `${expToJS(exp.rator)}(${exp.rands.map(expToJS).join(",")})`
            )
            : `${expToJS(exp.rator)}(${exp.rands.map(expToJS).join(",")})`
      )
    : ""
)