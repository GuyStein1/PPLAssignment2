import {
    Program, Exp, CExp, DictExp, DictEntry,
    isDefineExp, isDictExp,
    isIfExp, isProcExp, isAppExp, isLetExp, isLitExp,
    makeDefineExp, makeProgram, makeAppExp, makeVarRef, makeLitExp,
    makeIfExp, makeProcExp, makeLetExp,
    isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef, VarDecl
} from './L32/L32-ast';

import {
    makeCompoundSExp, makeEmptySExp, SExpValue, makeSymbolSExp
} from './L32/L32-value';

import { readFileSync } from 'fs';
import { parseL3 } from './L3/L3-ast';
import { isOk } from './shared/result';

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
const rewriteDict = (e: DictExp): CExp =>
    // Transform (dict (k v) ...) into (dict '<((k . v) ...)>) as an AppExp
    makeAppExp(
        makeVarRef("dict"),
        [
            makeLitExp(
                e.entries
                    .map(({ key, val }) => makeCompoundSExp(key, quoteCExpToSExp(val)))
                    .reduce<SExpValue>(
                        (acc, pair) => makeCompoundSExp(pair, acc),
                        makeEmptySExp()
                    )
            )
        ]
    );

/*
Purpose: Rewrite a top-level DefineExp or CExp
Signature: rewriteAllDictExp(exp)
Type: Exp -> Exp
*/
const rewriteAllDictExp = (exp: Exp): Exp =>
    isDefineExp(exp)
        // If it's a define, transform the body
        ? makeDefineExp(exp.var, rewriteAllDictCExp(exp.val))
        // Otherwise it's just a CExp
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
        ? (() => {
            const newRator = rewriteAllDictCExp(exp.rator);        // Transform rator recursively
            const newRands = map(rewriteAllDictCExp, exp.rands);   // Transform all args

            // Determine if we need to insert a get (2 possible cases)
            const needsGetWrapper =
                // raw (dict ...) call
                isDictExp(exp.rator) ||     
                // dynamic dict from if/let  
                isIfExp(exp.rator) || isLetExp(exp.rator);         

            return needsGetWrapper
                ? makeAppExp(makeVarRef("get"), [newRator, ...newRands])
                : makeAppExp(newRator, newRands);
        })()
    : isProcExp(exp)
        // Recursively rewrite procedure body
        ? makeProcExp(exp.args, map(rewriteAllDictCExp, exp.body))
    : isLetExp(exp)
        // Rewrite let bindings and body
        ? makeLetExp(
            exp.bindings.map(b => ({
                ...b,
                val: rewriteAllDictCExp(b.val)
            })),
            map(rewriteAllDictCExp, exp.body))
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
    entries
        .map(({ key, val }) => makeCompoundSExp(key, quoteCExpToSExp(val)))
        .reduceRight<SExpValue>(
            (pair, acc) => makeCompoundSExp(pair, acc),
            makeEmptySExp()
        );

/*
Purpose: Convert a CExp (compound expression) to its quoted S-expression form.
Signature: quoteCExpToSExp(e)
Type: CExp -> SExpValue
*/
export const quoteCExpToSExp = (e: CExp): SExpValue =>
    isNumExp(e) ? e.val :
    isBoolExp(e) ? e.val :
    isStrExp(e) ? e.val :
    isLitExp(e) ? e.val :
    isPrimOp(e) ? makeSymbolSExp(e.op) :
    isVarRef(e) ? makeSymbolSExp(e.var) :
    
    // Function application: recursively quote function and arguments
    // e.g., (f x y) => (f x y)
    isAppExp(e) ?
        makeCompoundSExpList([
            quoteCExpToSExp(e.rator),
            ...e.rands.map(quoteCExpToSExp)
        ]) :

    // If-expression: represent as (if test then alt)
    isIfExp(e) ?
        makeCompoundSExpList([
            makeSymbolSExp("if"),
            quoteCExpToSExp(e.test),
            quoteCExpToSExp(e.then),
            quoteCExpToSExp(e.alt)
        ]) :

    // Lambda (procedure): represent as (lambda (args) body...)
    isProcExp(e) ?
        makeCompoundSExpList([
            makeSymbolSExp("lambda"),
            // Quote argument list: (x y z) => ('x 'y 'z)
            makeCompoundSExpList(e.args.map((arg: VarDecl) => makeSymbolSExp(arg.var))),
            // Quote body expressions
            ...e.body.map(quoteCExpToSExp)
        ]) :

    // Let expression: represent as (let ((x val) ...) body...)
    isLetExp(e) ?
        makeCompoundSExpList([
            makeSymbolSExp("let"),
            // Quote each binding pair: ((x val) (y val) ...)
            makeCompoundSExpList(
                e.bindings.map(b =>
                    makeCompoundSExpList([
                        makeSymbolSExp(b.var.var),
                        quoteCExpToSExp(b.val)
                    ])
                )
            ),
            // Quote body expressions
            ...e.body.map(quoteCExpToSExp)
        ]) :

    // Dictionary: represent as (dict (key val) (key val) ...)
    isDictExp(e) ?  
        makeCompoundSExpList([
            makeSymbolSExp("dict"),
            // Quote each key-value pair as (k v)
            ...e.entries.map(({ key, val }) =>
                makeCompoundSExpList([
                    key,
                    quoteCExpToSExp(val)
                ])
            )
        ]) :

    // Fallback: if we reached here, we encountered an unsupported expression
    (() => { throw new Error(`Cannot quote non-literal expression`); })();


/*
Purpose: Build a nested compound S-expression list (linked list)
Signature: makeCompoundSExpList(xs)
Type: SExpValue[] -> SExpValue
*/
export const makeCompoundSExpList = (xs: SExpValue[]): SExpValue =>
    // Reduce a JS array [x1, x2, ..., xn] into (x1 . (x2 . ... (xn . ())))
    xs.reduceRight((acc, x) => makeCompoundSExp(x, acc), makeEmptySExp());

/*
Purpose: Convert an entire L32 program into a valid L3 program by transforming dicts
Signature: L32ToL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog: Program): Program => {
    const transformed = Dict2App(prog).exps; // Step 1: rewrite all dict expressions

    // Step 2: parse q23.l3 definitions as the prelude
    const q23Code = readFileSync("src/q23.l3", "utf-8");
    const wrappedCode = `(L3 ${q23Code})`;
    const parsedPrelude = parseL3(wrappedCode);

    // Step 3: check for parse errors
    if (!isOk(parsedPrelude))
        throw new Error("Failed to parse q23.l3");

    // Step 4: merge and return the full program
    return makeProgram([...parsedPrelude.value.exps, ...transformed]);
};
