import {
    Program, Exp, CExp, DictExp, DictEntry, isDefineExp, 
    isDictExp, isIfExp, isProcExp, isAppExp, isLetExp, isLitExp,
    makeDefineExp, makeProgram, makeAppExp, makeVarRef, 
    makeLitExp, makeIfExp, makeProcExp, makeLetExp, isNumExp, 
    isBoolExp, isStrExp, isPrimOp, isVarRef, unparseL32
} from './L32/L32-ast';

import { makeCompoundSExp, makeEmptySExp, SExpValue, makeSymbolSExp } from './L32/L32-value';

import { readFileSync } from 'fs';
import { parseL3 } from './L3/L3-ast';

import { map } from "ramda";

/*
Purpose: Rewrite all occurrences of DictExp in a program to AppExp.
Signature: Dict2App (prog)
Type: Program -> Program
*/
export const Dict2App = (prog: Program): Program =>
    // Apply transformation to every top-level expression
    makeProgram(map(rewriteAllDictExp, prog.exps));

/*
Purpose: Rewrite a single DictExp into AppExp form
Signature: rewriteDict(e)
Type: DictExp -> AppExp
*/
const rewriteDict = (exp: DictExp): CExp =>
    // Transform (dict (k v) ...) into (dict '<((k . v) ...)>) as an AppExp
    makeAppExp(
        makeVarRef("dict"),
        [makeLitExp(exp.entries
                    .map(({ key, val }) => makeCompoundSExp(key, quoteCExpToSExp(val)))
                    .reduce<SExpValue>((acc, pair) => makeCompoundSExp(pair, acc), makeEmptySExp()))]);

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
    isDictExp(exp)
        ? rewriteDict(exp)
    : isIfExp(exp)
        // Recursively transform all three branches
        ? makeIfExp(
            rewriteAllDictCExp(exp.test),
            rewriteAllDictCExp(exp.then),
            rewriteAllDictCExp(exp.alt))
    : isAppExp(exp)
        // If the rator is a raw dict or a dynamic expression that could produce one,
        // wrap the application in a (get ...) call. Otherwise, recurse as usual.
        ? isDictExp(exp.rator) || isIfExp(exp.rator) || isLetExp(exp.rator)
            ? makeAppExp(makeVarRef("get"), [rewriteAllDictCExp(exp.rator), ...map(rewriteAllDictCExp, exp.rands)])
            : makeAppExp(rewriteAllDictCExp(exp.rator), map(rewriteAllDictCExp, exp.rands))
    : isProcExp(exp)
        // Recursively rewrite procedure body
        ? makeProcExp(exp.args, map(rewriteAllDictCExp, exp.body))
    : isLetExp(exp)
        // Rewrite let bindings and body
        ? makeLetExp(exp.bindings.map(b => ({...b, val: rewriteAllDictCExp(b.val)})), map(rewriteAllDictCExp, exp.body))
    : isLitExp(exp)
        ? makeLitExp(exp.val)
    : exp;

/*
Purpose: Convert list of DictEntry to nested compound S-expression
Signature: entriesToCompoundSExp(entries)
Type: DictEntry[] -> SExpValue
*/
export const entriesToCompoundSExp = (entries: DictEntry[]): SExpValue =>
    // Convert each entry to (key . value) and reduce them to a pair-list
    entries.map(({ key, val }) => makeCompoundSExp(key, quoteCExpToSExp(val)))
           .reduceRight<SExpValue>( (pair, acc) => makeCompoundSExp(pair, acc), makeEmptySExp());

/*
Purpose: Build a nested compound S-expression list (linked list)
Signature: makeCompoundSExpList(xs)
Type: SExpValue[] -> SExpValue
*/
export const makeCompoundSExpList = (xs: SExpValue[]): SExpValue =>
    // Reduce a JS array [x1, x2, ..., xn] into (x1 . (x2 . ... (xn . ())))
    xs.reduceRight((acc, x) => makeCompoundSExp(x, acc), makeEmptySExp());

/*
Purpose: Convert a CExp (compound expression) to its quoted S-expression form.
Signature: quoteCExpToSExp(e)
Type: CExp -> SExpValue
*/
export const quoteCExpToSExp = (exp: CExp): SExpValue =>
    isNumExp(exp) ? exp.val :
    isBoolExp(exp) ? exp.val :
    isStrExp(exp) ? exp.val :
    isLitExp(exp) ? exp.val :
    isPrimOp(exp) ? makeSymbolSExp(exp.op) :
    isVarRef(exp) ? makeSymbolSExp(exp.var) :
    // For compound expressions: use unparseL32 to turn into string, then parse as quoted literal and extract SExp
    (parseL3(`(L3 '${unparseL32(exp)})`) as any).value.exps[0].val;

/*
Purpose: Convert an entire L32 program into a valid L3 program by transforming dicts
Signature: L32toL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog: Program): Program =>
    makeProgram([
        ...((parseL3(`(L3 ${readFileSync("src/q23.l3", "utf-8")})`) as any).value.exps),
        ...Dict2App(prog).exps]);