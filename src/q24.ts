import {
    Program, Exp, CExp, DictExp, DictEntry,
    isDefineExp, isDictExp,
    isIfExp, isProcExp, isAppExp, isLetExp, isLitExp,
    makeDefineExp, makeProgram, makeAppExp, makeVarRef, makeLitExp,
    makeIfExp, makeProcExp, makeLetExp,
    isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef
} from './L32/L32-ast';

import {
    makeCompoundSExp, makeEmptySExp, SExpValue
} from './L32/L32-value';

import { map } from "ramda";

/*
Purpose: rewrite all occurrences of DictExp in a program to AppExp.
Signature: Dict2App (exp)
Type: Program -> Program
*/
export const Dict2App = (prog: Program): Program =>
    makeProgram(map(rewriteAllDictExp, prog.exps));

/*
Purpose: Rewrite a single DictExp into AppExp form
Signature: rewriteDict(e)
Type: DictExp -> AppExp
*/
const rewriteDict = (e: DictExp): CExp =>
    makeAppExp(makeVarRef("dict"),
               [makeLitExp(entriesToCompoundSExp(e.entries))]);

/*
Purpose: Rewrite a top-level DefineExp or CExp
Signature: rewriteAllDictExp(exp)
Type: Exp -> Exp
*/
const rewriteAllDictExp = (exp: Exp): Exp =>
    isDefineExp(exp)
        ? makeDefineExp(exp.var, rewriteAllDictCExp(exp.val))
        : rewriteAllDictCExp(exp);

/*
Purpose: Recursively rewrite DictExp into AppExp in any CExp
Signature: rewriteAllDictCExp(exp)
Type: CExp -> CExp
*/
const rewriteAllDictCExp = (exp: CExp): CExp =>
    isDictExp(exp) ? rewriteDict(exp) :
    isIfExp(exp)   ? makeIfExp(rewriteAllDictCExp(exp.test),
                               rewriteAllDictCExp(exp.then),
                               rewriteAllDictCExp(exp.alt)) :
    isAppExp(exp)  ? makeAppExp(rewriteAllDictCExp(exp.rator),
                                map(rewriteAllDictCExp, exp.rands)) :
    isProcExp(exp) ? makeProcExp(exp.args,
                                 map(rewriteAllDictCExp, exp.body)) :
    isLetExp(exp)  ? makeLetExp(exp.bindings.map(b => ({
                                ...b, val: rewriteAllDictCExp(b.val)
                              })),
                                map(rewriteAllDictCExp, exp.body)) :
    isLitExp(exp)  ? makeLitExp(exp.val) :
    exp;

/*
Purpose: Convert list of DictEntry to nested compound S-expression
Signature: entriesToCompoundSExp(entries)
Type: DictEntry[] -> SExpValue
*/
export const entriesToCompoundSExp = (entries: DictEntry[]): SExpValue =>
    entries.reduceRight<SExpValue>(
        (acc, entry) =>
            makeCompoundSExp(
                makeCompoundSExp(entry.key, quoteCExpToSExp(entry.val)),
                acc
            ),
        makeEmptySExp()
    );

/*
Purpose: Convert a CExp to a quoted SExpValue
Signature: quoteCExpToSExp(e)
Type: CExp -> SExpValue
*/
const quoteCExpToSExp = (e: CExp): SExpValue =>
    isNumExp(e) ? e.val :
    isBoolExp(e) ? e.val :
    isStrExp(e) ? e.val :
    isLitExp(e) ? e.val :
    isPrimOp(e) ? e :
    isVarRef(e) ? { tag: "SymbolSExp", val: e.var } :
    (() => { throw new Error(`Cannot quote non-literal expression: ${e.tag}`); })();
/*
Purpose: Recursively apply a transformer function to all subexpressions in a CExp
Signature: mapCExp(e, f)
Type: (CExp, CExp -> CExp) -> CExp
Note: Not needed directly in current code, but included for completeness
*/
const mapCExp = (e: CExp, f: (e: CExp) => CExp): CExp =>
    isIfExp(e) ? makeIfExp(f(e.test), f(e.then), f(e.alt)) :
    isAppExp(e) ? makeAppExp(f(e.rator), map(f, e.rands)) :
    isProcExp(e) ? makeProcExp(e.args, map(f, e.body)) :
    isLetExp(e) ? makeLetExp(e.bindings.map(b => ({ ...b, val: f(b.val) })), map(f, e.body)) :
    isLitExp(e) ? makeLitExp(e.val) :
    e;


/*
Purpose: Transform L32 program to L3
Signature: L32ToL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog : Program): Program =>
    //@TODO
    makeProgram([]);
